import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { faceSearchSchema } from "@/lib/validators"
import { detectFaces, searchByEmbedding } from "@/lib/integrations/face"
import { trackEvent } from "@/lib/analytics/track"
import { API_RATE_LIMITS } from "@/lib/constants"

import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"
import { getFeatureFlags } from "@/lib/platform-settings"
import { hasGuestSessionFromRequest, isEventHost } from "@/lib/security/guest-session"

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
    let eventHostId: string | null = null
    if (body.gallery_id) {
      const { data: gallery } = await supabase
        .from("galleries")
        .select("event_id, event:events(host_id)")
        .eq("id", body.gallery_id)
        .single()
      eventId = gallery?.event_id ?? null
      const eventRel = gallery?.event as any
      eventHostId = (Array.isArray(eventRel) ? eventRel[0] : eventRel)?.host_id ?? null
    }

    // Face search MUST be scoped to a single event. Without this guard an
    // unauthenticated caller that omits gallery_id would dump every tenant's
    // faces + photo storage paths (the query below only filters when eventId is set).
    if (!eventId) {
      return fail("VALIDATION_ERROR", "A valid gallery_id is required", 400)
    }

    // Same check-in gate as uploads/reactions/gallery photos — this endpoint
    // isn't currently called from any page, but is still a live, directly
    // callable API, so it shouldn't be the one guest-facing surface that
    // skips the check-in requirement everything else in this app enforces.
    if (!(await isEventHost(eventHostId)) && !hasGuestSessionFromRequest(request, eventId)) {
      return fail("FORBIDDEN", "Please check in to this event before searching.", 403)
    }

    // Admin > Feature Flags kill switch for AI Face Search platform-wide.
    // Separate from the per-event/per-plan gate below — this is the global
    // toggle an admin would flip during an incident (e.g. the face-detection
    // provider is down or over quota).
    const flags = await getFeatureFlags()
    if (!flags.ai_search_enabled) {
      return fail("FORBIDDEN", "AI Face Search is temporarily disabled by the platform.", 403)
    }

    {
      const gate = await checkEventFeatureAccess(eventId, "ai_face_search")
      if (!gate.allowed) {
        return fail("FORBIDDEN", gate.reason || "AI Face Search is disabled for this event.", 403)
      }
    }

    let queryEmbedding: number[] | null = null

    if (Array.isArray(body.embedding) && body.embedding.length > 0) {
      // Option A: Pre-computed vector passed directly from client-side browser AI (Zero server CPU/RAM cost)
      queryEmbedding = body.embedding
    } else if (body.image_data || body.photo_id) {
      // Fallback: Server-side detection
      const det = await detectFaces({ imageUrl: body.photo_id ? undefined : body.image_data, imageBase64: body.image_data })
      if (det.faces.length > 0 && det.faces[0]?.embedding) {
        queryEmbedding = det.faces[0].embedding
      }
    }

    if (!queryEmbedding) return ok({ results: [] })

    let facesQuery = supabase
      .from("faces")
      .select("id, photo_id, embedding, photo:photos(id, gallery_id, event_id, storage_path, is_approved)")

    if (eventId) {
      facesQuery = facesQuery.eq("event_id", eventId)
    }

    const { data: faces, error } = await facesQuery
    if (error) return fail("DB_ERROR", "Failed to search faces", 500)

    const candidates = (faces ?? [])
      .filter((f) => Array.isArray(f.embedding) && f.embedding.length > 0)
      .map((f) => ({ id: f.id, embedding: f.embedding as number[] }))

    const hits = searchByEmbedding({ embedding: queryEmbedding, candidates, topK: body.max_results ?? 20 })
    const duration = Date.now() - t0
    await supabase.from("face_search_logs").insert({
      user_id: auth.user?.id ?? null,
      event_id: eventId,
      search_type: body.embedding ? "client_selfie" : (body.photo_id ? "upload" : "selfie"),
      query_photo_id: body.photo_id ?? null,
      results: hits,
      result_count: hits.length,
      search_duration_ms: duration,
    })
    void trackEvent({ user_id: auth.user?.id ?? undefined, event_type: "ai.face.searched", event_data: { count: hits.length }, request })
    return ok({ results: hits, duration_ms: duration })
  },
}).POST
