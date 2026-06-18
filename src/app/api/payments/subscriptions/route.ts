import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { subscribeSchema } from "@/lib/validators"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder, planCurrency } from "@/lib/integrations/razorpay"

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
