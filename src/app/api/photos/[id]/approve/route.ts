import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const params = z.object({ id: z.string().uuid() })
const body = z.object({ approved: z.boolean().optional(), featured: z.boolean().optional() })

export const POST = defineRoute({
  method: "POST",
  body,
  requireAuth: true,
  audit: "photo.moderated",
  handler: async ({ params, body }) => {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("photos")
      .update({ is_approved: body.approved, is_featured: body.featured })
      .eq("id", id)
      .select()
      .single()
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
