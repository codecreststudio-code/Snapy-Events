import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import crypto from "node:crypto"
import { calculatePrice } from "../checkout/route"

const verifyBodySchema = z.object({
  razorpay_payment_id: z.string().min(1).max(200),
  razorpay_order_id: z.string().min(1).max(200),
  razorpay_signature: z.string().min(1).max(512),
  plan_id: z.string().min(1),
  coupon_code: z.string().optional(),
  guest_boost: z.number().int().min(0).max(1000).default(0),
  shots_boost: z.number().int().min(0).max(10000).default(0),
  currency: z.enum(["INR", "USD"]).default("INR"),
})

export const POST = defineRoute({
  method: "POST",
  body: verifyBodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan_id, guest_boost, shots_boost, coupon_code, currency } = body

    // 1. Verify Razorpay Signature
    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim()
    if (!secret) {
      return fail("CONFIG_ERROR", "Razorpay secret key not configured", 500)
    }

    const text = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return fail("INVALID_PAYMENT", "Payment verification failed: signature mismatch", 400)
    }

    const supabase = await createServiceClient()

    // 2. Fetch user & organization
    const { data: userRecord } = await supabase
      .from("users")
      .select("id, organization_id, preferences")
      .eq("id", auth.user!.id)
      .maybeSingle()

    const orgId = userRecord?.organization_id || auth.user!.id

    // Update user boosts in preferences
    if (userRecord) {
      const currentPrefs = (userRecord.preferences as Record<string, any>) || {}
      const newPrefs = {
        ...currentPrefs,
        guest_boost: (currentPrefs.guest_boost || 0) + guest_boost,
        shots_boost: (currentPrefs.shots_boost || 0) + shots_boost,
      }
      await supabase
        .from("users")
        .update({ preferences: newPrefs })
        .eq("id", userRecord.id)
    }

    // 3. Update Organization Plan
    if (orgId) {
      await supabase
        .from("organizations")
        .update({ plan: plan_id })
        .eq("id", orgId)
    }

    // 4. Create or update Subscription
    let subscriptionId: string | null = null
    if (orgId) {
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("organization_id", orgId)
        .in("status", ["active", "past_due"])
        .limit(1)
        .maybeSingle()

      if (existingSub) {
        const { data: updated } = await supabase
          .from("subscriptions")
          .update({
            user_id: auth.user!.id,
            plan_id: plan_id,
            status: "active",
            razorpay_subscription_id: razorpay_payment_id,
            current_period_start: new Date().toISOString(),
            current_period_end: null,
          })
          .eq("id", existingSub.id)
          .select("id")
          .single()
        subscriptionId = updated?.id ?? existingSub.id
      } else {
        const { data: inserted } = await supabase
          .from("subscriptions")
          .insert({
            user_id: auth.user!.id,
            organization_id: orgId,
            plan_id: plan_id,
            status: "active",
            razorpay_subscription_id: razorpay_payment_id,
            current_period_start: new Date().toISOString(),
            current_period_end: null,
          })
          .select("id")
          .single()
        subscriptionId = inserted?.id ?? null
      }
    }

    // 5. Calculate total paid amount
    let price = 0
    try {
      price = await calculatePrice(supabase, plan_id, guest_boost, shots_boost, coupon_code, currency)
    } catch {
      price = 0
    }
    const amountInPaise = price * 100

    // 6. Create Invoice
    let invoiceId: string | null = null
    if (orgId) {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${auth.user!.id.slice(0, 4)}`
      const { data: invoice } = await supabase
        .from("invoices")
        .insert({
          organization_id: orgId,
          subscription_id: subscriptionId,
          invoice_number: invoiceNumber,
          status: "paid",
          currency: "INR",
          subtotal: amountInPaise,
          tax: 0,
          total: amountInPaise,
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single()
      invoiceId = invoice?.id ?? null
    }

    // 7. Record Transaction
    if (orgId) {
      await supabase.from("transactions").insert({
        organization_id: orgId,
        invoice_id: invoiceId,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_order_id: razorpay_order_id,
        amount: amountInPaise,
        currency: "INR",
        status: "success",
        payment_method: "razorpay",
      })
    }

    return ok({ success: true, plan: plan_id })
  },
}).POST
