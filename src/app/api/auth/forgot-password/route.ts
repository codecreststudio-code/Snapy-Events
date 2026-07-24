import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, fail, ok } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/integrations/resend"

const body = z.object({ email: z.string().email() })

export const POST = defineRoute({
  method: "POST",
  body,
  rateLimit: { key: "auth:forgot", limit: 5, windowSeconds: 60 },
  handler: async ({ body }) => {
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://snapsy-events.vercel.app"
    const resetUrl = `${appUrl}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: resetUrl,
    })
    if (error) return fail("AUTH_ERROR", error.message, 400)

    // Trigger branded Password Reset email automatically
    void sendEmail({
      to: body.email,
      templateId: "password_reset",
      variables: {
        reset_url: resetUrl,
      },
      tags: [{ name: "type", value: "password_reset" }],
    })

    return ok({ sent: true })
  },
}).POST
