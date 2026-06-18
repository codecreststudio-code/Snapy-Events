import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, fail, ok } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const body = z.object({ password: z.string().min(8) })

export const POST = defineRoute({
  method: "POST",
  body,
  rateLimit: { key: "auth:reset", limit: 5, windowSeconds: 60 },
  handler: async ({ body }) => {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password: body.password })
    if (error) return fail("AUTH_ERROR", error.message, 400)
    return ok({ updated: true })
  },
}).POST
