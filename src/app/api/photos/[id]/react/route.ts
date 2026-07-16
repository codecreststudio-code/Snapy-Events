import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { uploadFile } from "@/lib/integrations/storage"
import { isDangerousExtension, isSvgContent, validateFile } from "@/lib/security/file-validation"
import { MAX_FILE_SIZES, API_RATE_LIMITS } from "@/lib/constants"

// Public guest-facing engagement endpoint — emoji reactions, text comments,
// and voice-note replies on a single photo/video/audio item. This route
// previously did a plain read-merge-write (fetch metadata, mutate in JS,
// write the whole object back), which races under concurrent guests: two
// people reacting to the same photo within the same request window can
// silently clobber each other's write. It also had no rate limit (an
// unauthenticated, spammable surface) and no way to attach a voice-note
// reply. Rewritten to use the atomic RPCs in
// migrations/0024_photo_reactions.sql and to accept a multipart audio
// upload for voice replies.
const paramsSchema = z.object({ id: z.string().uuid() })
const KNOWN_EMOJI = new Set(["heart", "fire", "party", "clap", "adore"])
const MAX_COMMENT_LENGTH = 500
const MAX_AUTHOR_NAME_LENGTH = 60

async function loadPlayablePhoto(photoId: string) {
  const supabase = await createServiceClient()
  const { data: photo, error } = await supabase
    .from("photos")
    .select("id, event_id, gallery_id, is_approved")
    .eq("id", photoId)
    .single()
  if (error || !photo) return null
  if (photo.is_approved === false) return null

  const { data: gallery } = await supabase
    .from("galleries")
    .select("is_public")
    .eq("id", photo.gallery_id)
    .maybeSingle()
  if (gallery && gallery.is_public === false) return null

  return photo
}

function cleanAuthorName(raw: unknown): string {
  const trimmed = typeof raw === "string" ? raw.trim().slice(0, MAX_AUTHOR_NAME_LENGTH) : ""
  return trimmed || "Guest"
}

export const POST = defineRoute<unknown, unknown, { id: string }>({
  method: "POST",
  requireAuth: false,
  rateLimit: { key: "photos:react", limit: API_RATE_LIMITS.PHOTO_REACT, windowSeconds: 60 },
  handler: async ({ params, request }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid photo ID", 422)
    const photoId = parsedParams.data.id

    const photo = await loadPlayablePhoto(photoId)
    if (!photo) return fail("NOT_FOUND", "Photo not found", 404)

    const supabase = await createServiceClient()
    const contentType = request.headers.get("content-type") || ""

    // Voice-note reply: multipart upload with an audio file field.
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData()
      const file = fd.get("audio") as File | null
      const authorName = cleanAuthorName(fd.get("author_name"))
      if (!file || file.size === 0) return fail("VALIDATION_ERROR", "Missing audio file", 422)
      if (file.size > MAX_FILE_SIZES.AUDIO) return fail("VALIDATION_ERROR", "Voice note too large", 413)
      if (isDangerousExtension(file.name)) return fail("VALIDATION_ERROR", "File type not allowed", 415)

      const buf = Buffer.from(await file.arrayBuffer())
      if (isSvgContent(new Uint8Array(buf))) return fail("VALIDATION_ERROR", "Invalid file", 415)

      const mimeType = file.type || "audio/webm"
      const validation = validateFile(new Uint8Array(buf), file.name, mimeType, file.size)
      if (!validation.valid) return fail("VALIDATION_ERROR", validation.error!, 415)

      const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm"
      const path = `${photo.event_id}/comments/${photoId}/${crypto.randomUUID()}.${ext}`
      const { publicUrl } = await uploadFile({
        bucket: "PHOTOS",
        path,
        file: new Blob([new Uint8Array(buf)], { type: mimeType }),
        contentType: mimeType,
        cacheControl: "31536000",
      })

      const comment = {
        id: crypto.randomUUID(),
        type: "voice",
        author_name: authorName,
        voice_url: publicUrl,
        created_at: new Date().toISOString(),
      }
      const { data: comments, error } = await supabase.rpc("add_photo_comment", {
        p_photo_id: photoId,
        p_comment: comment,
      })
      if (error) return fail("DB_ERROR", `Failed to save voice reply: ${error.message}`, 500)
      return ok({ comments })
    }

    // JSON body: either an emoji reaction or a text comment.
    const body = await request.json().catch(() => ({}))

    if (typeof body.emoji === "string") {
      if (!KNOWN_EMOJI.has(body.emoji)) return fail("VALIDATION_ERROR", "Unknown reaction", 422)
      const { data: reactions, error } = await supabase.rpc("increment_photo_reaction", {
        p_photo_id: photoId,
        p_emoji: body.emoji,
      })
      if (error) return fail("DB_ERROR", `Failed to save reaction: ${error.message}`, 500)
      return ok({ reactions })
    }

    if (typeof body.comment === "string") {
      const text = body.comment.trim().slice(0, MAX_COMMENT_LENGTH)
      if (!text) return fail("VALIDATION_ERROR", "Comment cannot be empty", 422)
      const comment = {
        id: crypto.randomUUID(),
        type: "text",
        author_name: cleanAuthorName(body.author_name),
        comment: text,
        created_at: new Date().toISOString(),
      }
      const { data: comments, error } = await supabase.rpc("add_photo_comment", {
        p_photo_id: photoId,
        p_comment: comment,
      })
      if (error) return fail("DB_ERROR", `Failed to save comment: ${error.message}`, 500)
      return ok({ comments })
    }

    return fail("VALIDATION_ERROR", "Expected an emoji, comment, or audio file", 422)
  },
}).POST
