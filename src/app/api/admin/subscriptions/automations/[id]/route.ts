import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const updateAutomationRuleSchema = z.object({
  name: z.string().min(1).optional(),
  trigger_event: z.string().min(1).optional(),
  action_type: z.string().min(1).optional(),
  target_plan: z.string().nullable().optional(),
  action_payload: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().optional(),
})

export const PATCH = defineRoute({
  method: "PATCH",
  requireAuth: "admin",
  body: updateAutomationRuleSchema,
  handler: async ({ request, body }) => {
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop()
    if (!id) return fail("BAD_REQUEST", "Missing automation rule ID", 400)

    const sb = await adminDb()
    const { data, error } = await sb
      .from("automation_rules")
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
    if (!id) return fail("BAD_REQUEST", "Missing automation rule ID", 400)

    const sb = await adminDb()
    const { error } = await sb.from("automation_rules").delete().eq("id", id)

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ success: true })
  },
}).DELETE
