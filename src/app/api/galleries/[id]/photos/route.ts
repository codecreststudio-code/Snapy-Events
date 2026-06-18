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
  handler: async ({ params, query }) => {
    const { id } = params
    const supabase = await createClient()
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
