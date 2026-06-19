import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import crypto from "node:crypto"
import { calculatePrice } from "../checkout/route"

const verifyBodySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
  plan_id: z.enum(["starter", "standard", "premium"]),
  guest_boost: z.number().default(0),
  shots_boost: z.number().default(0),
})

export const POST = defineRoute({
  method: "POST",
  body: verifyBodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan_id, guest_boost, shots_boost } = body

    // 1. Verify Razorpay Signature
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return fail("CONFIG_ERROR", "Razorpay webhook secret not configured", 500)
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

    // 2. Fetch current organization settings to merge
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", auth.organization!.id)
      .single()

    const currentSettings = (org?.settings as Record<string, any>) || {}
    const newSettings = {
      ...currentSettings,
      guest_boost,
      shots_boost,
    }

    // 3. Update Organization
    const { error: orgError } = await supabase
      .from("organizations")
      .update({
        plan: plan_id,
        settings: newSettings,
      })
      .eq("id", auth.organization!.id)

    if (orgError) {
      return fail("DB_ERROR", `Failed to update organization: ${orgError.message}`, 500)
    }

    // 4. Create or update Subscription
    // Try upserting subscription
    const subRes = await supabase
      .from("subscriptions")
      .upsert(
        {
          organization_id: auth.organization!.id,
          plan_id: plan_id,
          status: "active",
          razorpay_subscription_id: razorpay_payment_id, // Store payment ID as the subscription identifier
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        { onConflict: "organization_id" }
      )
      .select()
      .single()

    const subscriptionId = subRes.data?.id ?? null

    // 5. Calculate total paid amount
    const price = calculatePrice(plan_id, guest_boost, shots_boost)
    const amountInPaise = price * 100

    // 6. Create Invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${auth.organization!.id.slice(0, 4)}`
    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        organization_id: auth.organization!.id,
        subscription_id: subscriptionId,
        invoice_number: invoiceNumber,
        status: "paid",
        currency: "INR",
        subtotal: amountInPaise,
        tax: 0,
        total: amountInPaise,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single()

    // 7. Record Transaction
    await supabase.from("transactions").insert({
      organization_id: auth.organization!.id,
      invoice_id: invoice?.id ?? null,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      amount: amountInPaise,
      currency: "INR",
      status: "success",
      payment_method: "razorpay",
    })

    return ok({ success: true, plan: plan_id })
  },
}).POST
