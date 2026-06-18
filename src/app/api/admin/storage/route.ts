import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { z } from "zod"

const query = z.object({ page: z.coerce.number().min(1).default(1), pageSize: z.coerce.number().min(1).max(100).default(20) })

export const GET = defineRoute({
  method: "GET",
  query,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = await adminDb()
    const { data, count, error } = await sb
      .from("storage_usage")
      .select("*, organizations(name, slug, plan)", { count: "exact" })
      .order("total_bytes", { ascending: false })
      .range((query.page - 1) * query.pageSize, query.pageSize - 1)
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
