import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data)
  },
}).GET

const createCouponSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().min(0),
  min_subscription_months: z.number().min(1).default(1),
  applicable_plans: z.array(z.string()).default([]),
  max_uses: z.number().nullable().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  max_discount_amount: z.number().nullable().optional(),
  min_order_value: z.number().nullable().optional(),
  stackable: z.boolean().default(false),
  first_purchase_only: z.boolean().default(false),
  excluded_plans: z.array(z.string()).default([]),
  specific_users: z.array(z.string()).default([]),
})

export const POST = defineRoute({
  method: "POST",
  requireAuth: "admin",
  body: createCouponSchema,
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("coupons")
      .insert({
        ...body,
      })
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
