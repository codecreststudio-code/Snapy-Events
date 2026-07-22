// src/app/api/events/[id]/memories/movie/route.ts
//
// "Movie" — Snapsy Memories feature. Unlike the old removed Recap Video
// (ffmpeg, server-side, never reliable on Vercel serverless — see
// src/lib/integrations/recap-video.ts's removal note) this route does zero
// video encoding. The host's browser renders and records the entire 9:16
// video client-side (src/lib/movie/movie-renderer.ts, canvas + MediaRecorder).
//
// POST here does NOT receive the video bytes — Vercel Serverless Functions
// cap request bodies at 4.5MB, and even a short rendered movie is well past
// that (an earlier version of this route tried a multipart upload straight
// through this handler and every real movie 413'd). The browser instead gets
// a signed Storage URL from the sibling /url route, PUTs the file directly to
// Supabase Storage, and only then calls this route with small JSON metadata
// (the storage path plus duration/music/dimensions) to register the DB row —
// same "signed URL, then confirm" shape already proven by
// /api/photos/upload/url + /api/photos/upload for guest photo/video uploads.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { isValidTrackId } from "@/lib/integrations/slideshow-music"
import { API_RATE_LIMITS } from "@/lib/constants"
import { logger } from "@/lib/logger"

const paramsSchema = z.object({ id: z.string().uuid() })
const ALLOWED_MOVIE_MIME = new Set(["video/webm", "video/mp4"])

const bodySchema = z.object({
  storage_path: z.string().min(1),
  mime_type: z.enum(["video/webm", "video/mp4"]).default("video/webm"),
  duration_seconds: z.number().int().positive().max(600).nullable().optional(),
  music_track: z.string().nullable().optional(),
  width: z.number().int().positive().max(4096).default(1080),
  height: z.number().int().positive().max(4096).default(1920),
})

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createServiceClient>>, eventId: string, userId: string) {
  const { data: eventRow, error } = await supabase.from("events").select("id, host_id").eq("id", eventId).single()
  if (error || !eventRow) return { ok: false as const, response: fail("NOT_FOUND", "Event not found", 404) }
  if (eventRow.host_id !== userId) {
    return { ok: false as const, response: fail("FORBIDDEN", "You don't have access to this event", 403) }
  }
  return { ok: true as const, hostId: eventRow.host_id as string }
}

export const POST = defineRoute<z.infer<typeof bodySchema>, unknown, { id: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  rateLimit: { key: "memories:movie:upload", limit: API_RATE_LIMITS.MOVIE_UPLOAD, windowSeconds: 300 },
  audit: "memories.movie.upload",
  handler: async ({ body, params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const ownership = await verifyOwnership(supabase, eventId, auth.user!.id)
    if (!ownership.ok) return ownership.response

    if (!ALLOWED_MOVIE_MIME.has(body.mime_type)) return fail("VALIDATION_ERROR", "Unsupported video type", 415)

    // The storage path was handed out by /memories/movie/url for this exact
    // host+event (createSignedUploadUrl scoped it under
    // `${hostId}/${eventId}/movies/...`) — re-check the prefix here so this
    // route can't be used to register an arbitrary/spoofed storage path.
    const expectedPrefix = `${ownership.hostId}/${eventId}/movies/`
    if (!body.storage_path.startsWith(expectedPrefix)) {
      return fail("VALIDATION_ERROR", "Invalid storage path", 422)
    }

    const musicTrack = isValidTrackId(body.music_track) ? body.music_track! : null

    const { data: pub } = supabase.storage.from("photos").getPublicUrl(body.storage_path)

    const { data: inserted, error: insertErr } = await supabase
      .from("event_movies")
      .insert({
        event_id: eventId,
        storage_path: body.storage_path,
        video_url: pub.publicUrl,
        mime_type: body.mime_type,
        duration_seconds: body.duration_seconds ?? null,
        music_track: musicTrack,
        width: body.width,
        height: body.height,
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
