import { createServiceClient } from "@/lib/supabase/server"
import { PLAN_LIMITS } from "@/lib/constants"

export async function syncPlans() {
  try {
    const supabase = await createServiceClient()

    const targetPlans = [
      {
        id: "free",
        name: "Free",
        description: "Perfect for trying out Snapsy",
        price_inr: 0,
        price_usd: 0,
        features: ["5 guests", "5 shots per guest", "Standard reveal", "Basic gallery"],
        limits: PLAN_LIMITS.free,
      },
      {
        id: "starter",
        name: "Starter",
        description: "For small events and personal use",
        price_inr: 99,
        price_usd: 1.5,
        features: ["10 guests", "10 shots per guest", "Custom reveal time", "All filters"],
        limits: PLAN_LIMITS.starter,
      },
      {
        id: "standard",
        name: "Standard",
        description: "For growing photographers",
        price_inr: 499,
        price_usd: 6,
        features: ["50 guests", "15 shots per guest", "AI Face Search", "Download all photos", "Priority support"],
        limits: PLAN_LIMITS.standard,
      },
      {
        id: "premium",
        name: "Premium",
        description: "For professional photographers and large events",
        price_inr: 1499,
        price_usd: 18,
        features: ["100 guests", "25 shots per guest", "Live Photo Wall", "Print-ready gallery", "WhatsApp notifications", "Priority support"],
        limits: PLAN_LIMITS.premium,
      },
    ]

    for (const plan of targetPlans) {
      await supabase.from("plans").upsert(
        {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price_inr: plan.price_inr,
          price_usd: plan.price_usd,
          billing_interval: "monthly",
          features: plan.features,
          limits: plan.limits,
          is_active: true,
        },
        { onConflict: "id" }
      )
    }
  } catch (error) {
    console.error("Failed to sync plans in database:", error)
  }
}
