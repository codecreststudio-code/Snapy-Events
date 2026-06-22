import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder } from "@/lib/integrations/razorpay"
import { adminDb } from "@/lib/supabase/admin"
import { DEFAULT_GUEST_BOOSTS, DEFAULT_SHOT_BOOSTS } from "@/lib/constants"

const checkoutBodySchema = z.object({
  plan_id: z.enum(["starter", "standard", "premium"]),
  guest_boost: z.number().default(0),
  shots_boost: z.number().default(0),
})

export async function calculatePrice(supabase: any, planId: string, guestBoost: number, shotsBoost: number) {
  let price = 0
  const { data: planRecord } = await supabase
    .from("plans")
    .select("price_inr")
    .eq("id", planId)
    .single()

  if (planRecord) {
    price = planRecord.price_inr
  } else {
    // Fallback if not found in db
    if (planId === "starter") price = 499
    else if (planId === "standard") price = 1499
    else if (planId === "premium") price = 3999
  }

  // Fetch addons from platform settings using adminDb (RLS bypass)
  let guestBoosts = DEFAULT_GUEST_BOOSTS
  let shotBoosts = DEFAULT_SHOT_BOOSTS
  try {
    const sb = await adminDb()
    const [guestRes, shotRes] = await Promise.all([
      sb.from("platform_settings").select("value").eq("key", "guest_boosts").maybeSingle(),
      sb.from("platform_settings").select("value").eq("key", "shot_boosts").maybeSingle(),
    ])
    if (guestRes.data?.value) guestBoosts = guestRes.data.value
    if (shotRes.data?.value) shotBoosts = shotRes.data.value
  } catch (err) {
    console.error("Failed to query platform settings for pricing:", err)
  }

  // Calculate pricing based on dynamic boosts
  const guestItem = guestBoosts.find((b: any) => b.value === guestBoost)
  if (guestItem) {
    price += guestItem.price
  }

  const shotItem = shotBoosts.find((b: any) => b.value === shotsBoost)
  if (shotItem) {
    price += shotItem.price
  }

  return price // in INR
}


export const POST = defineRoute({
  method: "POST",
  body: checkoutBodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    if (!isRazorpayConfigured()) {
      return fail("BILLING_UNAVAILABLE", "Razorpay is not configured", 503)
    }

    const supabase = await createClient()

    const price = await calculatePrice(supabase, body.plan_id, body.guest_boost, body.shots_boost)
    const amountInPaise = price * 100

    // 1. Fetch or create Customer ID
    const { data: org } = await supabase
      .from("organizations")
      .select("razorpay_customer_id, name")
      .eq("id", auth.organization!.id)
      .single()

    let customerId = org?.razorpay_customer_id ?? null
    if (!customerId) {
      try {
        const c = await createRazorpayCustomer({
          name: org?.name ?? auth.user!.email,
          email: auth.user!.email,
        })
        customerId = c.id
        await supabase
          .from("organizations")
          .update({ razorpay_customer_id: customerId })
          .eq("id", auth.organization!.id)
      } catch (err: any) {
        const msg = err.error?.description || err.description || err.message || JSON.stringify(err)
        return fail("PAYMENT_ERROR", `Failed to register billing customer: ${msg}`, 500)
      }
    }

    // 2. Create Razorpay Order
    try {
      const order = await createRazorpayOrder({
        amount: amountInPaise,
        currency: "INR",
        receipt: `chk_${Date.now().toString(36)}_${auth.organization!.id.slice(0, 8)}`,
        notes: {
          organization_id: auth.organization!.id,
          plan_id: body.plan_id,
          guest_boost: String(body.guest_boost),
          shots_boost: String(body.shots_boost),
        },
      })

      return ok({
        order_id: order.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
        customer_id: customerId,
        total_price: price,
      })
    } catch (err: any) {
      const msg = err.error?.description || err.description || err.message || JSON.stringify(err)
      return fail("PAYMENT_ERROR", `Failed to create payment order: ${msg}`, 500)
    }
  },
}).POST
