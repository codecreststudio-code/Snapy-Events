import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const query = z.object({ page: z.coerce.number().min(1).default(1), pageSize: z.coerce.number().min(1).max(100).default(20) })

export const GET = defineRoute({
  method: "GET",
  query,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = await adminDb()
    const { data, count, error } = await sb
      .from("events")
      .select("*, organizations(name, slug, plan)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((query.page - 1) * query.pageSize, query.pageSize - 1)
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
