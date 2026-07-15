import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { isRazorpayConfigured, createRazorpayCustomer, createRazorpayOrder } from "@/lib/integrations/razorpay"
import { adminDb } from "@/lib/supabase/admin"
import { getLiveAddonCatalog, type LiveAddonCatalog } from "@/lib/payments/addons"
import { PLAN_BASE_PHOTO_LIMITS } from "@/lib/constants"
import { getFeatureFlags } from "@/lib/platform-settings"

const checkoutBodySchema = z.object({
  plan_id: z.string().min(1),
  coupon_code: z.string().optional(),
  guest_boost: z.number().default(0),
  shots_boost: z.number().default(0),
  currency: z.enum(["INR", "USD"]).default("INR"),
  // Selections made in the event wizard that exceed the chosen plan's own
  // included limits — e.g. picking "Unlimited" photos on Starter, or
  // enabling Videos/Voice Notes on a plan that doesn't include them. These
  // used to be free (the wizard let you pick them with no price change and
  // the checkout API never even looked at them); calculatePrice() below now
  // charges for the difference the same way it already does for guest/shot
  // boosts.
  photo_limit: z.number().optional(),
  videos: z.boolean().default(false),
  voice_notes: z.boolean().default(false),
})

// Server-side add-on pricing for wizard selections that exceed the chosen
// plan's included limits. This is intentionally re-derived here (not
// trusted from the client) so the Razorpay order amount always reflects
// what the host actually owes, regardless of what the wizard UI displayed.
// Priced from the live Admin > Add-ons catalog (catalog is fetched once by
// the caller and passed in, so calculatePrice() only hits the DB once).
export function calculateFeatureAddonPrice(
  planId: string,
  catalog: Pick<LiveAddonCatalog, "photoLimitBoosts" | "videoAddonPrice" | "voiceAddonPrice">,
  photoLimit?: number,
  videos?: boolean,
  voiceNotes?: boolean
) {
  let addon = 0
  const planBaseLimit = PLAN_BASE_PHOTO_LIMITS[planId] ?? 0

  if (typeof photoLimit === "number" && photoLimit !== planBaseLimit && (photoLimit === -1 || photoLimit > planBaseLimit)) {
    addon += catalog.photoLimitBoosts.find((b) => b.value === photoLimit)?.price ?? 0
  }

  const planIncludesVideo = planId === "standard" || planId === "premium"
  if (videos && !planIncludesVideo) {
    addon += catalog.videoAddonPrice
  }

  const planIncludesVoice = planId === "premium"
  if (voiceNotes && !planIncludesVoice) {
    addon += catalog.voiceAddonPrice
  }

  return addon
}

export async function calculatePrice(
  supabase: any,
  planId: string,
  guestBoost: number,
  shotsBoost: number,
  couponCode?: string,
  currency: "INR" | "USD" = "INR",
  userId?: string,
  photoLimit?: number,
  videos?: boolean,
  voiceNotes?: boolean
) {
  let price = 0

  // If user already owns this plan tier and is purchasing add-ons, base plan price is $0
  let isCurrentPlanActive = false
  if (userId) {
    const { data: userRec } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (userRec?.plan_id === planId && (guestBoost > 0 || shotsBoost > 0)) {
      isCurrentPlanActive = true
    }
  }

  if (!isCurrentPlanActive) {
    const { data: planRecord } = await supabase
      .from("plans")
      .select("price_inr, price_usd")
      .eq("id", planId)
      .single()

    if (planRecord) {
      if (currency === "USD") {
        price = planRecord.price_usd > 0 ? planRecord.price_usd : Math.round(planRecord.price_inr / 80) || 1
      } else {
        price = planRecord.price_inr
      }
    } else {
      throw new Error("Plan not found")
    }
  }

  // Priced from the live Admin > Add-ons catalog (one fetch covers guest,
  // shot, photo-limit, video, and voice add-ons) so a price change there
  // takes effect here immediately, not just on the Billing page's display.
  const catalog = await getLiveAddonCatalog()
  const guestItem = catalog.guestBoosts.find(b => b.value === guestBoost)
  const shotItem = catalog.shotBoosts.find(b => b.value === shotsBoost)

  const guestAddonPriceInr = guestItem?.price || (guestBoost > 0 ? Math.round(guestBoost * 19.9) : 0)
  const shotAddonPriceInr = shotItem?.price || (shotsBoost > 0 ? Math.round(shotsBoost * 19.9) : 0)

  const guestAddonPrice = currency === "USD" ? (Math.round(guestAddonPriceInr / 80) || (guestBoost > 0 ? 3 : 0)) : guestAddonPriceInr
  const shotAddonPrice = currency === "USD" ? (Math.round(shotAddonPriceInr / 80) || (shotsBoost > 0 ? 2 : 0)) : shotAddonPriceInr

  const featureAddonPriceInr = calculateFeatureAddonPrice(planId, catalog, photoLimit, videos, voiceNotes)
  const featureAddonPrice = currency === "USD" ? (Math.round(featureAddonPriceInr / 80) || (featureAddonPriceInr > 0 ? 1 : 0)) : featureAddonPriceInr

  price = price + guestAddonPrice + shotAddonPrice + featureAddonPrice

  // Apply Coupon if exists
  if (couponCode) {
    const sb = await adminDb()
    const { data: coupon } = await sb.from("coupons").select("*").eq("code", couponCode).eq("is_active", true).single()
    const now = Date.now()
    const notExpired = !coupon?.valid_until || new Date(coupon.valid_until).getTime() > now
    const notStarted = !coupon?.valid_from || new Date(coupon.valid_from).getTime() <= now
    const underMaxUses =
      coupon?.max_uses == null || (coupon.used_count || 0) < coupon.max_uses
    if (coupon && notExpired && notStarted && underMaxUses) {
      if (coupon.discount_type === "percentage") {
        price = price - (price * (coupon.discount_value / 100))
      } else {
        const disc = currency === "USD" ? Math.round(coupon.discount_value / 80) : coupon.discount_value
        price = price - disc
      }
      if (price < 0) price = 0
    }
  }

  return price
}


