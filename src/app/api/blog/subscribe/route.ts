import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
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
    const supabase = await createClient()

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
    const supabase = await createClient()
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
