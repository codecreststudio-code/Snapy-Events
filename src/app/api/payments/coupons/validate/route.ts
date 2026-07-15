import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { validateCouponSchema } from "@/lib/validators"
import { API_RATE_LIMITS } from "@/lib/constants"

export const POST = defineRoute({
  method: "POST",
  body: validateCouponSchema,
  // Unauthenticated + no per-attempt cost — without a limit here this is a
  // free-form oracle for guessing valid coupon codes by brute force.
  rateLimit: { key: "coupons:validate", limit: API_RATE_LIMITS.COUPON_VALIDATE, windowSeconds: 60 },
  handler: async ({ body }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", body.code.toUpperCase())
      .eq("is_active", true)
      .single()
    if (error || !data) return fail("NOT_FOUND", "Coupon not found or inactive", 404)
    if (data.valid_until && new Date(data.valid_until) < new Date()) return fail("GONE", "Coupon expired", 410)
    if (data.max_uses !== null && data.used_count >= data.max_uses) return fail("CONFLICT", "Coupon exhausted", 409)
    return ok({ valid: true, discount_type: data.discount_type, discount_value: data.discount_value, min_months: data.min_subscription_months })
  },
}).POST
