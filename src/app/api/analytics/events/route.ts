import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { API_RATE_LIMITS } from "@/lib/constants"

const query = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  type: z.string().optional(),
  since: z.string().datetime().optional(),
})

export const GET = defineRoute({
  method: "GET",
  query,
  requireAuth: true,
  rateLimit: { key: "analytics:read", limit: API_RATE_LIMITS.API_DEFAULT, windowSeconds: 60 },
  handler: async ({ query, auth }) => {
    const supabase = await createClient()
    let q = supabase
      .from("analytics_events")
      .select("*", { count: "exact" })
      .eq("host_id", auth.user!.id)
      .order("created_at", { ascending: false })
    if (query.type) q = q.eq("event_type", query.type)
    if (query.since) q = q.gte("created_at", query.since)
    const from = (query.page - 1) * query.pageSize
    q = q.range(from, from + query.pageSize - 1)
    const { data, count, error } = await q
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
