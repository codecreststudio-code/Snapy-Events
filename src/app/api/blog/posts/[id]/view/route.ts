import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Fetch current view count
  const { data: post, error: fetchError } = await supabase
    .from("blog_posts")
    .select("view_count")
    .eq("id", id)
    .single()

  if (fetchError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Safely increment view count
  const { data, error: updateError } = await supabase
    .from("blog_posts")
    .update({ view_count: (post.view_count ?? 0) + 1 })
    .eq("id", id)
    .select("id, view_count")
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, view_count: data?.view_count })
}
