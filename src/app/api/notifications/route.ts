import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

// page/pageSize pagination matches this codebase's established list-route
// convention (see e.g. src/app/api/galleries/[id]/photos/route.ts,
// src/app/api/users/route.ts) rather than cursor-based pagination.
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  unread: z.coerce.boolean().optional(),
  type: z.string().trim().optional(),
  q: z.string().trim().optional(),
})

export const GET = defineRoute<unknown, z.infer<typeof querySchema>>({
  method: "GET",
  query: querySchema,
  requireAuth: true,
  handler: async ({ query, auth }) => {
    const supabase = await createClient()
    const userId = auth.user!.id

    let q = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (query.unread) q = q.is("read_at", null)
    if (query.type) q = q.eq("type", query.type)
    if (query.q) {
      // Strip characters that have special meaning in PostgREST's .or()
      // filter syntax (comma separates conditions, parens group them) so a
      // search term containing them can't break out of the intended filter.
      const safeTerm = query.q.replace(/[,()]/g, "")
      if (safeTerm) q = q.or(`title.ilike.%${safeTerm}%,body.ilike.%${safeTerm}%`)
    }

    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1
    const { data, count, error } = await q.range(from, to)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
