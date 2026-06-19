import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder } from "@/lib/integrations/razorpay"

const checkoutBodySchema = z.object({
  plan_id: z.enum(["starter", "standard", "premium"]),
  guest_boost: z.number().default(0),
  shots_boost: z.number().default(0),
})

export function calculatePrice(planId: string, guestBoost: number, shotsBoost: number) {
  let price = 0
  if (planId === "starter") price = 99
  else if (planId === "standard") price = 499
  else if (planId === "premium") price = 1499

  // Guest boost
  if (guestBoost === 10) price += 199
  else if (guestBoost === 25) price += 399
  else if (guestBoost === 50) price += 699
  else if (guestBoost === 100) price += 1199

  // Shots boost
  if (shotsBoost === 5) price += 99
  else if (shotsBoost === 10) price += 179
  else if (shotsBoost === 15) price += 249

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

    const price = calculatePrice(body.plan_id, body.guest_boost, body.shots_boost)
    const amountInPaise = price * 100

    const supabase = await createClient()

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
        return fail("PAYMENT_ERROR", `Failed to register billing customer: ${err.message}`, 500)
      }
    }

    // 2. Create Razorpay Order
    try {
      const order = await createRazorpayOrder({
        amount: amountInPaise,
        currency: "INR",
        receipt: `checkout_${auth.organization!.id}_${Date.now()}`,
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
      return fail("PAYMENT_ERROR", `Failed to create payment order: ${err.message}`, 500)
    }
  },
}).POST
