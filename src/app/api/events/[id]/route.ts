import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { updateEventSchema } from "@/lib/validators"
import { logAudit } from "@/lib/audit/log"

const paramsSchema = z.object({ id: z.string().uuid() })

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("events")
      .select("*, galleries(*), qr_codes(*)")
      .eq("id", id)
      .eq("host_id", auth.user!.id)
      .single()
    if (error || !data) return ApiErrors.notFound("Event")
    return ok(data)
  },
}).GET

export const PATCH = defineRoute<z.infer<typeof updateEventSchema>, unknown, { id: string }>({
  method: "PATCH",
  body: updateEventSchema,
  requireAuth: true,
  audit: "event.updated",
  handler: async ({ params, body, auth, request }) => {
    const { id } = params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("events")
      .update(body)
      .eq("id", id)
      .eq("host_id", auth.user!.id)
      .select()
      .single()
    if (error) return fail("DB_ERROR", error.message, 400)
    await logAudit({ user_id: auth.user!.id, action: "event.updated", resource_type: "event", resource_id: id, changes: body as Record<string, unknown>, request })
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute<unknown, unknown, { id: string }>({
  method: "DELETE",
  requireAuth: true,
  audit: "event.deleted",
  handler: async ({ params, auth, request }) => {
    const { id } = params
    const supabase = await createClient()
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("host_id", auth.user!.id)
    if (error) return fail("DB_ERROR", error.message, 400)
    await logAudit({ user_id: auth.user!.id, action: "event.deleted", resource_type: "event", resource_id: id, request })
    return ok({ deleted: true })
  },
}).DELETE
