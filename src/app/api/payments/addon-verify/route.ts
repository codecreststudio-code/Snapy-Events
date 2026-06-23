import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import crypto from "node:crypto"

const addonVerifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
  boost_type: z.enum(["guest", "shots"]),
  boost_value: z.number().min(1),
  total_price: z.number().min(1),
})

export const POST = defineRoute({
  method: "POST",
  body: addonVerifySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, boost_type, boost_value, total_price } = body

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

    // 2. Fetch current organization settings to increment boosts
    const { data: org } = await supabase
      .from("organizations")
      .select("settings, plan")
      .eq("id", auth.organization!.id)
      .single()

    const currentSettings = (org?.settings as Record<string, any>) || {}
    
    // Add existing boost values with the newly purchased boost values
    const newGuestBoost = boost_type === "guest" 
      ? (currentSettings.guest_boost || 0) + boost_value 
      : (currentSettings.guest_boost || 0)
      
    const newShotsBoost = boost_type === "shots"
      ? (currentSettings.shots_boost || 0) + boost_value
      : (currentSettings.shots_boost || 0)

    const newSettings = {
      ...currentSettings,
      guest_boost: newGuestBoost,
      shots_boost: newShotsBoost,
    }

    // 3. Update Organization
    const { error: orgError } = await supabase
      .from("organizations")
      .update({
        settings: newSettings,
      })
      .eq("id", auth.organization!.id)

    if (orgError) {
      return fail("DB_ERROR", `Failed to update organization: ${orgError.message}`, 500)
    }

    // 4. Create Invoice for the Add-on purchase
    const amountInPaise = total_price * 100
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${auth.organization!.id.slice(0, 4)}`
    
    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        organization_id: auth.organization!.id,
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

    // 5. Record Transaction
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

    return ok({ success: true, updated_settings: newSettings })
  },
}).POST
