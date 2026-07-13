import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { defineRoute, ok, fail } from "@/lib/api/handler"

const listQuerySchema = z.object({
  status: z.enum(["draft", "published", "archived", "all"]).optional(),
  category: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  excerpt: z.string().max(1000).optional().nullable(),
  content: z.string().max(500_000).optional().nullable(),
  cover_image_url: z.string().url().max(2048).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  category_id: z.string().uuid().optional().nullable(),
  author_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(100)).max(20).default([]),
  seo_title: z.string().max(160).optional().nullable(),
  seo_description: z.string().max(300).optional().nullable(),
  is_featured: z.boolean().default(false),
  is_trending: z.boolean().default(false),
  read_time_minutes: z.number().int().min(1).max(120).default(5),
  published_at: z.string().datetime().optional().nullable(),
})

export const GET = defineRoute({
  method: "GET",
  query: listQuerySchema,
  handler: async ({ query }) => {
    const supabase = await createClient()
    const { status, category, search, page, limit } = query
    const offset = (page - 1) * limit

    let q = supabase
      .from("blog_posts")
      .select(
        `id, title, slug, excerpt, cover_image_url, status,
        is_featured, is_trending, view_count, read_time_minutes,
        published_at, created_at, updated_at,
        author:blog_authors(id, name, slug, avatar_url, bio),
        category:blog_categories(id, name, slug, emoji, color)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== "all") q = q.eq("status", status)
    if (category) q = q.eq("category_id", category)
    if (search) q = q.ilike("title", `%${search}%`)

    const { data, error, count } = await q
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ posts: data ?? [], total: count ?? 0, page, limit })
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: createPostSchema,
  requireAuth: true,
  rateLimit: { key: "blog:post:create", limit: 20, windowSeconds: 3600 },
  handler: async ({ body, auth }) => {
    const supabase = await createClient()
    const { data: profile } = await supabase.from("users").select("is_admin, role").eq("id", auth.user!.id).single()
    if (!profile?.is_admin && profile?.role !== "owner") {
      return fail("FORBIDDEN", "Admin access required to create blog posts", 403)
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        ...body,
        published_at: body.status === "published" ? (body.published_at || new Date().toISOString()) : null,
      })
      .select(`id, title, slug, status, created_at, author:blog_authors(id, name, slug), category:blog_categories(id, name, slug, emoji, color)`)
      .single()

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ post: data })
  },
}).POST
