import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import crypto from "node:crypto"
import { fetchRazorpayOrder } from "@/lib/integrations/razorpay"
import { API_RATE_LIMITS } from "@/lib/constants"
import { sendEmail } from "@/lib/integrations/resend"
import { serverEnv } from "@/lib/env"

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
  rateLimit: { key: "payments:verify", limit: API_RATE_LIMITS.PAYMENT_VERIFY, windowSeconds: 60 },
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

    // 4. Guest/shot boosts purchased at checkout are scoped to the specific
    //    event this payment was for (see step 7 below, which writes
    //    guests_boost/shots_boost onto that event's own settings). This used
    //    to ALSO increment `users.preferences.guest_boost/shots_boost` — an
    //    account-wide bucket read by photos/upload/route.ts and
    //    events/public-info/route.ts — with no per-event reset, so a boost
    //    bought for one event permanently inflated every other event the
    //    host ever created, stacking indefinitely across purchases. That
    //    increment has been removed; the event-scoped write in step 7 is now
    //    the only place a boost is persisted.

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

    // 6. Record Transaction. event_id + the boost deltas this specific
    //    payment granted are stored here so an admin refund
    //    (src/app/api/admin/payments/refund/route.ts) can find and reverse
    //    exactly what this transaction gave the event — not guess, and not
    //    touch boosts contributed by some other transaction on the same event.
    await supabase.from("transactions").insert({
      user_id: userId,
      invoice_id: invoiceId,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      amount: amountInPaise,
      currency: "INR",
      status: "success",
      payment_method: "razorpay",
      event_id: eventId ?? null,
      guests_boost_delta: guest_boost,
      shots_boost_delta: shots_boost,
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
        .select("id, host_id, status, settings, name, slug")
        .eq("id", eventId)
        .maybeSingle()
      if (eventRow && eventRow.host_id === userId) {
        const currentSettings = (eventRow.settings as Record<string, any>) || {}
        // SECURITY: this is the payment-confirmation moment that flips a
        // `draft` (pending-payment) event to `published` — see the matching
        // fix in /api/events (POST), which now creates paid-plan events as
        // `draft` instead of trusting the client to say "published" up
        // front. Only transitions out of `draft`; never overrides a status
        // an admin/host has since set (e.g. "completed"/"archived").
        const wasDraft = eventRow.status === "draft"
        await supabase
          .from("events")
          .update({
            ...(wasDraft ? { status: "published" } : {}),
            settings: {
              ...currentSettings,
              payment_status: "paid",
              plan_tier: plan_id,
              paid_amount_inr: amountInPaise / 100,
              razorpay_payment_id: razorpay_payment_id,
              paid_at: new Date().toISOString(),
              // Event-scoped boost amounts — see the removed account-wide
              // preferences increment above for why this is the only place
              // these are written now. Additive so a second boost purchase
              // for the SAME event stacks correctly, without touching any
              // other event.
              guests_boost: (currentSettings.guests_boost || 0) + guest_boost,
              shots_boost: (currentSettings.shots_boost || 0) + shots_boost,
            },
          })
          .eq("id", eventId)

        // The "your event is live" email used to fire at creation time
        // (whenever status was "published"), which no longer happens for
        // paid events until this exact moment. Fire it here instead, once,
        // on the actual draft -> published transition.
        if (wasDraft) {
          const { data: userRow } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("id", userId)
            .maybeSingle()
          if (userRow?.email) {
            void sendEmail({
              to: userRow.email,
              templateId: "event_created",
              variables: {
                host_name: userRow.full_name || userRow.email,
                event_name: eventRow.name,
                event_link: `${serverEnv.APP_URL}/event/${eventRow.slug}`,
              },
              tags: [{ name: "type", value: "event-published" }],
            })
          }
        }
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
