import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { calculatePrice } from "@/app/api/payments/checkout/route"
import { getFeatureFlags } from "@/lib/platform-settings"
import { API_RATE_LIMITS } from "@/lib/constants"
import { sendEmail } from "@/lib/integrations/resend"
import { serverEnv } from "@/lib/env"

// Handles the case where /api/payments/checkout's calculatePrice() legitimately
// comes back to ₹0/$0 — e.g. the host's plan is already active and this
// event adds no guest/shot/photo-limit/video/voice add-ons beyond what's
// already included. The checkout page used to send these straight through
// Razorpay anyway, which rejects orders below its minimum charge (₹1), so
// clicking "Pay" on a ₹0 total just produced a payment error. This route
// performs the same subscription activation a successful Razorpay payment
// would, without involving the payment gateway at all.
const bodySchema = z.object({
  plan_id: z.string().min(1),
  event_id: z.string().uuid(),
  guest_boost: z.number().int().min(0).max(1000).default(0),
  shots_boost: z.number().int().min(0).max(10000).default(0),
  coupon_code: z.string().optional(),
  currency: z.enum(["INR", "USD"]).default("INR"),
  photo_limit: z.number().optional(),
  videos: z.boolean().default(false),
  voice_notes: z.boolean().default(false),
  // Client-generated once per checkout attempt and resent on retry (see
  // src/app/checkout/page.tsx). Unlike the paid flow, this route has no
  // Razorpay payment id to naturally dedupe repeat requests on — without
  // this, a double-click or a client retry after a slow/dropped response
  // would re-run the whole handler, double-incrementing this event's
  // guests_boost/shots_boost and burning a second use off a coupon's
  // max_uses for a single actual checkout.
  idempotency_key: z.string().min(1).max(200).optional(),
})

export const POST = defineRoute({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  rateLimit: { key: "payments:checkout-free", limit: API_RATE_LIMITS.PAYMENT_CHECKOUT, windowSeconds: 60 },
  handler: async ({ body, auth }) => {
    const flags = await getFeatureFlags()
    if (!flags.payments_enabled) {
      return fail("BILLING_UNAVAILABLE", "Billing/checkout is temporarily disabled by the platform. Please try again later.", 503)
    }

    const supabase = await createClient()
    const userId = auth.user!.id

    // Idempotency check — see the schema comment on idempotency_key above.
    // Reuses the same transactions.razorpay_payment_id uniqueness the paid
    // flow relies on (see verify/route.ts), namespaced with a "free_" prefix
    // so a free-checkout key can never collide with a real Razorpay id.
    // Requires the service client: transactions has no RLS insert policy
    // for regular users (only a user_id-scoped SELECT policy), matching how
    // verify/route.ts also has to use the service client for this table.
    const sbAdmin = await createServiceClient()
    if (body.idempotency_key) {
      const { data: existingTxn } = await sbAdmin
        .from("transactions")
        .select("id")
        .eq("razorpay_payment_id", `free_${body.idempotency_key}`)
        .maybeSingle()
      if (existingTxn) {
        return ok({ success: true, already_processed: true, plan: body.plan_id })
      }
    }

    const { data: eventRow } = await supabase
      .from("events")
      .select("id, host_id, status, settings, name, slug")
      .eq("id", body.event_id)
      .maybeSingle()
    if (!eventRow || eventRow.host_id !== userId) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    // Re-derive the price server-side — never trust the client's claim that
    // a checkout is free. If it isn't actually zero, bounce back to the paid
    // Razorpay flow instead of silently granting entitlements.
    let price = 0
    try {
      price = await calculatePrice(
        supabase,
        body.plan_id,
        body.guest_boost,
        body.shots_boost,
        body.coupon_code,
        body.currency,
        userId,
        body.photo_limit,
        body.videos,
        body.voice_notes,
      )
    } catch (err: any) {
      return fail("BAD_REQUEST", err.message, 400)
    }

    if (price > 0) {
      return fail("PAYMENT_REQUIRED", "This checkout is not free — use the paid checkout flow.", 402)
    }

    // Guest/shot boosts are applied onto THIS event's own settings below
    // (in the "Mark this specific event as covered" write) — not onto
    // `users.preferences`. Writing them account-wide, as this route used to,
    // meant a boost picked for one event permanently inflated every other
    // event the host ever created, since nothing ever reset that bucket per
    // event. See the identical fix + fuller explanation in
    // src/app/api/payments/verify/route.ts.

    // Activate/refresh the subscription record for this plan tier.
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["active", "past_due"])
      .limit(1)
      .maybeSingle()

    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          plan_id: body.plan_id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: null,
        })
        .eq("id", existingSub.id)
    } else {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_id: body.plan_id,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: null,
      })
    }

    // Mark this specific event as covered — either a genuinely free plan or
    // a 100%-off coupon, both legitimate ₹0 outcomes now that
    // calculatePrice() no longer waives the base price just because the
    // host purchased this tier before.
    //
    // SECURITY: same draft -> published transition as the paid flow (see
    // /api/payments/verify and the Razorpay webhook) — this route is
    // reached when calculatePrice() legitimately recomputes to ₹0 (e.g. a
    // 100%-off coupon on what /api/events created as a draft, pending-
    // payment event), so it needs the same activation logic, not just the
    // Razorpay-signed paths.
    const currentSettings = (eventRow.settings as Record<string, any>) || {}
    const wasDraft = eventRow.status === "draft"
    await supabase
      .from("events")
      .update({
        ...(wasDraft ? { status: "published" } : {}),
        settings: {
          ...currentSettings,
          payment_status: "free",
          plan_tier: body.plan_id,
          paid_amount_inr: 0,
          paid_at: new Date().toISOString(),
          // Event-scoped boost amounts, additive across repeat purchases for
          // this SAME event — see the removed account-wide preferences
          // increment above.
          guests_boost: (currentSettings.guests_boost || 0) + body.guest_boost,
          shots_boost: (currentSettings.shots_boost || 0) + body.shots_boost,
        },
      })
      .eq("id", body.event_id)

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

    // Consume a coupon use if one somehow drove the price to zero.
    if (body.coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, used_count")
        .eq("code", body.coupon_code)
        .maybeSingle()
      if (coupon) {
        await supabase
          .from("coupons")
          .update({ used_count: (coupon.used_count || 0) + 1 })
          .eq("id", coupon.id)
      }
    }

    // Record the idempotency marker last, once everything above has
    // actually succeeded — a retry that arrives before this point (e.g. the
    // very first attempt's response was lost mid-flight) is still safely
    // allowed to run the whole handler again rather than silently no-op
    // before anything was actually applied.
    if (body.idempotency_key) {
      await sbAdmin.from("transactions").insert({
        user_id: userId,
        razorpay_payment_id: `free_${body.idempotency_key}`,
        amount: 0,
        currency: body.currency,
        status: "success",
        payment_method: "free",
        event_id: body.event_id,
        guests_boost_delta: body.guest_boost,
        shots_boost_delta: body.shots_boost,
      })
    }

    return ok({ success: true, plan: body.plan_id })
  },
}).POST
