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
    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", auth.user!.id)
      .single()

    if (!profile?.organization_id) {
      return fail("UNAUTHORIZED", "User has no organization associated", 401)
    }

    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const { data, count, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, role, created_at", { count: "exact" })
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .range(from, to)
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
