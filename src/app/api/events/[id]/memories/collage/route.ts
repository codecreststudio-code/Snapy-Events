// src/app/api/events/[id]/memories/collage/route.ts
//
// "Auto Collage" — Snapsy Memories feature. POST generates a new collage,
// GET lists previously-generated ones for the Memories tab. Synchronous,
// same pattern as recap/generate/route.ts (no queue infra in this
// codebase) — but composition here is milliseconds-to-low-seconds (a
// handful of sharp resizes), nowhere near ffmpeg's cost, so no special
// maxDuration override is needed in vercel.json.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { getScoredPhotos } from "@/lib/integrations/memories"
import {
  AUTO_LAYOUT_MAX_PHOTOS,
  composeCollage,
  downloadPhotoBuffer,
  resolveLayoutSpec,
  uploadCollage,
  type CollageLayout,
} from "@/lib/integrations/collage"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"
import { logger } from "@/lib/logger"
import { API_RATE_LIMITS } from "@/lib/constants"

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  // "auto" is the Custom Layout Planner toggle's dynamic grid — gated below
  // to events that actually enabled ai_features.custom_layouts (Premium-tier).
  layout: z.enum(["grid-2", "grid-4", "grid-9", "polaroid", "auto"]),
  photo_ids: z.array(z.string().uuid()).optional(),
})

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createServiceClient>>, eventId: string, userId: string) {
  const { data: eventRow, error } = await supabase.from("events").select("id, host_id").eq("id", eventId).single()
  if (error || !eventRow) return { ok: false as const, response: fail("NOT_FOUND", "Event not found", 404) }
  if (eventRow.host_id !== userId) {
    return { ok: false as const, response: fail("FORBIDDEN", "You don't have access to this event", 403) }
  }
  return { ok: true as const, hostId: eventRow.host_id as string }
}

export const POST = defineRoute<{ layout: CollageLayout; photo_ids?: string[] }, unknown, { id: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  // Sharp image composition + storage upload — comparable resource cost to
  // MOVIE_UPLOAD/RECAP_GENERATE, which are both rate-limited for that exact
  // reason; this route had no limit at all.
  rateLimit: { key: "memories:collage", limit: API_RATE_LIMITS.MEMORIES_GENERATE, windowSeconds: 300 },
  audit: "memories.collage.generate",
  handler: async ({ body, params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const ownership = await verifyOwnership(supabase, eventId, auth.user!.id)
    if (!ownership.ok) return ownership.response

    if (body.layout === "auto") {
      const gate = await checkEventFeatureAccess(eventId, "ai_custom_layouts")
      if (!gate.allowed) {
        return fail("FORBIDDEN", gate.reason || "Custom Layout Planner is not enabled for this event", 403)
      }
    }

    // For fixed presets this is just that preset's tile count; for "auto" it's
    // the max photos worth clustering into a dynamic grid (see collage.ts) —
    // resolveLayoutSpec recomputes the real grid dimensions once we know how
    // many photos actually came back below.
    const targetCount = body.layout === "auto" ? AUTO_LAYOUT_MAX_PHOTOS : resolveLayoutSpec(body.layout, 0).count

    let photoRows: { id: string; storage_path: string }[]
    if (body.photo_ids && body.photo_ids.length > 0) {
      const { data, error } = await supabase
        .from("photos")
        .select("id, storage_path")
        .eq("event_id", eventId)
        .ilike("mime_type", "image/%")
        .in("id", body.photo_ids.slice(0, targetCount))
      if (error) {
        logger.error("memories/collage: selected-photos query failed", { eventId, error: error.message })
        return fail("COLLAGE_FAILED", "Could not load the selected photos", 500)
      }
      photoRows = data ?? []
    } else {
      const scored = await getScoredPhotos(supabase, eventId, targetCount)
      photoRows = scored.map((r) => ({ id: r.id, storage_path: r.storage_path }))
    }

    if (photoRows.length === 0) {
      return fail("NO_PHOTOS", "No approved photos are available yet to build a collage", 409)
    }

    const buffers = await Promise.all(photoRows.map((p) => downloadPhotoBuffer(supabase, p.storage_path)))
    const photos = photoRows.map((p, i) => (buffers[i] ? { id: p.id, buffer: buffers[i]! } : null)).filter((p): p is { id: string; buffer: Buffer } => p !== null)

    if (photos.length === 0) {
      return fail("COLLAGE_FAILED", "The selected photos could not be downloaded from storage", 500)
    }

    let composed
    try {
      composed = await composeCollage(body.layout, photos)
    } catch (err) {
      logger.error("memories/collage: composition failed", { eventId, error: String(err) })
      return fail("COLLAGE_FAILED", "Could not compose the collage. Please try again.", 500)
    }

    let uploaded
    try {
      uploaded = await uploadCollage(ownership.hostId, eventId, body.layout, composed.buffer)
    } catch (err) {
      logger.error("memories/collage: upload failed", { eventId, error: String(err) })
      return fail("COLLAGE_FAILED", "Could not save the collage. Please try again.", 500)
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("event_collages")
      .insert({
        event_id: eventId,
        layout: body.layout,
        photo_ids: photos.map((p) => p.id),
        storage_path: uploaded.storagePath,
        image_url: uploaded.imageUrl,
        width: composed.width,
        height: composed.height,
      })
      .select("id, layout, image_url, width, height, metadata, created_at")
      .single()

    if (insertErr || !inserted) {
      logger.error("memories/collage: failed to persist collage row", { eventId, error: insertErr?.message })
      return fail("COLLAGE_FAILED", "Collage was generated but could not be saved. Please try again.", 500)
    }

    return ok({ collage: inserted })
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
      .from("event_collages")
      .select("id, layout, image_url, width, height, metadata, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      logger.error("memories/collage: list query failed", { eventId, error: error.message })
      return ok({ collages: [] })
    }

    return ok({ collages: data ?? [] })
  },
}).GET
