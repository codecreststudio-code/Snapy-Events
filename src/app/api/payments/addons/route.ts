import { defineRoute, ok } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { DEFAULT_GUEST_BOOSTS, DEFAULT_SHOT_BOOSTS } from "@/lib/constants"

export const GET = defineRoute({
  method: "GET",
  requireAuth: false, // public route to query dynamic add-on packages
  handler: async () => {
    try {
      const sb = await adminDb()
      
      // 1. First attempt reading from dynamic addons database table
      const { data: dbAddons } = await sb
        .from("addons")
        .select("*")
        .eq("is_active", true)

      if (dbAddons && dbAddons.length > 0) {
        const guestItems: Array<{ label: string; value: number; price: number }> = [{ label: "No extra", value: 0, price: 0 }]
        const shotItems: Array<{ label: string; value: number; price: number }> = [{ label: "No extra", value: 0, price: 0 }]

        dbAddons.forEach((a) => {
          const nameLower = (a.name || "").toLowerCase()
          // Extract number from name e.g. "+10 Guests" -> 10
          const match = nameLower.match(/\+(\d+)/)
          const value = match ? parseInt(match[1]) : 0

          if (nameLower.includes("guest")) {
            if (value > 0) {
              guestItems.push({
                label: `+${value} guests`,
                value,
                price: a.price_inr,
              })
            }
          } else if (nameLower.includes("shot")) {
            if (value > 0) {
              shotItems.push({
                label: `+${value} shots/guest`,
                value,
                price: a.price_inr,
              })
            }
          }
        })

        if (guestItems.length > 1 || shotItems.length > 1) {
          return ok({
            guest_boosts: guestItems.length > 1 ? guestItems.sort((a, b) => a.value - b.value) : DEFAULT_GUEST_BOOSTS,
            shot_boosts: shotItems.length > 1 ? shotItems.sort((a, b) => a.value - b.value) : DEFAULT_SHOT_BOOSTS,
          })
        }
      }

      // 2. Fallback to platform_settings or DEFAULT arrays
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
