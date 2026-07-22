// src/app/api/events/[id]/memories/movie/route.ts
//
// "Movie" — Snapsy Memories feature. Unlike the old removed Recap Video
// (ffmpeg, server-side, never reliable on Vercel serverless — see
// src/lib/integrations/recap-video.ts's removal note) this route does zero
// video encoding. The host's browser renders and records the entire 9:16
// video client-side (src/lib/movie/movie-renderer.ts, canvas + MediaRecorder)
// and this route just validates + stores the already-finished file, exactly
// the same shape as the collage routes (memories/collage/route.ts) store an
// already-composited image.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { uploadFile } from "@/lib/integrations/storage"
import { isDangerousExtension, isSvgContent, validateFile } from "@/lib/security/file-validation"
import { MAX_FILE_SIZES, API_RATE_LIMITS } from "@/lib/constants"
import { isValidTrackId } from "@/lib/integrations/slideshow-music"
import { logger } from "@/lib/logger"

const paramsSchema = z.object({ id: z.string().uuid() })
const ALLOWED_MOVIE_MIME = new Set(["video/webm", "video/mp4"])

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createServiceClient>>, eventId: string, userId: string) {
  const { data: eventRow, error } = await supabase.from("events").select("id, host_id").eq("id", eventId).single()
  if (error || !eventRow) return { ok: false as const, response: fail("NOT_FOUND", "Event not found", 404) }
  if (eventRow.host_id !== userId) {
    return { ok: false as const, response: fail("FORBIDDEN", "You don't have access to this event", 403) }
  }
  return { ok: true as const, hostId: eventRow.host_id as string }
}

export const POST = defineRoute<unknown, unknown, { id: string }>({
  method: "POST",
  requireAuth: true,
  rateLimit: { key: "memories:movie:upload", limit: API_RATE_LIMITS.MOVIE_UPLOAD, windowSeconds: 300 },
  audit: "memories.movie.upload",
  handler: async ({ params, auth, request }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const ownership = await verifyOwnership(supabase, eventId, auth.user!.id)
    if (!ownership.ok) return ownership.response

    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return fail("VALIDATION_ERROR", "Expected a multipart video upload", 422)
    }

    const fd = await request.formData()
    const file = fd.get("file") as File | null
    const durationSeconds = Number(fd.get("duration_seconds")) || null
    const musicTrackRaw = fd.get("music_track") as string | null
    const musicTrack = isValidTrackId(musicTrackRaw) ? musicTrackRaw : null
    const width = Number(fd.get("width")) || 1080
    const height = Number(fd.get("height")) || 1920

    if (!file || file.size === 0) return fail("VALIDATION_ERROR", "Missing video file", 422)
    if (file.size > MAX_FILE_SIZES.VIDEO) return fail("VALIDATION_ERROR", "Video too large", 413)
    if (isDangerousExtension(file.name)) return fail("VALIDATION_ERROR", "File type not allowed", 415)

    const mimeType = ALLOWED_MOVIE_MIME.has(file.type) ? file.type : "video/webm"
    if (!ALLOWED_MOVIE_MIME.has(mimeType)) return fail("VALIDATION_ERROR", "Unsupported video type", 415)

    const buf = Buffer.from(await file.arrayBuffer())
    if (isSvgContent(new Uint8Array(buf))) return fail("VALIDATION_ERROR", "Invalid file", 415)

    const validation = validateFile(new Uint8Array(buf), file.name || `movie.${mimeType === "video/mp4" ? "mp4" : "webm"}`, mimeType, file.size)
    if (!validation.valid) return fail("VALIDATION_ERROR", validation.error!, 415)

    const ext = mimeType === "video/mp4" ? "mp4" : "webm"
    const storagePath = `${ownership.hostId}/${eventId}/movies/movie-${Date.now()}.${ext}`

    let uploaded
    try {
      uploaded = await uploadFile({
        bucket: "PHOTOS",
        path: storagePath,
        file: new Blob([new Uint8Array(buf)], { type: mimeType }),
        contentType: mimeType,
        cacheControl: "31536000",
      })
    } catch (err) {
      logger.error("memories/movie: upload failed", { eventId, error: String(err) })
      return fail("MOVIE_FAILED", "Could not save the movie. Please try again.", 500)
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("event_movies")
      .insert({
        event_id: eventId,
        storage_path: uploaded.path,
        video_url: uploaded.publicUrl,
        mime_type: mimeType,
        duration_seconds: durationSeconds,
        music_track: musicTrack,
        width,
        height,
      })
      .select("id, video_url, mime_type, duration_seconds, music_track, width, height, metadata, created_at")
      .single()

    if (insertErr || !inserted) {
      logger.error("memories/movie: failed to persist movie row", { eventId, error: insertErr?.message })
      return fail("MOVIE_FAILED", "Movie was uploaded but could not be saved. Please try again.", 500)
    }

    return ok({ movie: inserted })
  },
}).POST

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const ownership = await verifyOwnership(supabase, eventId, auth.user!.id)
    if (!ownership.ok) return ownership.response

    const { data, error } = await supabase
      .from("event_movies")
      .select("id, video_url, mime_type, duration_seconds, music_track, width, height, metadata, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      logger.error("memories/movie: list query failed", { eventId, error: error.message })
      return ok({ movies: [] })
    }

    return ok({ movies: data ?? [] })
  },
}).GET
