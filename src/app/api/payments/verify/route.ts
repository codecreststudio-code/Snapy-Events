import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import crypto from "node:crypto"
import { calculatePrice } from "../checkout/route"

const verifyBodySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
  plan_id: z.string().min(1),
  coupon_code: z.string().optional(),
  guest_boost: z.number().default(0),
  shots_boost: z.number().default(0),
})

export const POST = defineRoute({
  method: "POST",
  body: verifyBodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan_id, guest_boost, shots_boost, coupon_code } = body

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

    const { data: userRecord } = await supabase
      .from("users")
      .select("settings")
      .eq("id", auth.user!.id)
      .single()

    const { data: newPlan } = await supabase
      .from("plans")
      .select("features")
      .eq("id", plan_id)
      .single()

    const currentSettings = (userRecord?.settings as Record<string, any>) || {}
    const newSettings: Record<string, any> = {
      ...currentSettings,
      guest_boost,
      shots_boost,
    }

    if (newPlan?.features && Array.isArray(newPlan.features)) {
      newPlan.features.forEach((f: string) => {
        newSettings[f] = true
      })
    }

    // 3. Update User
    const { error: userError } = await supabase
      .from("users")
      .update({
        plan: plan_id,
        settings: newSettings,
      })
      .eq("id", auth.user!.id)

    if (userError) {
      return fail("DB_ERROR", `Failed to update user: ${userError.message}`, 500)
    }

    // 4. Create or update Subscription
    // Try upserting subscription
    const subRes = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: auth.user!.id,
          plan_id: plan_id,
          status: "active",
          razorpay_subscription_id: razorpay_payment_id, // Store payment ID as the subscription identifier
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single()

    const subscriptionId = subRes.data?.id ?? null

    // 5. Calculate total paid amount
    let price = 0
    try {
      price = await calculatePrice(supabase, plan_id, guest_boost, shots_boost, coupon_code)
    } catch {
      price = 0 // default to 0 if something fails here, but payment succeeded
    }
    const amountInPaise = price * 100

    // 6. Create Invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${auth.user!.id.slice(0, 4)}`
    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        user_id: auth.user!.id,
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
      user_id: auth.user!.id,
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
