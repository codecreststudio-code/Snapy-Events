// src/app/api/auth/callback/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      const userId = data.user.id
      
      // Check if user already has an user_id associated in public.users
      const { data: profile } = await supabase
        .from("users")
        .select("user_id, full_name, email")
        .eq("id", userId)
        .single()

      if (profile && !profile.user_id) {
        const svc = await createServiceClient()
        
        // Automatically create a default organization for new OAuth users
        const userEmail = profile.email || data.user.email || ""
        const fullName = profile.full_name || userEmail.split("@")[0] || "User"
        const orgName = `${fullName}'s Workspace`
        const orgSlug = `${slugify(orgName)}-${Date.now().toString(36).slice(-4)}`

        const { data: org, error: orgError } = await svc
          .from("organizations")
          .insert({
            name: orgName,
            slug: orgSlug,
            plan: "free",
          })
          .select()
          .single()

        if (!orgError && org) {
          await svc
            .from("users")
            .update({
              user_id: data.user.id,
              role: "owner",
              permissions: ["*"],
            })
            .eq("id", userId)
        }
      }
    }
  }

  // Redirect back to the dashboard or original destination
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}
