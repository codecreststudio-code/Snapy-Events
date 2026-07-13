import { defineRoute, fail, created } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit/log"
import { sendEmail } from "@/lib/integrations/resend"
import { z } from "zod"

import { API_RATE_LIMITS } from "@/lib/constants"

const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  full_name: z.string().min(2).max(100),
})

export const POST = defineRoute({
  method: "POST",
  body: signupSchema,
  rateLimit: { key: "auth:signup", limit: API_RATE_LIMITS.AUTH_SIGNUP, windowSeconds: 300 },
  audit: "auth.signup",
  handler: async ({ body, request }) => {
    const svc = await createServiceClient()

    const { data, error } = await svc.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    })
    if (error || !data.user) {
      const message = error?.status === 409 ? "An account with this email already exists" : "Registration failed"
      return fail("AUTH_ERROR", message, 400)
    }

    await svc
      .from("users")
      .update({ role: "owner", permissions: ["*"] })
      .eq("id", data.user.id)

    await svc.from("subscriptions").insert({
      user_id: data.user.id,
      plan_id: "free",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: null,
    })

    await logAudit({
      user_id: data.user.id,
      action: "user.created",
      resource_type: "user",
      resource_id: data.user.id,
      request,
    })

    // Send welcome email via the centralized service
    void sendEmail({
      to: body.email,
      templateId: "welcome",
      variables: {
        host_name: body.full_name,
        host_email: body.email,
        dashboard_url: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"}/dashboard`,
        support_email: "snapsyevent@gmail.com",
      },
      tags: [{ name: "type", value: "welcome" }],
    })

    return created({ user: { id: data.user.id, email: data.user.email, full_name: body.full_name } })
  },
}).POST
