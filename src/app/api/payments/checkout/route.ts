import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder } from "@/lib/integrations/razorpay"
import { adminDb } from "@/lib/supabase/admin"
import { DEFAULT_GUEST_BOOSTS, DEFAULT_SHOT_BOOSTS } from "@/lib/constants"

const checkoutBodySchema = z.object({
  plan_id: z.string().min(1),
  coupon_code: z.string().optional(),
  guest_boost: z.number().default(0),
  shots_boost: z.number().default(0),
})

export async function calculatePrice(supabase: any, planId: string, guestBoost: number, shotsBoost: number, couponCode?: string) {
  let price = 0
  const { data: planRecord } = await supabase
    .from("plans")
    .select("price_inr")
    .eq("id", planId)
    .single()

  if (planRecord) {
    price = planRecord.price_inr
  } else {
    throw new Error("Plan not found")
  }

  // Fetch active addons from the new schema
  try {
    const sb = await adminDb()
    const { data: addons } = await sb.from("addons").select("*").eq("is_active", true)
    
    // Quick legacy mapping if old checkout passes raw boost numbers
    // In a full implementation, the frontend would pass an array of addon_ids
    if (addons && guestBoost > 0) {
      // Find a guest addon that provides this boost (approx logic for legacy support)
    }
  } catch (err) {
    console.error("Failed to query addons:", err)
  }

  // Apply Coupon if exists
  if (couponCode) {
    const sb = await adminDb()
    const { data: coupon } = await sb.from("coupons").select("*").eq("code", couponCode).eq("is_active", true).single()
    if (coupon) {
      if (coupon.discount_type === "percentage") {
        price = price - (price * (coupon.discount_value / 100))
      } else {
        price = price - coupon.discount_value
      }
      if (price < 0) price = 0
    }
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

    let price = 0
    try {
      price = await calculatePrice(supabase, body.plan_id, body.guest_boost, body.shots_boost, body.coupon_code)
    } catch (err: any) {
      return fail("BAD_REQUEST", err.message, 400)
    }
    const amountInPaise = price * 100

    // 1. Fetch or create Customer ID
    const { data: userRecord } = await supabase
      .from("users")
      .select("razorpay_customer_id, full_name")
      .eq("id", auth.user!.id)
      .single()

    let customerId = userRecord?.razorpay_customer_id ?? null
    if (!customerId) {
      try {
        const c = await createRazorpayCustomer({
          name: userRecord?.full_name ?? auth.user!.email,
          email: auth.user!.email,
        })
        customerId = c.id
        await supabase
          .from("users")
          .update({ razorpay_customer_id: customerId })
          .eq("id", auth.user!.id)
      } catch (err: any) {
        // Customer creation is non-critical — Razorpay standard checkout works
        // without a pre-created customer_id. Log and continue to order creation.
        const msg = err.error?.description || err.description || err.message || String(err)
        console.warn(`[razorpay] Customer creation skipped (${msg}). Proceeding with order-only checkout.`)
        customerId = null
      }
    }

    // 2. Create Razorpay Order
    try {
      const order = await createRazorpayOrder({
        amount: amountInPaise,
        currency: "INR",
        receipt: `chk_${Date.now().toString(36)}_${auth.user!.id.slice(0, 8)}`,
        notes: {
          user_id: auth.user!.id,
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
      const rawMsg = err.error?.description || err.description || err.message || JSON.stringify(err)
      let userMsg = rawMsg
      if (typeof rawMsg === "string" && rawMsg.toLowerCase().includes("authentication failed")) {
        userMsg = "Razorpay API credentials invalid. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Vercel project environment settings."
      }
      return fail("PAYMENT_ERROR", `Failed to create payment order: ${userMsg}`, 500)
    }
  },
}).POST
