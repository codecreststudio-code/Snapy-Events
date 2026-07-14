import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"

const bodySchema = z.object({
  emoji: z.enum(["heart", "fire", "party", "clap", "adore"]).optional(),
  comment: z.string().trim().max(500).optional(),
  author_name: z.string().trim().max(100).optional(),
})

export const POST = defineRoute({
  method: "POST",
  body: bodySchema,
  requireAuth: false,
  handler: async ({ params, body }) => {

    const { id } = params
    const supabase = await createServiceClient()

    const { data: photo, error } = await supabase
      .from("photos")
      .select("id, metadata")
      .eq("id", id)
      .maybeSingle()

    if (error || !photo) {
      return fail("NOT_FOUND", "Photo not found", 404)
    }

    const currentMetadata = (photo.metadata as Record<string, any>) || {}
    const currentReactions = (currentMetadata.reactions as Record<string, number>) || {
      heart: 0,
      fire: 0,
      party: 0,
      clap: 0,
      adore: 0,
    }
    const currentComments = (currentMetadata.comments as Array<{
      id: string
      author_name: string
      comment: string
      created_at: string
    }>) || []

    if (body.emoji) {
      currentReactions[body.emoji] = (currentReactions[body.emoji] || 0) + 1
    }

    if (body.comment) {
      const newComment = {
        id: crypto.randomUUID(),
        author_name: body.author_name?.trim() || "Guest",
        comment: body.comment.trim(),
        created_at: new Date().toISOString(),
      }
      currentComments.unshift(newComment)
    }

    const updatedMetadata = {
      ...currentMetadata,
      reactions: currentReactions,
      comments: currentComments,
    }

    const { error: updateErr } = await supabase
      .from("photos")
      .update({ metadata: updatedMetadata })
      .eq("id", id)

    if (updateErr) {
      return fail("DB_ERROR", "Failed to save reaction/comment", 500)
    }

    return ok({
      reactions: currentReactions,
      comments: currentComments,
    })
  },
}).POST
