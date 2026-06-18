import { defineRoute, ok } from "@/lib/api/handler"
import { getAuthContext } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export const GET = defineRoute({
  method: "GET",
  handler: async () => {
    const ctx = await getAuthContext()
    if (!ctx.isAdmin) return ok({ authenticated: false })
    return ok({ authenticated: true, user: ctx.user })
  },
}).GET
