// src/app/api/events/[id]/memories/movie/photos/route.ts
//
// Photo selection for the client-rendered Movie — reuses the same scored
// highlight-photo picker as Slideshow (getScoredPhotos in memories.ts), but
// deliberately does NOT touch the `slideshows` table the way
// memories/slideshow/route.ts's POST does. Movie and Slideshow are
// independent features that both happen to want "the best N photos, sized
// to a chosen duration" — persisting a slideshow row as a side effect of
// generating a movie would silently overwrite whatever slideshow the host
// already had active, which would be a confusing surprise.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { getScoredPhotos } from "@/lib/integrations/memories"

const paramsSchema = z.object({ id: z.string().uuid() })
const querySchema = z.object({
  duration_seconds: z.coerce.number().int().min(10).max(300).default(60),
})

const SECONDS_PER_PHOTO = 4
const MIN_PHOTOS = 3
const MAX_PHOTOS = 60

export const GET = defineRoute<unknown, z.infer<typeof querySchema>, { id: string }>({
  method: "GET",
  query: querySchema,
  requireAuth: true,
  handler: async ({ params, query, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const { data: eventRow, error } = await supabase.from("events").select("id, host_id").eq("id", eventId).single()
    if (error || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const photoCount = Math.max(MIN_PHOTOS, Math.min(MAX_PHOTOS, Math.round(query.duration_seconds / SECONDS_PER_PHOTO)))
    const scored = await getScoredPhotos(supabase, eventId, photoCount)

    if (scored.length === 0) {
      return fail("NO_PHOTOS", "No approved photos are available yet to build a movie", 409)
    }

    return ok({ photos: scored.map((p) => ({ id: p.id, storage_path: p.storage_path })) })
  },
}).GET
