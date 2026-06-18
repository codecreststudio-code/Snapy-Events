import { type NextRequest, NextResponse } from "next/server"
import { defineRoute, fail } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const POST = defineRoute({
  method: "POST",
  body: loginBody,
  rateLimit: { key: "auth:login", limit: 10, windowSeconds: 60 },
  handler: async ({ body }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword(body)
    if (error || !data.user) return fail("AUTH_ERROR", error?.message ?? "Invalid credentials", 401)
    return NextResponse.json({ success: true, data: { user: { id: data.user.id, email: data.user.email } } })
  },
}).POST
