import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get("status") || null
  const category = searchParams.get("category") || null
  const search = searchParams.get("search") || null
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const offset = (page - 1) * limit

  let query = supabase
    .from("blog_posts")
    .select(
      `
      id, title, slug, excerpt, cover_image_url, status,
      is_featured, is_trending, view_count, read_time_minutes,
      published_at, created_at, updated_at,
      author:blog_authors(id, name, slug, avatar_url, bio),
      category:blog_categories(id, name, slug, emoji, color)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== "all") query = query.eq("status", status)
  if (category) query = query.eq("category_id", category)
  if (search) query = query.ilike("title", `%${search}%`)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Check admin auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const {
    title, slug, excerpt, content, cover_image_url,
    status, category_id, author_id, tags,
    seo_title, seo_description, is_featured, is_trending,
    read_time_minutes, published_at
  } = body

  if (!title || !slug) {
    return NextResponse.json({ error: "Title and slug are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title,
      slug,
      excerpt: excerpt || null,
      content: content || "",
      cover_image_url: cover_image_url || null,
      status: status || "draft",
      category_id: category_id || null,
      author_id: author_id || null,
      tags: tags || [],
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      is_featured: is_featured || false,
      is_trending: is_trending || false,
      read_time_minutes: read_time_minutes || 5,
      published_at: status === "published" ? (published_at || new Date().toISOString()) : null,
    })
    .select(`
      id, title, slug, status, created_at,
      author:blog_authors(id, name, slug),
      category:blog_categories(id, name, slug, emoji, color)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data }, { status: 201 })
}
