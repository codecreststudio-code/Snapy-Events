import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const params = z.object({ id: z.string().uuid() })
const query = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  approved: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
})

export const GET = defineRoute<unknown, z.infer<typeof query>, { id: string }>({
  method: "GET",
  query,
  requireAuth: true,
  handler: async ({ params, query, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id")
      .eq("id", id)
      .single()
    if (!gallery) return fail("NOT_FOUND", "Gallery not found", 404)
    const { data: event } = await supabase
      .from("events")
      .select("host_id")
      .eq("id", gallery.event_id)
      .single()
    if (event?.host_id && event.host_id !== auth.user!.id) return fail("FORBIDDEN", "Access denied", 403)
    let q = supabase.from("photos").select("*", { count: "exact" }).eq("gallery_id", id).order("created_at", { ascending: false })
    if (query.approved !== undefined) q = q.eq("is_approved", query.approved)
    if (query.featured !== undefined) q = q.eq("is_featured", query.featured)
    const from = (query.page - 1) * query.pageSize
    q = q.range(from, from + query.pageSize - 1)
    const { data, count, error } = await q
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
