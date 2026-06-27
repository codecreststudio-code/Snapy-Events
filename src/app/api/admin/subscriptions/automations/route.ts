import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("automation_rules")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data)
  },
}).GET

const createAutomationRuleSchema = z.object({
  name: z.string().min(1),
  trigger_event: z.string().min(1),
  action_type: z.string().min(1),
  target_plan: z.string().nullable().optional(),
  action_payload: z.record(z.string(), z.any()).default({}),
  is_active: z.boolean().default(true),
})

export const POST = defineRoute({
  method: "POST",
  requireAuth: "admin",
  body: createAutomationRuleSchema,
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("automation_rules")
      .insert({
        ...body,
      })
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
