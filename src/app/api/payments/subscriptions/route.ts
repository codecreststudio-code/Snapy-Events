import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { subscribeSchema } from "@/lib/validators"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder, cancelRazorpaySubscription } from "@/lib/integrations/razorpay"
import { logger } from "@/lib/logger"
import { calculatePrice } from "../checkout/route"

export const GET = defineRoute({
  method: "GET",
  requireAuth: true,
  audit: "billing.subscription.viewed",
  handler: async ({ auth }) => {
    const supabase = await createClient()
    
    // Get active or recent subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(`
        id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        razorpay_subscription_id,
        plan:plans(id, name, price_inr, price_usd, features, limits)
      `)
      .eq("user_id", auth.user!.id)
      .in("status", ["active", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    
    if (!subscription) {
      return ok({
        subscription: null,
        plan: "free",
        status: "free",
      })
    }
    
    return ok({
      subscription,
      plan: subscription.plan_id,
      status: subscription.status,
    })
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: subscribeSchema,
  requireAuth: true,
  audit: "billing.subscribe.started",
  handler: async ({ body, auth }) => {
    if (body.plan_id === "free") return ok({ plan: "free" })
    if (!isRazorpayConfigured()) return fail("BILLING_UNAVAILABLE", "Razorpay not configured", 503)
    const supabase = await createClient()
    // Only razorpay_customer_id is actually used below — this used to also
    // select+join user:users(full_name) into an unused `hostUser as any`
    // (dead code, and an unnecessary join+cast).
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("razorpay_customer_id")
      .eq("user_id", auth.user!.id)
      .in("status", ["active", "past_due"])
      .limit(1)
      .maybeSingle()

    let customerId = existingSub?.razorpay_customer_id ?? null
    if (!customerId) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", auth.user!.id)
        .single()
      
      const c = await createRazorpayCustomer({ name: userProfile?.full_name ?? auth.user!.email, email: auth.user!.email })
      customerId = c.id
      await supabase
        .from("subscriptions")
        .update({ razorpay_customer_id: customerId })
        .eq("user_id", auth.user!.id)
    }
    const price = await calculatePrice(supabase, body.plan_id, 0, 0, body.coupon_code)
    const amount = price * 100
    const currency = "INR"
    const order = await createRazorpayOrder({
      amount,
      currency,
      receipt: `sub_${Date.now().toString(36)}_${auth.user!.id.slice(0, 8)}`,
      notes: { user_id: auth.user!.id, plan_id: body.plan_id },
    })
    return created({ customer_id: customerId, order_id: order.id, amount, currency, plan: body.plan_id })
  },
}).POST

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: true,
  audit: "billing.unsubscribe.started",
  handler: async ({ auth }) => {
    const supabase = await createClient()
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("id, razorpay_subscription_id")
      .eq("user_id", auth.user!.id)
      .eq("status", "active")
      .single()

    if (error || !sub) return fail("NO_ACTIVE_SUBSCRIPTION", "No active subscription found to cancel", 400)

    if (sub.razorpay_subscription_id) {
      try {
        await cancelRazorpaySubscription(sub.razorpay_subscription_id, true)
      } catch (err: any) {
        logger.error("Failed to cancel in Razorpay", { error: err.message })
      }
    }

    // Update locally
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", sub.id)



    return ok({ success: true })
  },
}).DELETE

