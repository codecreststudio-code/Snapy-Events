// src/app/api/ai/faces/index/route.ts
// Client-assisted face vector indexing endpoint (Option A - Zero Cost)
// Receives 128-d face vectors extracted by in-browser face-api.js and saves them to `faces` table.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { hasGuestSessionFromRequest, isEventHost } from "@/lib/security/guest-session"

const indexSchema = z.object({
  event_id: z.string().uuid(),
  faces: z.array(
    z.object({
      photo_id: z.string().uuid(),
      embedding: z.array(z.number()),
      confidence: z.number().optional().default(0.9),
      bounding_box: z.object({
        x: z.number().default(0),
        y: z.number().default(0),
        width: z.number().default(100),
        height: z.number().default(100),
      }).optional().default({ x: 0, y: 0, width: 100, height: 100 }),
    })
  ).min(1),
})

export const POST = defineRoute({
  method: "POST",
  body: indexSchema,
  requireAuth: false,
  handler: async ({ body, request }) => {
    const supabase = await createClient()

    const { data: event } = await supabase
      .from("events")
      .select("id, host_id")
      .eq("id", body.event_id)
      .single()

    if (!event) return fail("NOT_FOUND", "Event not found", 404)

    if (!(await isEventHost(event.host_id)) && !hasGuestSessionFromRequest(request, body.event_id)) {
      return fail("FORBIDDEN", "Check in required", 403)
    }

    const photoIds = Array.from(new Set(body.faces.map((f) => f.photo_id)))

    // IDOR guard: a checked-in guest (or the host) for this event could
    // otherwise pass an arbitrary photo_id belonging to a DIFFERENT event
    // and delete/overwrite its face embeddings. Every photo_id in the
    // payload must actually belong to body.event_id.
    const { data: ownedPhotos } = await supabase
      .from("photos")
      .select("id")
      .eq("event_id", body.event_id)
      .in("id", photoIds)
    const ownedIds = new Set((ownedPhotos ?? []).map((p) => p.id))
    if (ownedIds.size !== photoIds.length) {
      return fail("VALIDATION_ERROR", "One or more photos do not belong to this event", 422)
    }

    await supabase.from("faces").delete().in("photo_id", photoIds)

    const rows = body.faces.map((f) => ({
      event_id: body.event_id,
      photo_id: f.photo_id,
      embedding: f.embedding,
      confidence: f.confidence,
      bounding_box: f.bounding_box,
      embedding_model: "face-api-tiny-client",
    }))

    const { data, error } = await supabase.from("faces").insert(rows).select("id")
    if (error) {
      console.error("[faces/index] Failed to insert face vectors:", error)
      return fail("DB_ERROR", "Failed to save face embeddings", 500)
    }

    return ok({ indexed_count: data?.length ?? 0 })
  },
}).POST
