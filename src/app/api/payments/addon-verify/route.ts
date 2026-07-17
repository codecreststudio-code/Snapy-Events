import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { fetchRazorpayOrder } from "@/lib/integrations/razorpay"
import crypto from "node:crypto"

const addonVerifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
})

function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export const POST = defineRoute({
  method: "POST",
  body: addonVerifySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body

    // 1. Verify Razorpay Signature (timing-safe)
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return fail("CONFIG_ERROR", "Razorpay webhook secret not configured", 500)
    }

    const text = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex")

    if (!timingSafeEqualHex(expectedSignature, razorpay_signature)) {
      return fail("INVALID_PAYMENT", "Payment verification failed: signature mismatch", 400)
    }

    const supabase = await createServiceClient()

    // 2. Idempotency — never double-apply a boost on retry/replay.
    const { data: existingTxn } = await supabase
      .from("transactions")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle()
    if (existingTxn) {
      return ok({ success: true, already_processed: true })
    }

    // 3. Entitlement + amount come from the server-set order notes, never the
    //    client body (else a user pays ₹1 and claims any boost_value/total_price).
    let order: Awaited<ReturnType<typeof fetchRazorpayOrder>>
    try {
      order = await fetchRazorpayOrder(razorpay_order_id)
    } catch {
      return fail("INVALID_PAYMENT", "Could not verify the payment order", 400)
    }
    const notes = (order.notes ?? {}) as Record<string, string>
    if (notes.user_id && notes.user_id !== auth.user!.id) {
      return fail("FORBIDDEN", "Order does not belong to the current user", 403)
    }
    const boost_type = notes.addon_type === "shots" ? "shots" : notes.addon_type === "guest" ? "guest" : null
    const boost_value = parseInt(notes.addon_value || "0", 10) || 0
    if (!boost_type || boost_value < 1) {
      return fail("INVALID_PAYMENT", "Order is missing addon details", 400)
    }
    const amountInPaise = typeof order.amount === "number" ? order.amount : Number(order.amount) || 0

    // 4. Fetch current user preferences to increment boosts
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
      return fail("DB_ERROR", "Failed to update user preferences", 500)
    }

    // 5. Create Invoice for the Add-on purchase (amount from the paid order)
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
