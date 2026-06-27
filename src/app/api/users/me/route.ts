import { defineRoute, ok } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { getAuthContext } from "@/lib/auth/session"

export const GET = defineRoute({
  method: "GET",
  handler: async () => {
    const ctx = await getAuthContext()
    return ok({ user: ctx.user, role: ctx.role, permissions: ctx.permissions, isAdmin: ctx.isAdmin })
  },
}).GET
