import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

export const POST = defineRoute<unknown, unknown, { id: string }>({
  method: "POST",
  handler: async ({ params }) => {
    const supabase = await createClient()
    const { data: post, error: fetchError } = await supabase
      .from("blog_posts")
      .select("view_count")
      .eq("id", params.id)
      .single()
    if (fetchError || !post) return fail("NOT_FOUND", "Post not found", 404)
    const { data, error: updateError } = await supabase
      .from("blog_posts")
      .update({ view_count: (post.view_count ?? 0) + 1 })
      .eq("id", params.id)
      .select("id, view_count")
      .single()
    if (updateError || !data) return fail("DB_ERROR", "Failed to update view count", 500)
    return ok({ success: true, view_count: data.view_count })
  },
}).POST
