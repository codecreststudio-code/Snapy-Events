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

    // 2. Fetch current user preferences to increment boosts
    const { data: userProfile } = await supabase
      .from("users")
      .select("preferences")
      .eq("id", auth.user!.id)
      .single()

    const currentPrefs = (userProfile?.preferences as Record<string, any>) || {}
    
    // Add existing boost values with the newly purchased boost values
    const newGuestBoost = boost_type === "guest" 
      ? (currentPrefs.guest_boost || 0) + boost_value 
      : (currentPrefs.guest_boost || 0)
      
    const newShotsBoost = boost_type === "shots"
      ? (currentPrefs.shots_boost || 0) + boost_value
      : (currentPrefs.shots_boost || 0)

    const newPrefs = {
      ...currentPrefs,
      guest_boost: newGuestBoost,
      shots_boost: newShotsBoost,
    }

    // 3. Update User
    const { error: userError } = await supabase
      .from("users")
      .update({
        preferences: newPrefs,
      })
      .eq("id", auth.user!.id)

    if (userError) {
      return fail("DB_ERROR", `Failed to update user: ${userError.message}`, 500)
    }

    // 4. Create Invoice for the Add-on purchase
    const amountInPaise = total_price * 100
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${auth.user!.id.slice(0, 4)}`
    
    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        user_id: auth.user!.id,
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
      user_id: auth.user!.id,
      invoice_id: invoice?.id ?? null,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      amount: amountInPaise,
      currency: "INR",
      status: "success",
      payment_method: "razorpay",
    })

    return ok({ success: true, updated_settings: newPrefs })
  },
}).POST
