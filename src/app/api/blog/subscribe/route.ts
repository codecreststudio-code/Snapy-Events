import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { API_RATE_LIMITS } from "@/lib/constants"

const subscribeSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().optional().nullable(),
})

export const POST = defineRoute({
  method: "POST",
  body: subscribeSchema,
  // Public, unauthenticated upsert — previously unrated, so it could be
  // hammered to spam-flood blog_subscribers with junk emails.
  rateLimit: { key: "blog:subscribe", limit: API_RATE_LIMITS.NEWSLETTER_SUBSCRIBE, windowSeconds: 60 },
  handler: async ({ body }) => {
    const { email, name } = body
    // Service-role client, not the RLS-bound anon client: blog_subscribers'
    // only public policy is "FOR INSERT WITH CHECK (true)" — there's no
    // public UPDATE policy (only the admin-only "manage subscribers" one).
    // An upsert with onConflict compiles to INSERT ... ON CONFLICT DO
    // UPDATE, and Postgres RLS checks the UPDATE policy for the conflict
    // path — so every anonymous visitor re-subscribing (or just resubmitting
    // the footer form with an email already on file) hit "new row violates
    // row-level security policy for table blog_subscribers" (42501) instead
    // of silently reactivating/updating their row. This is a legitimate,
    // validated (zod email), rate-limited public write — same pattern as
    // notifications' server-side inserts in 0039_notification_infrastructure.sql
    // — so bypassing RLS here via the service client is intentional, not a
    // security gap.
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from("blog_subscribers")
      .upsert(
        { 
          email: email.toLowerCase().trim(), 
          name: name ?? null, 
          status: "active",
          source: "footer"
        },
        { onConflict: "email" }
      )
      .select()
      .single()

    if (error) {
      console.error("[blog/subscribe] POST DB Error:", error.message)
      return fail("DB_ERROR", "Failed to subscribe", 500)
    }

    return ok({ message: "Successfully subscribed", data })
  }
}).POST

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from("blog_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false })

    if (error) {
      console.error("[blog/subscribe] GET DB Error:", error.message)
      return fail("DB_ERROR", "Failed to fetch subscribers", 500)
    }

    return ok({ subscribers: data ?? [] })
  }
}).GET
