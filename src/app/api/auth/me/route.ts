import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, fail } from "@/lib/api/handler"
import { getAuthContext } from "@/lib/auth/session"

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session) return fail("AUTH_ERROR", error?.message ?? "No session", 401)
  return ok({ session: data.session })
}

export async function GET() {
  const ctx = await getAuthContext()
  return ok({ user: ctx.user, organization: ctx.organization, role: ctx.role, permissions: ctx.permissions })
}
