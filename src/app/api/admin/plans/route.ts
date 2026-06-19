import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const planBodySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  price_inr: z.number(),
  price_usd: z.number(),
  features: z.array(z.string()).default([]),
  limits: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
})

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("plans")
      .select("*")
      .order("price_inr", { ascending: true })

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [])
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: planBodySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { id, name, description, price_inr, price_usd, features, limits, is_active } = body

    const { data, error } = await sb
      .from("plans")
      .insert({
        id,
        name,
        description,
        price_inr,
        price_usd,
        features,
        limits,
        is_active,
        billing_interval: "monthly",
      })
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST

export const PATCH = defineRoute({
  method: "PATCH",
  body: planBodySchema.partial().extend({ id: z.string() }),
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { id, ...updates } = body

    const { data, error } = await sb
      .from("plans")
      .update(updates)
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
    const planId = url.searchParams.get("planId")
    if (!planId) return fail("VALIDATION_ERROR", "planId is required", 422)

    const sb = await adminDb()
    const { error } = await sb.from("plans").delete().eq("id", planId)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).DELETE
