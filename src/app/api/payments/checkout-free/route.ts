import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { calculatePrice } from "@/app/api/payments/checkout/route"

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
  guest_boost: z.number().int().min(0).max(1000).default(0),
  shots_boost: z.number().int().min(0).max(10000).default(0),
  coupon_code: z.string().optional(),
  currency: z.enum(["INR", "USD"]).default("INR"),
  photo_limit: z.number().optional(),
  videos: z.boolean().default(false),
  voice_notes: z.boolean().default(false),
})

export const POST = defineRoute({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const supabase = await createClient()
    const userId = auth.user!.id

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

    // Apply guest/shot boosts to preferences, same as a verified payment would.
    if (body.guest_boost > 0 || body.shots_boost > 0) {
      const { data: userRecord } = await supabase
        .from("users")
        .select("id, preferences")
        .eq("id", userId)
        .maybeSingle()

      if (userRecord) {
        const currentPrefs = (userRecord.preferences as Record<string, any>) || {}
        const newPrefs = {
          ...currentPrefs,
          guest_boost: (currentPrefs.guest_boost || 0) + body.guest_boost,
          shots_boost: (currentPrefs.shots_boost || 0) + body.shots_boost,
        }
        await supabase.from("users").update({ preferences: newPrefs }).eq("id", userRecord.id)
      }
    }

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

    return ok({ success: true, plan: body.plan_id })
  },
}).POST
