import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { validateCouponSchema } from "@/lib/validators"
import { API_RATE_LIMITS } from "@/lib/constants"
import { evaluateCouponEligibility } from "@/lib/payments/coupon-rules"

export const POST = defineRoute({
  method: "POST",
  body: validateCouponSchema,
  // Requires auth — the only caller is the (already-authenticated) checkout
  // page. This is what lets first_purchase_only and specific_users actually
  // be checked here, matching what calculatePrice() will enforce for real
  // at checkout (see src/lib/payments/coupon-rules.ts) — previously this
  // endpoint had no user context at all, so a coupon could "Apply" here and
  // then silently fail (or discount nothing) once checkout ran the real check.
  requireAuth: true,
  rateLimit: { key: "coupons:validate", limit: API_RATE_LIMITS.COUPON_VALIDATE, windowSeconds: 60 },
  handler: async ({ body, auth }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", body.code.toUpperCase())
      .eq("is_active", true)
      .single()
    if (error || !data) return fail("NOT_FOUND", "Coupon not found or inactive", 404)
    if (data.valid_until && new Date(data.valid_until) < new Date()) return fail("GONE", "Coupon expired", 410)
    if (data.valid_from && new Date(data.valid_from) > new Date()) return fail("NOT_FOUND", "Coupon is not active yet", 404)
    if (data.max_uses !== null && data.used_count >= data.max_uses) return fail("CONFLICT", "Coupon exhausted", 409)

    const userId = auth.user!.id
    let priorSuccessfulPurchases: number | undefined
    if (data.first_purchase_only) {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "success")
      priorSuccessfulPurchases = count || 0
    }

    const eligibility = evaluateCouponEligibility({
      coupon: data,
      planId: body.plan_id,
      priceInCurrency: body.order_value,
      currency: body.currency,
      hasAddons: body.has_addons,
      userId,
      priorSuccessfulPurchases,
    })
    if (!eligibility.eligible) {
      return fail("CONFLICT", eligibility.reason || "This coupon isn't valid for your order.", 409)
    }

    return ok({ valid: true, discount_type: data.discount_type, discount_value: data.discount_value, max_discount_amount: data.max_discount_amount, min_months: data.min_subscription_months })
  },
}).POST
