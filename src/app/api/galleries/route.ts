import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { createGallerySchema } from "@/lib/validators"
import { slugify } from "@/lib/utils"

const query = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  eventId: z.string().uuid().optional(),
})

export const GET = defineRoute({
  method: "GET",
  query,
  requireAuth: true,
  handler: async ({ query, auth }) => {
    const supabase = await createClient()
    let q = supabase
      .from("galleries")
      .select("*, event:events!inner(id, name, slug, host_id)", { count: "exact" })
      .eq("event.host_id", auth.user!.id)
      .order("created_at", { ascending: false })
    if (query.eventId) q = q.eq("event_id", query.eventId)
    const from = (query.page - 1) * query.pageSize
    q = q.range(from, from + query.pageSize - 1)
    const { data, count, error } = await q
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: createGallerySchema,
  requireAuth: true,
  audit: "gallery.created",
  handler: async ({ body, auth }) => {
    const supabase = await createClient()
    const { data: event } = await supabase
      .from("events")
      .select("host_id")
      .eq("id", body.event_id)
      .single()
    if (!event || event.host_id !== auth.user!.id) return fail("FORBIDDEN", "You do not own this event", 403)
    const slug = `${slugify(body.name)}-${Date.now().toString(36).slice(-4)}`
    const { data, error } = await supabase
      .from("galleries")
      .insert({ ...body, slug })
      .select()
      .single()
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
