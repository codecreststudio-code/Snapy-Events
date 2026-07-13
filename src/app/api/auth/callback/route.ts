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
        .select("id, full_name, email")
        .eq("id", userId)
        .single()

      if (profile) {
        const svc = await createServiceClient()
        const { data: sub } = await svc
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .limit(1)

        if (!sub || sub.length === 0) {
          await svc
            .from("users")
            .update({ role: "owner", permissions: ["*"] })
            .eq("id", userId)

          await svc
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan_id: "free",
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: null,
            })
        }
      }
    }
  }

  // Redirect back to the dashboard or original destination
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}
