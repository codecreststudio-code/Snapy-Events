import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { validateCouponSchema } from "@/lib/validators"

export const POST = defineRoute({
  method: "POST",
  body: validateCouponSchema,
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
