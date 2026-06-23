import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from("blog_posts")
    .select(`
      *,
      author:blog_authors(id, name, slug, avatar_url, bio, twitter_url, linkedin_url),
      category:blog_categories(id, name, slug, emoji, color)
    `)
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  return NextResponse.json({ post: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  const allowed = [
    "title", "slug", "excerpt", "content", "cover_image_url",
    "status", "category_id", "author_id", "tags",
    "seo_title", "seo_description", "og_title", "og_description", "og_image_url",
    "is_featured", "is_trending", "read_time_minutes", "published_at", "scheduled_at"
  ]

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Auto-set published_at when publishing for the first time
  if (body.status === "published" && !body.published_at) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("published_at")
      .eq("id", id)
      .single()
    if (!existing?.published_at) {
      updates.published_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select(`
      id, title, slug, status, updated_at,
      author:blog_authors(id, name, slug),
      category:blog_categories(id, name, slug, emoji, color)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase.from("blog_posts").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
