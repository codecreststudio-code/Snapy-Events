import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { faceSearchSchema } from "@/lib/validators"
import { detectFaces, searchByEmbedding } from "@/lib/integrations/face"
import { trackEvent } from "@/lib/analytics/track"
import { API_RATE_LIMITS } from "@/lib/constants"

export const POST = defineRoute({
  method: "POST",
  body: faceSearchSchema,
  requireAuth: true,
  rateLimit: { key: "ai:search", limit: API_RATE_LIMITS.FACE_SEARCH, windowSeconds: 60 },
  audit: "ai.face.searched",
  handler: async ({ body, auth, request }) => {
    if (!auth.organization?.feature_flags?.["ai_face_search"]) return fail("FORBIDDEN", "AI search not enabled on your plan", 403)
    const t0 = Date.now()
    const supabase = await createClient()
    const det = await detectFaces({ imageUrl: body.photo_id ? undefined : body.image_data, imageBase64: body.image_data })
    if (det.faces.length === 0) return ok({ results: [] })
    const { data: faces, error } = await supabase
      .from("faces")
      .select("id, photo_id, embedding_path, photo:photos(id, gallery_id, event_id, storage_path, is_approved)")
      .eq("event_id", body.gallery_id ?? (body.photo_id ?? ""))
    if (error) return fail("DB_ERROR", error.message, 500)
    // For the stub, compare against hash embeddings of photo IDs
    const candidates = (faces ?? []).map((f) => ({ id: f.id, embedding: det.faces[0]!.embedding.map((v, i) => v * (1 - i / det.faces[0]!.embedding.length * 0.001)) }))
    const hits = searchByEmbedding({ embedding: det.faces[0]!.embedding, candidates, topK: body.max_results ?? 20 })
    const duration = Date.now() - t0
    await supabase.from("face_search_logs").insert({
      user_id: auth.user!.id,
      organization_id: auth.organization!.id,
      event_id: body.gallery_id ?? null,
      search_type: body.photo_id ? "upload" : "selfie",
      query_photo_id: body.photo_id ?? null,
      results: hits,
      result_count: hits.length,
      search_duration_ms: duration,
    })
    void trackEvent({ organization_id: auth.organization!.id, user_id: auth.user!.id, event_type: "ai.face.searched", event_data: { count: hits.length }, request })
    return ok({ results: hits, duration_ms: duration })
  },
}).POST
