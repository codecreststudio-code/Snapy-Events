import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const updatePostSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  cover_image_url: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  category_id: z.string().optional(),
  author_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image_url: z.string().optional(),
  is_featured: z.boolean().optional(),
  is_trending: z.boolean().optional(),
  read_time_minutes: z.number().optional(),
  published_at: z.string().optional(),
  scheduled_at: z.string().optional(),
})

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  handler: async ({ params }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:blog_authors(id, name, slug, avatar_url, bio, twitter_url, linkedin_url),
        category:blog_categories(id, name, slug, emoji, color)
      `)
      .eq("id", params.id)
      .single()
    if (error || !data) return fail("NOT_FOUND", "Post not found", 404)
    return ok({ post: data })
  },
}).GET

export const PATCH = defineRoute<z.infer<typeof updatePostSchema>, unknown, { id: string }>({
  method: "PATCH",
  body: updatePostSchema,
  requireAuth: true,
  handler: async ({ body, params, auth }) => {
    const supabase = await createClient()
    const { data: profile } = await supabase.from("users").select("is_admin, role").eq("id", auth.user!.id).single()
    if (!profile?.is_admin && profile?.role !== "owner") {
      return fail("FORBIDDEN", "Admin access required to edit blog posts", 403)
    }
    const updates: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    }
    if (body.status === "published" && !body.published_at) {
      const { data: existing } = await supabase
        .from("blog_posts")
        .select("published_at")
        .eq("id", params.id)
        .single()
      if (!existing?.published_at) {
        updates.published_at = new Date().toISOString()
      }
    }
    const { data, error } = await supabase
      .from("blog_posts")
      .update(updates)
      .eq("id", params.id)
      .select(`
        id, title, slug, status, updated_at,
        author:blog_authors(id, name, slug),
        category:blog_categories(id, name, slug, emoji, color)
      `)
      .single()
    if (error || !data) return fail("DB_ERROR", "Failed to update post", 500)
    return ok({ post: data })
  },
}).PATCH

export const DELETE = defineRoute<unknown, unknown, { id: string }>({
  method: "DELETE",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const supabase = await createClient()
    const { data: profile } = await supabase.from("users").select("is_admin, role").eq("id", auth.user!.id).single()
    if (!profile?.is_admin && profile?.role !== "owner") {
      return fail("FORBIDDEN", "Admin access required to delete blog posts", 403)
    }
    const { error } = await supabase.from("blog_posts").delete().eq("id", params.id)
    if (error) return fail("DB_ERROR", "Failed to delete post", 500)
    return ok({ success: true })
  },
}).DELETE
