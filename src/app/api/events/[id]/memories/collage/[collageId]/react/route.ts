// src/app/api/events/[id]/memories/collage/[collageId]/react/route.ts
//
// Emoji reactions on a generated Auto Collage — host-only (collages are a
// private dashboard preview, not guest-facing content), used by the
// MemoryViewer's reaction bar. Mirrors the ownership-check pattern used by
// the sibling collage routes; the atomic update itself lives in
// increment_collage_reaction() (0035_collage_reactions.sql), the same
// pattern as the guest-facing increment_photo_reaction() RPC.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"

const paramsSchema = z.object({ id: z.string().uuid(), collageId: z.string().uuid() })
const bodySchema = z.object({ emoji: z.string().min(1).max(32) })
const KNOWN_EMOJI = new Set(["heart", "fire", "party", "clap", "adore"])

export const POST = defineRoute<{ emoji: string }, unknown, { id: string; collageId: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  handler: async ({ body, params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid ID", 422)
    if (!KNOWN_EMOJI.has(body.emoji)) return fail("VALIDATION_ERROR", "Unknown reaction", 422)
    const { id: eventId, collageId } = parsedParams.data

    const supabase = await createServiceClient()

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, host_id")
      .eq("id", eventId)
      .single()
    if (eventErr || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const { data: collage, error: collageErr } = await supabase
      .from("event_collages")
      .select("id")
      .eq("id", collageId)
      .eq("event_id", eventId)
      .maybeSingle()
    if (collageErr || !collage) return fail("NOT_FOUND", "Collage not found", 404)

    const { data: reactions, error } = await supabase.rpc("increment_collage_reaction", {
      p_collage_id: collageId,
      p_emoji: body.emoji,
    })
    if (error) return fail("DB_ERROR", `Failed to save reaction: ${error.message}`, 500)

    return ok({ reactions })
  },
}).POST
