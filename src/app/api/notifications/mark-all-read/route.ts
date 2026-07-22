import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

export const POST = defineRoute({
  method: "POST",
  requireAuth: true,
  handler: async ({ auth }) => {
    const supabase = await createClient()

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.user!.id)
      .is("read_at", null)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).POST
