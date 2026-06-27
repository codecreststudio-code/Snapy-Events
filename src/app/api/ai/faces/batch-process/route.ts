import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { batchProcessFaces } from "@/lib/integrations/face"

const body = z.object({ event_id: z.string().uuid(), photo_ids: z.array(z.string().uuid()).min(1).max(500) })

export const POST = defineRoute({
  method: "POST",
  body,
  requireAuth: true,
  audit: "ai.face.batch",
  handler: async ({ body, auth }) => {
    if (!(auth.user as any)?.settings?.["ai_face_search"]) return fail("FORBIDDEN", "AI not enabled", 403)
    const supabase = await createClient()
    const { data: photos } = await supabase.from("photos").select("id, storage_path").in("id", body.photo_ids)
    const urls = (photos ?? []).map((p) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/photos/${p.storage_path}`)
    const result = await batchProcessFaces({ organizationId: auth.user!.id, eventId: body.event_id, photoIds: body.photo_ids, imageUrls: urls })
    return ok(result)
  },
}).POST
