import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("blog_authors")
    .select("id, name, slug, bio, avatar_url, twitter_url, linkedin_url, website_url, post_count")
    .order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ authors: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, slug, bio, avatar_url, twitter_url, linkedin_url, website_url } = body

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("blog_authors")
    .insert({
      name,
      slug,
      bio: bio || null,
      avatar_url: avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c3aed&color=fff&size=200`,
      twitter_url: twitter_url || null,
      linkedin_url: linkedin_url || null,
      website_url: website_url || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ author: data }, { status: 201 })
}
