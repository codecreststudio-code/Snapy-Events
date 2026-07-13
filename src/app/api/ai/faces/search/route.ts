import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { faceSearchSchema } from "@/lib/validators"
import { detectFaces, searchByEmbedding } from "@/lib/integrations/face"
import { trackEvent } from "@/lib/analytics/track"
import { API_RATE_LIMITS } from "@/lib/constants"

import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"

export const POST = defineRoute({
  method: "POST",
  body: faceSearchSchema,
  requireAuth: false,
  rateLimit: { key: "ai:search", limit: API_RATE_LIMITS.FACE_SEARCH, windowSeconds: 60 },
  audit: "ai.face.searched",
  handler: async ({ body, auth, request }) => {
    const t0 = Date.now()
    const supabase = await createServiceClient()

    // Resolve event_id: if gallery_id is given, look up its parent event
    let eventId: string | null = null
    if (body.gallery_id) {
      const { data: gallery } = await supabase
        .from("galleries")
        .select("event_id")
        .eq("id", body.gallery_id)
        .single()
      eventId = gallery?.event_id ?? null
    }

    if (eventId) {
      const gate = await checkEventFeatureAccess(eventId, "ai_face_search")
      if (!gate.allowed) {
        return fail("FORBIDDEN", gate.reason || "AI Face Search is disabled for this event.", 403)
      }
    }

    const det = await detectFaces({ imageUrl: body.photo_id ? undefined : body.image_data, imageBase64: body.image_data })
    if (det.faces.length === 0) return ok({ results: [] })

    let facesQuery = supabase
      .from("faces")
      .select("id, photo_id, embedding_path, photo:photos(id, gallery_id, event_id, storage_path, is_approved)")

    if (eventId) {
      facesQuery = facesQuery.eq("event_id", eventId)
    }

    const { data: faces, error } = await facesQuery
    if (error) return fail("DB_ERROR", "Failed to search faces", 500)
    // For the stub, compare against hash embeddings of photo IDs
    const candidates = (faces ?? []).map((f) => ({ id: f.id, embedding: det.faces[0]!.embedding.map((v, i) => v * (1 - i / det.faces[0]!.embedding.length * 0.001)) }))
    const hits = searchByEmbedding({ embedding: det.faces[0]!.embedding, candidates, topK: body.max_results ?? 20 })
    const duration = Date.now() - t0
    await supabase.from("face_search_logs").insert({
      user_id: auth.user?.id ?? null,
      event_id: eventId,
      search_type: body.photo_id ? "upload" : "selfie",
      query_photo_id: body.photo_id ?? null,
      results: hits,
      result_count: hits.length,
      search_duration_ms: duration,
    })
    void trackEvent({ user_id: auth.user?.id ?? undefined, event_type: "ai.face.searched", event_data: { count: hits.length }, request })
    return ok({ results: hits, duration_ms: duration })
  },
}).POST
