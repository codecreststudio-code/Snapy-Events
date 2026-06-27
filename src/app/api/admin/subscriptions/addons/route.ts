import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("addons")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data)
  },
}).GET

const createAddonSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price_inr: z.number().min(0),
  price_usd: z.number().min(0),
  billing_type: z.enum(["one_time", "monthly", "yearly", "lifetime"]).default("one_time"),
  compatible_plans: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
})

export const POST = defineRoute({
  method: "POST",
  requireAuth: "admin",
  body: createAddonSchema,
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("addons")
      .insert({
        ...body,
      })
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
