import { defineRoute, ok } from "@/lib/api/handler"
import { getLiveBoostAddons } from "@/lib/payments/addons"

export const GET = defineRoute({
  method: "GET",
  requireAuth: false, // public route to query dynamic add-on packages
  handler: async () => {
    const { guestBoosts, shotBoosts } = await getLiveBoostAddons()

    return ok({
      guest_boosts: [{ label: "No extra", value: 0, price: 0 }, ...guestBoosts],
      shot_boosts: [{ label: "No extra", value: 0, price: 0 }, ...shotBoosts],
    })
  },
}).GET
