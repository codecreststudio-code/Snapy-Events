import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, fail, ok } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const body = z.object({ email: z.string().email() })

export const POST = defineRoute({
  method: "POST",
  body,
  rateLimit: { key: "auth:forgot", limit: 5, windowSeconds: 60 },
  handler: async ({ body }) => {
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://snapy-events.vercel.app"}/reset-password`,
    })
    if (error) return fail("AUTH_ERROR", error.message, 400)
    return ok({ sent: true })
  },
}).POST
