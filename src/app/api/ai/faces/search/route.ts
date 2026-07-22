import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { faceSearchSchema } from "@/lib/validators"
import { detectFaces, searchByEmbedding } from "@/lib/integrations/face"
import { trackEvent } from "@/lib/analytics/track"
import { API_RATE_LIMITS } from "@/lib/constants"
import { publicUrl } from "@/lib/integrations/storage"
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

    // Resolve event_id directly if passed, or via gallery_id lookup
    let eventId: string | null = body.event_id ?? null
    let eventHostId: string | null = null

    if (eventId) {
      const { data: ev } = await supabase
        .from("events")
        .select("id, host_id")
        .eq("id", eventId)
        .maybeSingle()
      if (ev) {
        eventHostId = ev.host_id
      } else {
        eventId = null
      }
    }

    if (!eventId && body.gallery_id) {
      const { data: gallery } = await supabase
        .from("galleries")
        .select("event_id, event:events(host_id)")
        .eq("id", body.gallery_id)
        .maybeSingle()
      eventId = gallery?.event_id ?? null
      const eventRel = gallery?.event as any
      eventHostId = (Array.isArray(eventRel) ? eventRel[0] : eventRel)?.host_id ?? null
    }

    if (!eventId) {
      return fail("VALIDATION_ERROR", "A valid event_id or gallery_id is required", 400)
    }

    if (!(await isEventHost(eventHostId)) && !hasGuestSessionFromRequest(request, eventId)) {
      return fail("FORBIDDEN", "Please check in to this event before searching.", 403)
    }

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
      queryEmbedding = body.embedding
    } else if (body.image_data || body.photo_id) {
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

    const faceMap = new Map((faces ?? []).map((f) => [f.id, f]))
    const fullResults = hits.map((hit) => {
      const f = faceMap.get(hit.id)
      const photo = f?.photo as any
      const storagePath = photo?.storage_path
      const url = storagePath ? publicUrl("PHOTOS", storagePath) : null
      return {
        id: hit.id,
        similarity: hit.similarity,
        photo_id: f?.photo_id,
        photo: photo
          ? {
              ...photo,
              url,
              storage_path: url || storagePath,
            }
          : null,
      }
    })

    const duration = Date.now() - t0
    try {
      await supabase.from("face_search_logs").insert({
        user_id: auth.user?.id ?? null,
        event_id: eventId,
        search_type: body.photo_id ? "upload" : "selfie",
        query_photo_id: body.photo_id ?? null,
        results: hits,
        result_count: hits.length,
        search_duration_ms: duration,
      })
    } catch (logErr) {
      console.warn("[face-search] Failed to insert face_search_log:", logErr)
    }

    void trackEvent({ user_id: auth.user?.id ?? undefined, event_type: "ai.face.searched", event_data: { count: hits.length }, request })
    return ok({ results: fullResults, duration_ms: duration })
  },
}).POST
