import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { isDangerousExtension } from "@/lib/security/file-validation"
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES } from "@/lib/constants"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"

const bodySchema = z.object({
  gallery_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_type: z.string().min(1),
  file_size: z.number().positive(),
  uploader_name: z.string().optional().nullable(),
  uploader_email: z.string().optional().nullable(),
})

function getMimeCategory(mime: string): "PHOTO" | "VIDEO" | "AUDIO" | null {
  if ((ALLOWED_MIME_TYPES.PHOTO as readonly string[]).includes(mime)) return "PHOTO"
  if ((ALLOWED_MIME_TYPES.VIDEO as readonly string[]).includes(mime)) return "VIDEO"
  if ((ALLOWED_MIME_TYPES.AUDIO as readonly string[]).includes(mime)) return "AUDIO"
  return null
}

export const POST = defineRoute({
  method: "POST",
  body: bodySchema,
  requireAuth: false,
  handler: async ({ body }) => {
    const supabase = await createServiceClient()

    if (isDangerousExtension(body.file_name)) {
      return fail("VALIDATION_ERROR", "File type not allowed", 415)
    }

    const category = getMimeCategory(body.file_type)
    if (!category) {
      return fail("VALIDATION_ERROR", "Unsupported file type", 415)
    }

    const maxAllowedSize = MAX_FILE_SIZES[category]
    if (body.file_size > maxAllowedSize) {
      return fail("VALIDATION_ERROR", `File size exceeds max allowed limit of ${Math.round(maxAllowedSize / (1024 * 1024))}MB`, 413)
    }

    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id, event:events(organization_id, host_id, settings)")
      .eq("id", body.gallery_id)
      .maybeSingle()

    if (!gallery) return fail("NOT_FOUND", "Gallery not found", 404)

    if (category === "VIDEO") {
      const videoGate = await checkEventFeatureAccess(gallery.event_id, "video_uploads")
      if (!videoGate.allowed) {
        return fail("FORBIDDEN", videoGate.reason || "Video uploads are disabled for this event. Upgrade plan to enable videos.", 403)
      }
    }

    if (category === "AUDIO") {
      const audioGate = await checkEventFeatureAccess(gallery.event_id, "voice_notes")
      if (!audioGate.allowed) {
        return fail("FORBIDDEN", audioGate.reason || "Voice notes & audio are disabled for this event. Upgrade plan to enable audio.", 403)
      }
    }

    const event = gallery.event as any
    const eventObj = Array.isArray(event) ? event[0] : event
    const hostId = eventObj?.host_id
    let orgId = eventObj?.organization_id

    const effectiveOrgId = orgId || hostId || "anon"
    const fileId = crypto.randomUUID()
    const ext = body.file_name.split(".").pop() || "bin"
    const storagePath = `${effectiveOrgId}/${gallery.event_id}/${body.gallery_id}/${fileId}.${ext}`

    const { data: signedData, error: signedErr } = await supabase.storage
      .from("photos")
      .createSignedUploadUrl(storagePath)

    if (signedErr || !signedData) {
      return fail("STORAGE_ERROR", signedErr?.message || "Failed to create upload URL", 500)
    }

    return ok({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: storagePath,
      event_id: gallery.event_id,
    })
  },
}).POST
