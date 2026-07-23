import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const DEFAULT_PLANS = [
  {
    id: "free",
    name: "Basic",
    description: "Perfect for trying out Snapsy",
    price_inr: 0,
    price_usd: 0,
    billing_interval: "event",
    is_active: true,
    sort_order: 0,
    features: [
      "Up to 5 guests limit",
      "30 shots per guest",
      "Custom reveal countdown",
      "Guestbook & photo reactions",
    ],
    limits: { events_limit: 1, storage_limit_gb: 1, photo_limit: 100, guests_limit: 5, shots_limit: 30 },
  },
  {
    id: "starter",
    name: "Standard",
    description: "For small events and personal use",
    price_inr: 499,
    price_usd: 6,
    billing_interval: "event",
    is_active: true,
    is_popular: true,
    sort_order: 1,
    features: [
      "Up to 20 guests limit",
      "36 shots per guest",
      "AI Face Search matching",
      "Custom reveal countdown",
      "All camera filters enabled",
      "Voice notes & audio greetings",
      "Guestbook & photo reactions",
    ],
    limits: { events_limit: 10, storage_limit_gb: 20, photo_limit: 5000, guests_limit: 20, shots_limit: 36 },
  },
  {
    id: "premium",
    name: "Premium",
    description: "For professional photographers and large events",
    price_inr: 2999,
    price_usd: 36,
    billing_interval: "event",
    is_active: true,
    best_value: true,
    sort_order: 2,
    features: [
      "Up to 50 guests limit",
      "50 shots per guest",
      "AI Face Search matching",
      "Live Photo Wall stream",
      "Custom reveal countdown",
      "All camera filters enabled",
      "Video uploads support",
      "Voice notes & audio greetings",
      "Guestbook & photo reactions",
      "Print-ready download gallery",
      "WhatsApp notification alerts",
      "24/7 Priority support",
    ],
    limits: { events_limit: -1, storage_limit_gb: 100, photo_limit: -1, guests_limit: 50, shots_limit: 50 },
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
