import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder } from "@/lib/integrations/razorpay"
import { adminDb } from "@/lib/supabase/admin"
import { DEFAULT_GUEST_BOOSTS, DEFAULT_SHOT_BOOSTS } from "@/lib/constants"

const addonCheckoutSchema = z.object({
  boost_type: z.enum(["guest", "shots"]),
  boost_value: z.number().min(1),
})

export const POST = defineRoute({
  method: "POST",
  body: addonCheckoutSchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    if (!isRazorpayConfigured()) {
      return fail("BILLING_UNAVAILABLE", "Razorpay is not configured", 503)
    }

    const supabase = await createClient()

    // 1. Fetch Addon Prices
    let price = 0
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
      console.error("Failed to query platform settings for addon pricing:", err)
    }

    // Calculate specific addon price
    if (body.boost_type === "guest") {
      const item = guestBoosts.find((b: any) => b.value === body.boost_value)
      if (!item) return fail("INVALID_ADDON", "Invalid guest boost selected", 400)
      price = item.price
    } else {
      const item = shotBoosts.find((b: any) => b.value === body.boost_value)
      if (!item) return fail("INVALID_ADDON", "Invalid shots boost selected", 400)
      price = item.price
    }

    if (price <= 0) return fail("INVALID_PRICE", "Invalid addon price calculated", 400)
    const amountInPaise = price * 100

    // 2. Fetch or create Customer ID
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

    // 3. Create Razorpay Order
    try {
      const order = await createRazorpayOrder({
        amount: amountInPaise,
        currency: "INR",
        receipt: `addon_${Date.now().toString(36)}_${auth.organization!.id.slice(0, 8)}`,
        notes: {
          organization_id: auth.organization!.id,
          addon_type: body.boost_type,
          addon_value: String(body.boost_value),
        },
      })

      return ok({
        order_id: order.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
        customer_id: customerId,
        total_price: price,
        boost_type: body.boost_type,
        boost_value: body.boost_value,
      })
    } catch (err: any) {
      return fail("PAYMENT_ERROR", `Failed to create addon payment order: ${err.message}`, 500)
    }
  },
}).POST
