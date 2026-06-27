import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data)
  },
}).GET

const createPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price_inr: z.number().min(0),
  price_usd: z.number().min(0),
  billing_interval: z.enum(["monthly", "yearly"]).default("monthly"),
  trial_days: z.number().min(0).default(0),
  theme_color: z.string().optional().nullable(),
  best_value: z.boolean().default(false),
  is_popular: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
  features: z.array(z.string()).default([]),
  limits: z.record(z.string(), z.any()).default({}),
})

export const POST = defineRoute({
  method: "POST",
  requireAuth: "admin",
  body: createPlanSchema,
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("plans")
      .insert({
        ...body,
      })
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
