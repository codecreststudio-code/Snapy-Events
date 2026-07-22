// src/app/api/events/[id]/memories/slideshow/route.ts
//
// "AI Slideshow" — Snapsy Memories feature, reframed as a live in-browser
// player (CSS fade/zoom transitions cycling through the top-scored photos)
// rather than an exported video file. This deliberately sidesteps the
// MediaRecorder-vs-ffmpeg tradeoff entirely: no encoding step, works
// identically on every device since it's just a web page, and reuses the
// `slideshows` table that already existed in 0001_init.sql (photo_ids,
// transition, interval_seconds, show_brand, is_active) instead of adding
// new schema.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { getScoredPhotos } from "@/lib/integrations/memories"
import { isValidTrackId, resolveTrackUrl } from "@/lib/integrations/slideshow-music"
import { logger } from "@/lib/logger"

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  duration_seconds: z.union([z.literal(30), z.literal(60), z.literal(180)]).default(60),
  transition: z.enum(["fade", "zoom"]).default("fade"),
  show_brand: z.boolean().default(true),
  // null/omitted = silent, matching prior behavior. Validated against the
  // fixed catalog rather than accepting arbitrary strings.
  music_track: z.string().nullable().optional(),
})

const SECONDS_PER_PHOTO = 4
const MIN_PHOTOS = 3
const MAX_PHOTOS = 60

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createServiceClient>>, eventId: string, userId: string) {
  const { data: eventRow, error } = await supabase.from("events").select("id, host_id").eq("id", eventId).single()
  if (error || !eventRow) return { ok: false as const, response: fail("NOT_FOUND", "Event not found", 404) }
  if (eventRow.host_id !== userId) {
    return { ok: false as const, response: fail("FORBIDDEN", "You don't have access to this event", 403) }
  }
  return { ok: true as const }
}

export const POST = defineRoute<z.infer<typeof bodySchema>, unknown, { id: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  audit: "memories.slideshow.generate",
  handler: async ({ body, params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const ownership = await verifyOwnership(supabase, eventId, auth.user!.id)
    if (!ownership.ok) return ownership.response

    const photoCount = Math.max(MIN_PHOTOS, Math.min(MAX_PHOTOS, Math.round(body.duration_seconds / SECONDS_PER_PHOTO)))
    const scored = await getScoredPhotos(supabase, eventId, photoCount)

    if (scored.length === 0) {
      return fail("NO_PHOTOS", "No approved photos are available yet to build a slideshow", 409)
    }

    const musicTrack = isValidTrackId(body.music_track) ? body.music_track! : null

    // Only one "auto" slideshow active per event at a time — deactivate any
    // previous auto-generated ones rather than accumulating unused rows.
    await supabase.from("slideshows").update({ is_active: false }).eq("event_id", eventId).eq("name", "Auto Slideshow")

    const { data: inserted, error: insertErr } = await supabase
      .from("slideshows")
      .insert({
        event_id: eventId,
        name: "Auto Slideshow",
        photo_ids: scored.map((p) => p.id),
        transition: body.transition,
        interval_seconds: SECONDS_PER_PHOTO,
        show_brand: body.show_brand,
        music_track: musicTrack,
        is_active: true,
      })
      .select("id, photo_ids, transition, interval_seconds, show_brand, music_track, is_active, created_at")
      .single()

    if (insertErr || !inserted) {
      logger.error("memories/slideshow: failed to persist slideshow", { eventId, error: insertErr?.message })
      return fail("SLIDESHOW_FAILED", "Could not save the slideshow. Please try again.", 500)
    }

    // Resolve photo_ids to storage paths for immediate playback without a
    // second round trip from the client.
    const { data: photoRows } = await supabase
      .from("photos")
      .select("id, storage_path, thumbnail_path, metadata")
      .in("id", inserted.photo_ids as string[])

    const photoMap = new Map((photoRows ?? []).map((p) => [p.id, p]))
    const orderedPhotos = (inserted.photo_ids as string[])
      .map((id) => photoMap.get(id))
      .filter((p): p is { id: string; storage_path: string; thumbnail_path: string | null; metadata: Record<string, unknown> | null } => !!p)
      .map((p) => ({ id: p.id, storage_path: p.storage_path, thumbnail_path: p.thumbnail_path, reactions: (p.metadata as { reactions?: Record<string, number> } | null)?.reactions ?? {} }))

    return ok({
      slideshow: inserted,
      photos: orderedPhotos,
      musicTrackUrl: resolveTrackUrl(inserted.music_track as string | null),
    })
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

    const { data: slideshow, error } = await supabase
      .from("slideshows")
      .select("id, photo_ids, transition, interval_seconds, show_brand, music_track, is_active, created_at")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !slideshow) return ok({ slideshow: null, photos: [], musicTrackUrl: null })

    const { data: photoRows } = await supabase
      .from("photos")
      .select("id, storage_path, thumbnail_path, metadata")
      .in("id", (slideshow.photo_ids as string[]) ?? [])

    const photoMap = new Map((photoRows ?? []).map((p) => [p.id, p]))
    const orderedPhotos = ((slideshow.photo_ids as string[]) ?? [])
      .map((id) => photoMap.get(id))
      .filter((p): p is { id: string; storage_path: string; thumbnail_path: string | null; metadata: Record<string, unknown> | null } => !!p)
      .map((p) => ({ id: p.id, storage_path: p.storage_path, thumbnail_path: p.thumbnail_path, reactions: (p.metadata as { reactions?: Record<string, number> } | null)?.reactions ?? {} }))

    return ok({
      slideshow,
      photos: orderedPhotos,
      musicTrackUrl: resolveTrackUrl(slideshow.music_track as string | null),
    })
  },
}).GET
