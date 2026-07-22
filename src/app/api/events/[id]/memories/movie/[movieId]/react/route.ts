// src/app/api/events/[id]/memories/movie/[movieId]/react/route.ts
//
// Emoji reactions on a generated Movie — host-only, same pattern as the
// collage reactions route (memories/collage/[collageId]/react/route.ts) and
// the same atomic RPC shape (increment_movie_reaction, 0036_event_movies.sql).

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"

const paramsSchema = z.object({ id: z.string().uuid(), movieId: z.string().uuid() })
const bodySchema = z.object({ emoji: z.string().min(1).max(32) })
const KNOWN_EMOJI = new Set(["heart", "fire", "party", "clap", "adore"])

export const POST = defineRoute<{ emoji: string }, unknown, { id: string; movieId: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  handler: async ({ body, params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid ID", 422)
    if (!KNOWN_EMOJI.has(body.emoji)) return fail("VALIDATION_ERROR", "Unknown reaction", 422)
    const { id: eventId, movieId } = parsedParams.data

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

    const { data: movie, error: movieErr } = await supabase
      .from("event_movies")
      .select("id")
      .eq("id", movieId)
      .eq("event_id", eventId)
      .maybeSingle()
    if (movieErr || !movie) return fail("NOT_FOUND", "Movie not found", 404)

    const { data: reactions, error } = await supabase.rpc("increment_movie_reaction", {
      p_movie_id: movieId,
      p_emoji: body.emoji,
    })
    if (error) return fail("DB_ERROR", `Failed to save reaction: ${error.message}`, 500)

    return ok({ reactions })
  },
}).POST
