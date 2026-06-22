import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const postBodySchema = z.object({
  key: z.string().min(1),
  value: z.any(),
})

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("platform_settings")
      .select("*")

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [])
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: postBodySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { key, value } = body

    const { error } = await sb
      .from("platform_settings")
      .upsert(
        { key, value },
        { onConflict: "key" }
      )

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).POST
