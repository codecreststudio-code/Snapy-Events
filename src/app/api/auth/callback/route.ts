// src/app/api/auth/callback/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils"

// Open-redirect guard: `next` must be a same-site relative path. Without
// this, `${requestUrl.origin}${next}` with e.g. next="@evil.com/phishing"
// produces "https://snapsy-events.vercel.app@evil.com/phishing" — browsers
// treat everything before the "@" as discarded userinfo and navigate to
// evil.com, using this app's own trusted OAuth callback link as phishing
// bait. Requiring a single leading "/" (not "//", which is a
// protocol-relative off-site redirect) keeps any "@" safely inside the
// path component instead of the authority.
function safeNextPath(next: string | null): string {
  if (next && /^\/(?!\/)[^\s\\@]*$/.test(next)) return next
  return "/dashboard"
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = safeNextPath(requestUrl.searchParams.get("next"))

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
