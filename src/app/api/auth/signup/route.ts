import { type NextRequest, NextResponse } from "next/server"
import { defineRoute, fail, created } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"
import { logAudit } from "@/lib/audit/log"
import { sendEmail, emailWelcome } from "@/lib/integrations/resend"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
})

export const POST = defineRoute({
  method: "POST",
  body: signupSchema,
  rateLimit: { key: "auth:signup", limit: 5, windowSeconds: 60 },
  audit: "auth.signup",
  handler: async ({ body, request }) => {
    const svc = await createServiceClient()
    
    const { data, error } = await svc.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    })
    if (error || !data.user) return fail("AUTH_ERROR", error?.message ?? "Sign up failed", 400)

    const { data: freePlan } = await svc.from("plans").select("features").eq("id", "free").single()
    const defaultSettings: Record<string, boolean> = {
      payments_enabled: true, // Core system feature
    }
    if (freePlan?.features && Array.isArray(freePlan.features)) {
      freePlan.features.forEach((f: string) => {
        defaultSettings[f] = true
      })
    }

    await svc
      .from("users")
      .update({ plan: "free", settings: defaultSettings, role: "owner" })
      .eq("id", data.user.id)

    await logAudit({ user_id: data.user.id, action: "user.created", resource_type: "user", resource_id: data.user.id, request })

    const tpl = emailWelcome(body.full_name)
    void sendEmail({ to: body.email, ...tpl })

    return created({ user: { id: data.user.id, email: data.user.email, full_name: body.full_name } })
  },
}).POST
