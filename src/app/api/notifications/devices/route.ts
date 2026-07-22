import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { API_RATE_LIMITS } from "@/lib/constants"

// Registers/refreshes a push-notification device (FCM token) for the signed-in
// user. `notification_token` is UNIQUE (see 0039_notification_infrastructure.sql)
// so re-registering the same token (token refresh returning the same value, or
// the same browser/device registering again) upserts the existing row rather
// than creating a duplicate.
const postBodySchema = z.object({
  token: z.string().trim().min(1),
  deviceType: z.string().trim().min(1),
  browser: z.string().trim().optional(),
  platform: z.string().trim().optional(),
})

const deleteBodySchema = z.object({
  token: z.string().trim().min(1),
})

export const POST = defineRoute<z.infer<typeof postBodySchema>>({
  method: "POST",
  body: postBodySchema,
  requireAuth: true,
  rateLimit: {
    key: "notifications:devices:register",
    limit: API_RATE_LIMITS.NOTIFICATION_DEVICE_REGISTER,
    windowSeconds: 60,
  },
  handler: async ({ body, auth }) => {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from("notification_devices")
      .upsert(
        {
          user_id: auth.user!.id,
          notification_token: body.token,
          device_type: body.deviceType,
          browser: body.browser ?? null,
          platform: body.platform ?? null,
          is_active: true,
          last_active: now,
          updated_at: now,
        },
        { onConflict: "notification_token" },
      )

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).POST

export const DELETE = defineRoute<z.infer<typeof deleteBodySchema>>({
  method: "DELETE",
  body: deleteBodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const supabase = await createClient()

    // Soft-delete: keeps device history around instead of hard-deleting.
    // Scoped to the authenticated user so one user can't deactivate another's
    // device even if they somehow learned its token.
    const { error } = await supabase
      .from("notification_devices")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("notification_token", body.token)
      .eq("user_id", auth.user!.id)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).DELETE
