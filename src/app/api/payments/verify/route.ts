import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import crypto from "node:crypto"
import { fetchRazorpayOrder } from "@/lib/integrations/razorpay"

function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

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
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body

    // 1. Verify Razorpay Signature (timing-safe)
    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim()
    if (!secret) {
      return fail("CONFIG_ERROR", "Razorpay secret key not configured", 500)
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
    const userId = auth.user!.id

    // 2. Idempotency: never process the same payment twice (Razorpay retries;
    //    a replayed request would re-activate the sub and re-add boosts).
    const { data: existingTxn } = await supabase
      .from("transactions")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle()
    if (existingTxn) {
      return ok({ success: true, already_processed: true })
    }

    // 3. Entitlement comes from the Razorpay ORDER (server-set at checkout), never
    //    from the client body — otherwise a user could pay for "starter" and then
    //    verify with plan_id:"premium" against the same valid signature.
    let order: Awaited<ReturnType<typeof fetchRazorpayOrder>>
    try {
      order = await fetchRazorpayOrder(razorpay_order_id)
    } catch {
      return fail("INVALID_PAYMENT", "Could not verify the payment order", 400)
    }
    const notes = (order.notes ?? {}) as Record<string, string>
    if (notes.user_id && notes.user_id !== userId) {
      return fail("FORBIDDEN", "Order does not belong to the current user", 403)
    }
    const plan_id = notes.plan_id
    if (!plan_id) {
      return fail("INVALID_PAYMENT", "Order is missing a plan", 400)
    }
    const guest_boost = parseInt(notes.guest_boost || "0", 10) || 0
    const shots_boost = parseInt(notes.shots_boost || "0", 10) || 0
    const coupon_code = notes.coupon_code || undefined
    const eventId = notes.event_id || undefined
    // Amount actually captured by Razorpay, in paise — authoritative for records.
    const amountInPaise = typeof order.amount === "number" ? order.amount : Number(order.amount) || 0

    // 4. Fetch user preferences
    const { data: userRecord } = await supabase
      .from("users")
      .select("id, preferences")
      .eq("id", userId)
      .maybeSingle()

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

    // 3. Create or update Subscription
    let subscriptionId: string | null = null
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["active", "past_due"])
      .limit(1)
      .maybeSingle()

    if (existingSub) {
      const { data: updated } = await supabase
        .from("subscriptions")
        .update({
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
          user_id: userId,
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

    // 5. Create Invoice
    let invoiceId: string | null = null
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${userId.slice(0, 4)}`
    const { data: invoice } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
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

    // 6. Record Transaction
    await supabase.from("transactions").insert({
      user_id: userId,
      invoice_id: invoiceId,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      amount: amountInPaise,
      currency: "INR",
      status: "success",
      payment_method: "razorpay",
    })

    // 7. Mark the specific event this payment was for as paid. This is the
    //    piece that used to be entirely missing — payment only ever touched
    //    the account-level `subscriptions` row, so there was no record
    //    anywhere of whether any individual event had actually been paid
    //    for. Verified against host_id so a payment can't be attributed to
    //    an event that isn't the payer's own.
    if (eventId) {
      const { data: eventRow } = await supabase
        .from("events")
        .select("id, host_id, settings")
        .eq("id", eventId)
        .maybeSingle()
      if (eventRow && eventRow.host_id === userId) {
        const currentSettings = (eventRow.settings as Record<string, any>) || {}
        await supabase
          .from("events")
          .update({
            settings: {
              ...currentSettings,
              payment_status: "paid",
              plan_tier: plan_id,
              paid_amount_inr: amountInPaise / 100,
              razorpay_payment_id: razorpay_payment_id,
              paid_at: new Date().toISOString(),
            },
          })
          .eq("id", eventId)
      }
    }

    // 8. Consume one coupon use (guarded by the idempotency check above, so a
    //    replay can't over-increment). Enforces max_uses over time.
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, used_count")
        .eq("code", coupon_code)
        .maybeSingle()
      if (coupon) {
        await supabase
          .from("coupons")
          .update({ used_count: (coupon.used_count || 0) + 1 })
          .eq("id", coupon.id)
      }
    }

    return ok({ success: true, plan: plan_id })
  },
}).POST
