// src/lib/payments/addons.ts
// Single source of truth for guest/shot boost add-on pricing, read live from
// the `addons` table that Admin > Subscriptions > Add-ons edits.
//
// Before this existed, three different places each had their own copy of
// this logic (or their own hardcoded prices):
//   - GET /api/payments/addons (public, feeds the dashboard Billing page)
//   - POST /api/payments/checkout (event-wizard checkout pricing)
//   - POST /api/payments/addon-checkout (standalone add-on purchase)
// They could drift out of sync with each other and with whatever an admin
// actually configured in the Add-ons tab — which is exactly what happened:
// changing a price in Admin only ever showed up on the Billing page's list,
// never in what a host was actually charged.
//
// Classification is by product name substring match (the `addons` table has
// no dedicated category column) — check "shot" BEFORE "guest", since
// shot-boost names like "Shots Boost (+10 Shots/Guest)" contain both words.
// Checking "guest" first would misclassify every shot boost as a guest
// boost (this was a real bug — see addons/route.ts history).
import { adminDb } from "@/lib/supabase/admin"
import { DEFAULT_GUEST_BOOSTS, DEFAULT_SHOT_BOOSTS } from "@/lib/constants"

export interface BoostOption {
  label: string
  value: number
  price: number
}

export interface LiveBoostAddons {
  guestBoosts: BoostOption[]
  shotBoosts: BoostOption[]
}

/**
 * Live guest/shot boost pricing, sourced from the `addons` DB table.
 * Falls back to DEFAULT_GUEST_BOOSTS / DEFAULT_SHOT_BOOSTS (kept manually in
 * sync with the current catalog in src/lib/constants) if the table has no
 * matching rows yet, or the query fails for any reason. Never includes a
 * "No extra" / zero-value entry — callers that need one for display
 * purposes (e.g. a UI option list) should prepend it themselves.
 */
export async function getLiveBoostAddons(): Promise<LiveBoostAddons> {
  try {
    const sb = await adminDb()
    const { data: dbAddons, error } = await sb
      .from("addons")
      .select("name, price_inr")
      .eq("is_active", true)

    if (error) throw error

    const guestItems: BoostOption[] = []
    const shotItems: BoostOption[] = []

    for (const a of dbAddons || []) {
      const nameLower = (a.name || "").toLowerCase()
      const match = nameLower.match(/\+(\d+)/)
      const value = match ? parseInt(match[1], 10) : 0
      if (value <= 0) continue

      if (nameLower.includes("shot")) {
        shotItems.push({ label: `+${value} shots/guest`, value, price: a.price_inr })
      } else if (nameLower.includes("guest")) {
        guestItems.push({ label: `+${value} guests`, value, price: a.price_inr })
      }
    }

    return {
      guestBoosts: guestItems.length > 0 ? guestItems.sort((a, b) => a.value - b.value) : DEFAULT_GUEST_BOOSTS,
      shotBoosts: shotItems.length > 0 ? shotItems.sort((a, b) => a.value - b.value) : DEFAULT_SHOT_BOOSTS,
    }
  } catch (err) {
    console.error("[addons] Failed to load live boost pricing from DB, using hardcoded defaults:", err)
    return { guestBoosts: DEFAULT_GUEST_BOOSTS, shotBoosts: DEFAULT_SHOT_BOOSTS }
  }
}
