import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const updateAddonSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price_inr: z.number().min(0).optional(),
  price_usd: z.number().min(0).optional(),
  billing_type: z.enum(["one_time", "monthly", "yearly", "lifetime"]).optional(),
  compatible_plans: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

export const PATCH = defineRoute({
  method: "PATCH",
  requireAuth: "admin",
  body: updateAddonSchema,
  handler: async ({ request, body }) => {
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop()
    if (!id) return fail("BAD_REQUEST", "Missing addon ID", 400)

    const sb = await adminDb()
    const { data, error } = await sb
      .from("addons")
      .update({ ...body, updated_at: new Date().toISOString() })
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
    if (!id) return fail("BAD_REQUEST", "Missing addon ID", 400)

    const sb = await adminDb()
    const { error } = await sb.from("addons").delete().eq("id", id)

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ success: true })
  },
}).DELETE
