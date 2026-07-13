import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

export const POST = defineRoute({
  method: "POST",
  handler: async () => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) return fail("AUTH_ERROR", "Logout failed", 500)
    return ok({ loggedOut: true })
  },
}).POST
