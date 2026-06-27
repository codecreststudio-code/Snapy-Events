import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const query = z.object({ page: z.coerce.number().min(1).default(1), pageSize: z.coerce.number().min(1).max(100).default(20) })

export const GET = defineRoute({
  method: "GET",
  query,
  requireAuth: true,
  handler: async ({ query, auth }) => {
    const supabase = await createClient()
    const { data, count, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, role, created_at", { count: "exact" })
      .eq("user_id", auth.user!.id)
      .order("created_at", { ascending: false })
      .range((query.page - 1) * query.pageSize, query.pageSize - 1)
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
