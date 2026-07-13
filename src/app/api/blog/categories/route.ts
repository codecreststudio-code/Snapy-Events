import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  emoji: z.string().optional(),
  color: z.string().optional(),
})

export const GET = defineRoute({
  method: "GET",
  handler: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("blog_categories")
      .select("id, name, slug, description, emoji, color, post_count")
      .order("name")
    if (error) return fail("DB_ERROR", "Failed to fetch categories", 500)
    return ok({ categories: data ?? [] })
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: categorySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("blog_categories")
      .insert(body)
      .select()
      .single()
    if (error) return fail("DB_ERROR", "Failed to create category", 500)
    return created({ category: data })
  },
}).POST
