import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description, emoji, color, post_count")
    .order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ categories: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, slug, description, emoji, color } = body

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("blog_categories")
    .insert({ name, slug, description, emoji, color })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: data }, { status: 201 })
}
