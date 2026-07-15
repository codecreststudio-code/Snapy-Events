import { defineRoute, ok } from "@/lib/api/handler"
import { getLiveAddonCatalog } from "@/lib/payments/addons"

export const GET = defineRoute({
  method: "GET",
  requireAuth: false, // public route to query dynamic add-on packages
  handler: async () => {
    const catalog = await getLiveAddonCatalog()

    return ok({
      guest_boosts: [{ label: "No extra", value: 0, price: 0 }, ...catalog.guestBoosts],
      shot_boosts: [{ label: "No extra", value: 0, price: 0 }, ...catalog.shotBoosts],
      photo_limit_boosts: catalog.photoLimitBoosts,
      video_addon_price: catalog.videoAddonPrice,
      voice_addon_price: catalog.voiceAddonPrice,
    })
  },
}).GET
