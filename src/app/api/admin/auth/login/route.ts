import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const body = z.object({ email: z.string().email(), password: z.string().min(8) })

export const POST = defineRoute({
  method: "POST",
  body,
  rateLimit: { key: "admin:login", limit: 5, windowSeconds: 60 },
  handler: async ({ body }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword(body)
    if (error || !data.user) return fail("AUTH_ERROR", "Invalid credentials", 401)
    // Confirm platform admin
    const { data: profile } = await supabase.from("users").select("is_admin, role").eq("id", data.user.id).single()
    if (!profile?.is_admin && profile?.role !== "owner") return fail("FORBIDDEN", "Not a platform admin", 403)
    return created({ user: { id: data.user.id, email: data.user.email } })
  },
}).POST