export const POST = defineRoute({
  method: "POST",
  body: checkoutBodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    if (!isRazorpayConfigured()) {
      return fail("BILLING_UNAVAILABLE", "Razorpay is not configured", 503)
    }

    // Admin > Settings / Admin > Feature Flags kill switch. Previously this
    // toggle was cosmetic — it saved to the database but nothing ever
    // checked it, so turning "Payments" off during an incident did nothing.
    const flags = await getFeatureFlags()
    if (!flags.payments_enabled) {
      return fail("BILLING_UNAVAILABLE", "Payments are temporarily disabled by the platform. Please try again later.", 503)
    }

    const supabase = await createClient()
    const targetCurrency = body.currency || "INR"

    let price = 0
    try {
      price = await calculatePrice(
        supabase,
        body.plan_id,
        body.guest_boost,
        body.shots_boost,
        body.coupon_code,
        targetCurrency,
        auth.user!.id,
        body.photo_limit,
        body.videos,
        body.voice_notes
      )
    } catch (err: any) {
      return fail("BAD_REQUEST", err.message, 400)
    }
    const amountSubunits = Math.round(price * 100)

    // 1. Fetch or create Customer ID
    const { data: userRecord } = await supabase
      .from("users")
      .select("razorpay_customer_id, full_name")
      .eq("id", auth.user!.id)
      .single()

    let customerId = userRecord?.razorpay_customer_id ?? null
    if (!customerId) {
      try {
        const c = await createRazorpayCustomer({
          name: userRecord?.full_name ?? auth.user!.email,
          email: auth.user!.email,
        })
        customerId = c.id
        await supabase
          .from("users")
          .update({ razorpay_customer_id: customerId })
          .eq("id", auth.user!.id)
      } catch (err: any) {
        const msg = err.error?.description || err.description || err.message || String(err)
        console.warn(`[razorpay] Customer creation skipped (${msg}). Proceeding with order-only checkout.`)
        customerId = null
      }
    }

    // 2. Create Razorpay Order
    try {
      const order = await createRazorpayOrder({
        amount: amountSubunits,
        currency: targetCurrency,
        receipt: `chk_${Date.now().toString(36)}_${auth.user!.id.slice(0, 8)}`,
        notes: {
          user_id: auth.user!.id,
          plan_id: body.plan_id,
          guest_boost: String(body.guest_boost),
          shots_boost: String(body.shots_boost),
          currency: targetCurrency,
          ...(typeof body.photo_limit === "number" ? { photo_limit: String(body.photo_limit) } : {}),
          videos: String(body.videos),
          voice_notes: String(body.voice_notes),
          ...(body.coupon_code ? { coupon_code: body.coupon_code } : {}),
        },
      })

      return ok({
        order_id: order.id,
        amount: amountSubunits,
        currency: targetCurrency,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        customer_id: customerId,
        total_price: price,
      })
    } catch (err: any) {
      const rawMsg = err.error?.description || err.description || err.message || JSON.stringify(err)
      let userMsg = rawMsg
      if (typeof rawMsg === "string" && rawMsg.toLowerCase().includes("authentication failed")) {
        userMsg = "Razorpay API credentials invalid. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Vercel project environment settings."
      }
      return fail("PAYMENT_ERROR", `Failed to create payment order: ${userMsg}`, 500)
    }
  },
}).POST
