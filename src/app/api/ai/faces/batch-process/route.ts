import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { detectAndStoreFaces } from "@/lib/integrations/face"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"

const body = z.object({ event_id: z.string().uuid(), photo_ids: z.array(z.string().uuid()).min(1).max(500) })

export const POST = defineRoute({
  method: "POST",
  body,
  requireAuth: true,
  audit: "ai.face.batch",
  handler: async ({ body }) => {
    // Was gated on auth.user.settings["ai_face_search"], a field nothing in
    // the codebase ever populates — every batch run was unconditionally
    // FORBIDDEN. Use the same event-scoped plan gate as /detect and /search.
    const gate = await checkEventFeatureAccess(body.event_id, "ai_face_search")
    if (!gate.allowed) {
      return fail("FORBIDDEN", gate.reason || "AI Face Search is disabled for this event", 403)
    }

    const supabase = await createClient()
    const { data: photos } = await supabase.from("photos").select("id, storage_path").in("id", body.photo_ids)

    // batchProcessFaces() used to run detection per photo and only ever
    // return counts — it never wrote a single row to `faces`, so batch runs
    // silently produced nothing to cluster. detectAndStoreFaces persists
    // each detected face AND assigns/creates its face_clusters row.
    let processed = 0
    let facesDetected = 0
    const errors: { photoId: string; error: string }[] = []

    for (const photo of photos ?? []) {
      try {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`
        const result = await detectAndStoreFaces(supabase, {
          eventId: body.event_id,
          photoId: photo.id,
          imageUrl: url,
        })
        processed++
        facesDetected += result.facesDetected
      } catch (e) {
        errors.push({ photoId: photo.id, error: String(e) })
      }
    }

    return ok({ processed, facesDetected, errors })
  },
}).POST
