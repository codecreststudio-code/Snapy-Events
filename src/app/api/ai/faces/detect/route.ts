import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { detectAndStoreFaces } from "@/lib/integrations/face"

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

    // `requireAuth: true` only checks the caller is SOME logged-in user, not
    // that they own this event — without this check, any authenticated
    // account could trigger (and waste) face-detection compute against any
    // other host's event by just supplying its event_id/photo_id.
    const { data: event } = await supabase.from("events").select("host_id").eq("id", body.event_id).single()
    if (!event) return fail("NOT_FOUND", "Event not found", 404)
    if (event.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You do not have access to this event", 403)
    }

    const { data: photo } = await supabase.from("photos").select("storage_path, event_id").eq("id", body.photo_id).single()
    if (!photo) return fail("NOT_FOUND", "Photo not found", 404)
    // Cross-event confusion guard: the photo_id must actually belong to the
    // event_id the caller passed (otherwise a host who owns event A could
    // pass a photo_id from event B and run detection/storage against data
    // that isn't theirs).
    if (photo.event_id !== body.event_id) {
      return fail("VALIDATION_ERROR", "Photo does not belong to this event", 422)
    }
    // The `photos` bucket is public (see 0015_ensure_photos_bucket_public.sql)
    // — every other consumer of storage_path resolves it via /object/public/,
    // not /object/sign/ (which requires a token minted by createSignedUrl()
    // and 400s on a bare GET). The old /object/sign/ URL here made every
    // detection call silently fetch a 400 response, so faces.length was
    // always 0 no matter how this route was triggered.
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`
    const { facesDetected } = await detectAndStoreFaces(supabase, {
      eventId: body.event_id,
      photoId: body.photo_id,
      imageUrl: url,
    })
    return ok({ faces_detected: facesDetected })
  },
}).POST
