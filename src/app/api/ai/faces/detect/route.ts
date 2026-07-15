import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { detectFaces } from "@/lib/integrations/face"

import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"

const body = z.object({ photo_id: z.string().uuid(), event_id: z.string().uuid() })

export const POST = defineRoute({
  method: "POST",
  body,
  requireAuth: true,
  audit: "ai.face.detect",
  handler: async ({ body, auth }) => {
    const gate = await checkEventFeatureAccess(body.event_id, "ai_face_search")
    if (!gate.allowed) {
      return fail("FORBIDDEN", gate.reason || "AI Face Search is disabled for this event", 403)
    }
    const supabase = await createClient()
    const { data: photo } = await supabase.from("photos").select("storage_path").eq("id", body.photo_id).single()
    if (!photo) return fail("NOT_FOUND", "Photo not found", 404)
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/photos/${photo.storage_path}`
    const det = await detectFaces({ imageUrl: url })
    for (const f of det.faces) {
      await supabase.from("faces").insert({
        photo_id: body.photo_id,
        event_id: body.event_id,
        bounding_box: f.boundingBox,
        confidence: f.confidence,
        embedding: f.embedding,
        embedding_path: `${body.photo_id}/${det.faces.indexOf(f)}.bin`,
        embedding_model: det.model,
      })
    }
    await supabase.from("photos").update({ face_count: det.faces.length }).eq("id", body.photo_id)
    return ok({ faces_detected: det.faces.length })
  },
}).POST
