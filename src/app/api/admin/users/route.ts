import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { publicEnv } from "@/lib/env"

const query = z.object({ page: z.coerce.number().min(1).default(1), pageSize: z.coerce.number().min(1).max(100).default(20) })

function admin() {
  if (!publicEnv.SUPABASE_URL) throw new Error("supabase url not set")
  return createAdmin(publicEnv.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export const GET = defineRoute({
  method: "GET",
  query,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = admin()
    const { data, count, error } = await sb
      .from("users")
      .select("id, email, full_name, role, organization_id, is_active, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((query.page - 1) * query.pageSize, query.pageSize - 1)
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
