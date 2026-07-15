// src/lib/payments/addons.ts
// Single source of truth for ALL admin-configurable add-on pricing: guest
// boosts, shot boosts, per-guest photo-limit tiers, and the Videos / Voice
// Notes unlocks. All of it is now editable from Admin > Subscriptions >
// Add-ons, classified by an explicit `category` column on the `addons`
// table (see supabase/migrations/0021_addon_categories.sql) rather than
// guessed from the product name — a name-substring guess is what caused an
// earlier bug where every shot-boost add-on (named e.g. "Shots Boost (+10
// Shots/Guest)") got misclassified as a guest boost, because its name also
// contains the word "guest".
//
// Every real charge and every display list should go through this file, so
// a price change in Admin takes effect everywhere at once — the Billing
// page, the event-wizard checkout, the standalone add-on purchase flow, and
// admin revenue reporting.
import { adminDb } from "@/lib/supabase/admin"
import {
  DEFAULT_GUEST_BOOSTS,
  DEFAULT_SHOT_BOOSTS,
  PHOTO_LIMIT_ADDON_PRICES,
  VIDEO_UNLOCK_ADDON_PRICE,
  VOICE_UNLOCK_ADDON_PRICE,
} from "@/lib/constants"

export interface BoostOption {
  label: string
  value: number
  price: number
}

export interface LiveAddonCatalog {
  guestBoosts: BoostOption[]
  shotBoosts: BoostOption[]
  /** Per-guest photo cap tiers above the free floor — value -1 means "Unlimited". */
  photoLimitBoosts: BoostOption[]
  /** Flat one-time unlock prices (INR). 0 would mean "not configured" — falls back to defaults instead. */
  videoAddonPrice: number
  voiceAddonPrice: number
}

const PHOTO_LIMIT_FALLBACK: BoostOption[] = Object.entries(PHOTO_LIMIT_ADDON_PRICES)
  .map(([value, price]) => ({ value: Number(value), price, label: Number(value) === -1 ? "Unlimited" : `${value}/guest` }))
  .filter((b) => b.price > 0)
  .sort((a, b) => a.value - b.value)

const FALLBACK_CATALOG: LiveAddonCatalog = {
  guestBoosts: DEFAULT_GUEST_BOOSTS,
  shotBoosts: DEFAULT_SHOT_BOOSTS,
  photoLimitBoosts: PHOTO_LIMIT_FALLBACK,
  videoAddonPrice: VIDEO_UNLOCK_ADDON_PRICE,
  voiceAddonPrice: VOICE_UNLOCK_ADDON_PRICE,
}

function toBoostOption(row: { value: number | null; price_inr: number }, unit: string): BoostOption {
  const value = row.value ?? 0
  return {
    value,
    price: row.price_inr,
    label: value === -1 ? "Unlimited" : `+${value} ${unit}`,
  }
}

/**
 * Live add-on pricing sourced from the `addons` DB table (category-based,
 * admin-editable). Falls back to hardcoded defaults (kept manually in sync
 * with the current catalog in src/lib/constants) if the table has no rows
 * for a given category yet, or the query fails for any reason.
 */
export async function getLiveAddonCatalog(): Promise<LiveAddonCatalog> {
  try {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("addons")
      .select("category, value, price_inr")
      .eq("is_active", true)

    if (error) throw error
    const rows = data || []

    const guestRows = rows.filter((r) => r.category === "guest_boost" && (r.value ?? 0) > 0)
    const shotRows = rows.filter((r) => r.category === "shot_boost" && (r.value ?? 0) > 0)
    const photoRows = rows.filter((r) => r.category === "photo_limit_boost" && r.price_inr > 0)
    const videoRow = rows.find((r) => r.category === "video_addon")
    const voiceRow = rows.find((r) => r.category === "voice_addon")

    return {
      guestBoosts: guestRows.length > 0
        ? guestRows.map((r) => toBoostOption(r, "guests")).sort((a, b) => a.value - b.value)
        : FALLBACK_CATALOG.guestBoosts,
      shotBoosts: shotRows.length > 0
        ? shotRows.map((r) => toBoostOption(r, "shots/guest")).sort((a, b) => a.value - b.value)
        : FALLBACK_CATALOG.shotBoosts,
      photoLimitBoosts: photoRows.length > 0
        ? photoRows.map((r) => toBoostOption(r, "per guest")).sort((a, b) => a.value - b.value)
        : FALLBACK_CATALOG.photoLimitBoosts,
      videoAddonPrice: videoRow?.price_inr ?? FALLBACK_CATALOG.videoAddonPrice,
      voiceAddonPrice: voiceRow?.price_inr ?? FALLBACK_CATALOG.voiceAddonPrice,
    }
  } catch (err) {
    console.error("[addons] Failed to load live add-on catalog from DB, using hardcoded defaults:", err)
    return FALLBACK_CATALOG
  }
}
