import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder } from "@/lib/integrations/razorpay"
import { getLiveAddonCatalog } from "@/lib/payments/addons"

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

    // 1. Fetch Addon Prices — live from the Admin > Add-ons catalog (same
    // source used by the Billing page and the event-wizard checkout).
    let price = 0
    const { guestBoosts, shotBoosts } = await getLiveAddonCatalog()

    // Calculate specific addon price
    if (body.boost_type === "guest") {
      const item = guestBoosts.find((b) => b.value === body.boost_value)
      if (!item) return fail("INVALID_ADDON", "Invalid guest boost selected", 400)
      price = item.price
    } else {
      const item = shotBoosts.find((b) => b.value === body.boost_value)
      if (!item) return fail("INVALID_ADDON", "Invalid shots boost selected", 400)
      price = item.price
    }

    if (price <= 0) return fail("INVALID_PRICE", "Invalid addon price calculated", 400)
    const amountInPaise = price * 100

    // 2. Fetch or create Customer ID
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("razorpay_customer_id, user:users(full_name)")
      .eq("user_id", auth.user!.id)
      .in("status", ["active", "past_due"])
      .limit(1)
      .maybeSingle()

    const hostUser = sub?.user as any
    let customerId = sub?.razorpay_customer_id ?? null
    if (!customerId) {
      try {
        const c = await createRazorpayCustomer({
          name: hostUser?.full_name ?? auth.user!.email,
          email: auth.user!.email,
        })
        customerId = c.id
        await supabase
          .from("subscriptions")
          .update({ razorpay_customer_id: customerId })
          .eq("user_id", auth.user!.id)
      } catch (err: any) {
        return fail("PAYMENT_ERROR", `Failed to register billing customer: ${err.message}`, 500)
      }
    }

    // 3. Create Razorpay Order
    try {
      const order = await createRazorpayOrder({
        amount: amountInPaise,
        currency: "INR",
        receipt: `addon_${Date.now().toString(36)}_${auth.user!.id.slice(0, 8)}`,
        notes: {
          user_id: auth.user!.id,
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
