import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { updateGallerySchema } from "@/lib/validators"

const params = z.object({ id: z.string().uuid() })

async function getEventHost(eventId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: event } = await supabase.from("events").select("host_id").eq("id", eventId).single()
  return event?.host_id ?? null
}

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("galleries")
      .select("*, event:events!inner(id, name, slug, host_id)")
      .eq("id", id)
      .single()
    if (error || !data) return ApiErrors.notFound("Gallery")
    const gallery = data as any
    if (gallery.event?.host_id && gallery.event.host_id !== auth.user!.id) return fail("FORBIDDEN", "Access denied", 403)
    return ok(data)
  },
}).GET

export const PATCH = defineRoute<z.infer<typeof updateGallerySchema>, unknown, { id: string }>({
  method: "PATCH",
  body: updateGallerySchema,
  requireAuth: true,
  handler: async ({ params, body, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from("galleries")
      .select("event_id")
      .eq("id", id)
      .single()
    if (!existing) return fail("NOT_FOUND", "Gallery not found", 404)
    const hostId = await getEventHost(existing.event_id)
    if (hostId !== auth.user!.id) return fail("FORBIDDEN", "You do not own the event for this gallery", 403)
    const { data, error } = await supabase.from("galleries").update(body).eq("id", id).select().single()
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute<unknown, unknown, { id: string }>({
  method: "DELETE",
  requireAuth: true,
  audit: "gallery.deleted",
  handler: async ({ params, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from("galleries")
      .select("event_id")
      .eq("id", id)
      .single()
    if (!existing) return fail("NOT_FOUND", "Gallery not found", 404)
    const hostId = await getEventHost(existing.event_id)
    if (hostId !== auth.user!.id) return fail("FORBIDDEN", "You do not own the event for this gallery", 403)
    const { error } = await supabase.from("galleries").delete().eq("id", id)
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ deleted: true })
  },
}).DELETE
