import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const paramsSchema = z.object({ id: z.string().uuid() })
const patchBodySchema = z.object({ read: z.boolean() })

export const PATCH = defineRoute<z.infer<typeof patchBodySchema>, unknown, { id: string }>({
  method: "PATCH",
  body: patchBodySchema,
  requireAuth: true,
  handler: async ({ params, body, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid notification id", 422)
    const { id } = parsedParams.data
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: body.read ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("user_id", auth.user!.id)
      .select("id, read_at")
      .maybeSingle()

    if (error) return fail("DB_ERROR", error.message, 500)
    if (!data) return ApiErrors.notFound("Notification")
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute<unknown, unknown, { id: string }>({
  method: "DELETE",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid notification id", 422)
    const { id } = parsedParams.data
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user!.id)
      .select("id")
      .maybeSingle()

    if (error) return fail("DB_ERROR", error.message, 500)
    if (!data) return ApiErrors.notFound("Notification")
    return ok({ deleted: true })
  },
}).DELETE
