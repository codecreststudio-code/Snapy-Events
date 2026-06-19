import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { subscribeSchema } from "@/lib/validators"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder, planCurrency, cancelRazorpaySubscription } from "@/lib/integrations/razorpay"
import { logger } from "@/lib/logger"

export const POST = defineRoute({
  method: "POST",
  body: subscribeSchema,
  requireAuth: true,
  audit: "billing.subscribe.started",
  handler: async ({ body, auth }) => {
    if (body.plan_id === "free") return ok({ plan: "free" })
    if (!isRazorpayConfigured()) return fail("BILLING_UNAVAILABLE", "Razorpay not configured", 503)
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from("organizations")
      .select("razorpay_customer_id, name")
      .eq("id", auth.organization!.id)
      .single()
    let customerId = existing?.razorpay_customer_id ?? null
    if (!customerId) {
      const c = await createRazorpayCustomer({ name: existing?.name ?? auth.user!.email, email: auth.user!.email })
      customerId = c.id
      await supabase.from("organizations").update({ razorpay_customer_id: customerId }).eq("id", auth.organization!.id)
    }
    const { amount, currency } = planCurrency(body.plan_id)
    const order = await createRazorpayOrder({
      amount,
      currency,
      receipt: `org_${auth.organization!.id}_${Date.now()}`,
      notes: { organization_id: auth.organization!.id, plan_id: body.plan_id },
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
      .eq("organization_id", auth.organization!.id)
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

    // Reset organization plan back to free
    await supabase
      .from("organizations")
      .update({ plan: "free" })
      .eq("id", auth.organization!.id)

    return ok({ success: true })
  },
}).DELETE

