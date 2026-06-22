import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

export const GET = defineRoute({
  method: "GET",
  requireAuth: false, // public route to fetch plan pricing cards
  handler: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)

    if (error) {
      return fail("DB_ERROR", error.message, 500)
    }

    return ok(data ?? [])
  },
}).GET
