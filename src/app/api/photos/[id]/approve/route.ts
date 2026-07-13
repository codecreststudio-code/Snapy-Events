import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const params = z.object({ id: z.string().uuid() })
const body = z.object({ approved: z.boolean().optional(), featured: z.boolean().optional() })

export const POST = defineRoute<z.infer<typeof body>, unknown, { id: string }>({
  method: "POST",
  body,
  requireAuth: true,
  audit: "photo.moderated",
  handler: async ({ params, body, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data: photo } = await supabase
      .from("photos")
      .select("event_id, gallery_id")
      .eq("id", id)
      .single()
    if (!photo) return fail("NOT_FOUND", "Photo not found", 404)
    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id")
      .eq("id", photo.gallery_id)
      .single()
    const eventId = gallery?.event_id || photo.event_id
    const { data: event } = await supabase
      .from("events")
      .select("host_id")
      .eq("id", eventId)
      .single()
    if (!event || event.host_id !== auth.user!.id) return fail("FORBIDDEN", "You do not own this event", 403)
    const { data, error } = await supabase
      .from("photos")
      .update({ is_approved: body.approved, is_featured: body.featured })
      .eq("id", id)
      .select()
      .single()
    if (error) return fail("DB_ERROR", "Failed to update photo", 400)
    return ok(data)
  },
}).POST
