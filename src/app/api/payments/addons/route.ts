import { defineRoute, ok } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { DEFAULT_GUEST_BOOSTS, DEFAULT_SHOT_BOOSTS } from "@/lib/constants"

export const GET = defineRoute({
  method: "GET",
  requireAuth: false, // public route to query dynamic add-on packages
  handler: async () => {
    try {
      const sb = await adminDb()
      
      const [guestRes, shotRes] = await Promise.all([
        sb.from("platform_settings").select("value").eq("key", "guest_boosts").maybeSingle(),
        sb.from("platform_settings").select("value").eq("key", "shot_boosts").maybeSingle(),
      ])

      const guestBoosts = guestRes.data?.value || DEFAULT_GUEST_BOOSTS
      const shotBoosts = shotRes.data?.value || DEFAULT_SHOT_BOOSTS

      return ok({
        guest_boosts: guestBoosts,
        shot_boosts: shotBoosts,
      })
    } catch (e: any) {
      // Graceful fallback to default values on error
      return ok({
        guest_boosts: DEFAULT_GUEST_BOOSTS,
        shot_boosts: DEFAULT_SHOT_BOOSTS,
      })
    }
  },
}).GET
