import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const DEFAULT_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "For small events and personal use",
    price_inr: 499,
    price_usd: 6,
    billing_interval: "event",
    is_active: true,
    sort_order: 1,
    features: [
      "10 guests limit",
      "10 shots per guest",
      "Custom reveal time",
      "All image filters enabled",
    ],
    limits: { events_limit: 1, storage_limit_gb: 10, photo_limit: 5000, guests_limit: 10, shots_limit: 10 },
  },
  {
    id: "standard",
    name: "Standard",
    description: "For growing photographers",
    price_inr: 1499,
    price_usd: 19,
    billing_interval: "event",
    is_active: true,
    is_popular: true,
    sort_order: 2,
    features: [
      "50 guests limit",
      "15 shots per guest",
      "AI Face Search matching",
      "Download all photos",
      "Priority customer support",
    ],
    limits: { events_limit: 25, storage_limit_gb: 100, photo_limit: 50000, guests_limit: 50, shots_limit: 15 },
  },
  {
    id: "premium",
    name: "Premium",
    description: "For professional photographers and large events",
    price_inr: 3999,
    price_usd: 50,
    billing_interval: "event",
    is_active: true,
    best_value: true,
    sort_order: 3,
    features: [
      "100 guests limit",
      "25 shots per guest",
      "Live Photo Wall stream",
      "Print-ready download gallery",
      "WhatsApp notification alerts",
      "24/7 Priority support",
    ],
    limits: { events_limit: -1, storage_limit_gb: 1000, photo_limit: -1, guests_limit: 100, shots_limit: 25 },
  },
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out Snapsy",
    price_inr: 0,
    price_usd: 0,
    billing_interval: "event",
    is_active: true,
    sort_order: 4,
    features: [
      "5 guests limit",
      "5 shots per guest",
      "Standard photo reveal",
      "Basic web gallery",
    ],
    limits: { events_limit: 1, storage_limit_gb: 1, photo_limit: 100, guests_limit: 5, shots_limit: 5 },
  },
]

export const GET = defineRoute({
  method: "GET",
  requireAuth: false, // public route to fetch plan pricing cards
  handler: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) {
      return fail("DB_ERROR", error.message, 500)
    }

    if (!data || data.length === 0) {
      try {
        const { data: seeded } = await supabase
          .from("plans")
          .insert(DEFAULT_PLANS)
          .select()
        if (seeded) return ok(seeded)
      } catch {
        // ignore seed error and return DEFAULT_PLANS
        return ok(DEFAULT_PLANS)
      }
    }

    return ok(data ?? DEFAULT_PLANS)
  },
}).GET
