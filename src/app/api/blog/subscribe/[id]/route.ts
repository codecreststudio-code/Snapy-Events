import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const updateSchema = z.object({
  status: z.enum(["active", "unsubscribed", "bounced"]).optional(),
  name: z.string().optional().nullable(),
})

export const PATCH = defineRoute({
  method: "PATCH",
  requireAuth: "admin",
  body: updateSchema,
  handler: async ({ body, params }) => {
    const { id } = params as { id: string }
    const supabase = await createClient()

    const { status, name } = body
    const updates: Record<string, any> = {}
    if (status !== undefined) {
      updates.status = status
      if (status === "unsubscribed") {
        updates.unsubscribed_at = new Date().toISOString()
      } else {
        updates.unsubscribed_at = null
      }
    }
    if (name !== undefined) {
      updates.name = name
    }

    const { data, error } = await supabase
      .from("blog_subscribers")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[blog/subscribe] PATCH DB Error:", error.message)
      return fail("DB_ERROR", "Failed to update subscriber", 500)
    }

    return ok({ subscriber: data })
  }
}).PATCH

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: "admin",
  handler: async ({ params }) => {
    const { id } = params as { id: string }
    const supabase = await createClient()

    const { error } = await supabase
      .from("blog_subscribers")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[blog/subscribe] DELETE DB Error:", error.message)
      return fail("DB_ERROR", "Failed to delete subscriber", 500)
    }

    return ok({ success: true })
  }
}).DELETE
