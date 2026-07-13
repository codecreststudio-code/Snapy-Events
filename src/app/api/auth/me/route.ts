import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/auth/session"

export const POST = defineRoute({
  method: "POST",
  handler: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session) return fail("AUTH_ERROR", "Session refresh failed", 401)
    return ok({ session: data.session })
  },
}).POST

export const GET = defineRoute({
  method: "GET",
  requireAuth: true,
  handler: async ({ auth }) => {
    return ok({ user: auth.user, role: auth.role, permissions: auth.permissions })
  },
}).GET
