import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "25")
    const status = searchParams.get("status") || ""
    const planId = searchParams.get("planId") || ""
    const offset = (page - 1) * limit

    const sb = await adminDb()

    let query = sb
      .from("subscriptions")
      .select(
        `
        id,
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        cancelled_at,
        razorpay_subscription_id,
        created_at,
        metadata,
        user:users(id, full_name, email),
        plan:plans(id, name, price_inr, price_usd)
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)
    if (planId) query = query.eq("plan_id", planId)

    const { data, error, count } = await query

    if (error) return fail("DB_ERROR", error.message, 500)

    return ok({
      subscriptions: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  },
}).GET

const updateSubSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "past_due", "canceled", "paused"]).optional(),
  plan_id: z.string().optional(),
  cancel_at_period_end: z.boolean().optional(),
})

export const PATCH = defineRoute({
  method: "PATCH",
  body: updateSubSchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { id, ...updates } = body

    const { data, error } = await sb
      .from("subscriptions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        id, user_id, plan_id, status, current_period_end,
        cancel_at_period_end, created_at,
        user:users(id, full_name),
        plan:plans(id, name, price_inr)
      `)
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).PATCH
