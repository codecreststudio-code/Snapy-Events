import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const subscribeSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().optional().nullable(),
})

export const POST = defineRoute({
  method: "POST",
  body: subscribeSchema,
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
