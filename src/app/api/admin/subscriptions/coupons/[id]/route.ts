import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const updateCouponSchema = z.object({
  code: z.string().min(3).toUpperCase().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  discount_type: z.enum(["percentage", "fixed"]).optional(),
  discount_value: z.number().min(0).optional(),
  min_subscription_months: z.number().min(1).optional(),
  applicable_plans: z.array(z.string()).optional(),
  max_uses: z.number().nullable().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  max_discount_amount: z.number().nullable().optional(),
  min_order_value: z.number().nullable().optional(),
  stackable: z.boolean().optional(),
  first_purchase_only: z.boolean().optional(),
  excluded_plans: z.array(z.string()).optional(),
  specific_users: z.array(z.string()).optional(),
})

export const PATCH = defineRoute({
  method: "PATCH",
  requireAuth: "admin",
  body: updateCouponSchema,
  handler: async ({ request, body }) => {
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop()
    if (!id) return fail("BAD_REQUEST", "Missing coupon ID", 400)

    const sb = await adminDb()
    const { data, error } = await sb
      .from("coupons")
      .update(body)
      .eq("id", id)
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop()
    if (!id) return fail("BAD_REQUEST", "Missing coupon ID", 400)

    const sb = await adminDb()
    const { error } = await sb.from("coupons").delete().eq("id", id)

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ success: true })
  },
}).DELETE
