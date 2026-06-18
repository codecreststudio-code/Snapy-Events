import { type NextRequest, NextResponse } from "next/server"
import { defineRoute, fail, created } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { signupSchema } from "@/lib/validators"
import { defaultOrgFlags } from "@/lib/feature-flags"
import { slugify } from "@/lib/utils"
import { logAudit } from "@/lib/audit/log"
import { sendEmail, emailWelcome } from "@/lib/integrations/resend"

export const POST = defineRoute({
  method: "POST",
  body: signupSchema,
  rateLimit: { key: "auth:signup", limit: 5, windowSeconds: 60 },
  audit: "auth.signup",
  handler: async ({ body, request }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: { full_name: body.full_name } },
    })
    if (error || !data.user) return fail("AUTH_ERROR", error?.message ?? "Sign up failed", 400)

    // Create the organization + link the user
    const svc = await createServiceClient()
    const orgSlug = `${slugify(body.organization_name)}-${Date.now().toString(36).slice(-4)}`
    const { data: org, error: orgError } = await svc
      .from("organizations")
      .insert({
        name: body.organization_name,
        slug: orgSlug,
        plan: "free",
        feature_flags: defaultOrgFlags("free"),
      })
      .select()
      .single()
    if (orgError || !org) return fail("SIGNUP_ERROR", "Could not create organization", 500, orgError?.message)

    await svc
      .from("users")
      .update({ organization_id: org.id, role: "owner" })
      .eq("id", data.user.id)

    await logAudit({ organization_id: org.id, user_id: data.user.id, action: "org.created", resource_type: "organization", resource_id: org.id, request })

    const tpl = emailWelcome(body.full_name)
    void sendEmail({ to: body.email, ...tpl })

    return created({ user: { id: data.user.id, email: data.user.email }, organization: org })
  },
}).POST
