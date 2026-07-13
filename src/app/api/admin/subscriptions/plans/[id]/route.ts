import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { API_RATE_LIMITS } from "@/lib/constants"

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price_inr: z.number().min(0).optional(),
  price_usd: z.number().min(0).optional(),
  billing_interval: z.enum(["event", "monthly", "yearly"]).optional(),
  trial_days: z.number().min(0).optional(),
  theme_color: z.string().nullable().optional(),
  best_value: z.boolean().optional(),
  is_popular: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
  features: z.array(z.string()).optional(),
  limits: z.record(z.string(), z.any()).optional(),
})

export const PATCH = defineRoute({
  method: "PATCH",
  requireAuth: "admin",
  rateLimit: { key: "admin:plans:patch", limit: API_RATE_LIMITS.ADMIN_STRICT, windowSeconds: 60 },
  body: updatePlanSchema,
  handler: async ({ request, body }) => {
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop()
    if (!id) return fail("BAD_REQUEST", "Missing plan ID", 400)

    const sb = await adminDb()
    const { data, error } = await sb
      .from("plans")
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
    if (!id) return fail("BAD_REQUEST", "Missing plan ID", 400)

    const sb = await adminDb()
    const { error } = await sb.from("plans").delete().eq("id", id)

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ success: true })
  },
}).DELETE
