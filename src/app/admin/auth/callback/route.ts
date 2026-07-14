import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_code`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error("[admin/auth/callback] OAuth exchange error:", error.message)
    return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`)
  }

  // Verify the signed-in user is actually a platform admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/admin/login?error=no_user`)
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    // Sign them out immediately — not an admin
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/admin/login?error=not_admin`)
  }

  return NextResponse.redirect(`${origin}/admin`)
}
