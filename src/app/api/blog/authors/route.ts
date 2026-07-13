import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const authorSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  bio: z.string().optional(),
  avatar_url: z.string().optional(),
  twitter_url: z.string().optional(),
  linkedin_url: z.string().optional(),
  website_url: z.string().optional(),
})

export const GET = defineRoute({
  method: "GET",
  handler: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("blog_authors")
      .select("id, name, slug, bio, avatar_url, twitter_url, linkedin_url, website_url, post_count")
      .order("name")
    if (error) return fail("DB_ERROR", "Failed to fetch authors", 500)
    return ok({ authors: data ?? [] })
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: authorSchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("blog_authors")
      .insert({
        ...body,
        avatar_url: body.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(body.name)}&background=7c3aed&color=fff&size=200`,
      })
      .select()
      .single()
    if (error) return fail("DB_ERROR", "Failed to create author", 500)
    return created({ author: data })
  },
}).POST
