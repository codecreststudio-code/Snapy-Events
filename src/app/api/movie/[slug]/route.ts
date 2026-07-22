// src/app/api/movie/[slug]/route.ts
//
// Public, unauthenticated read for the "Share" link surfaced inside the
// Slideshow card (src/app/movie/[slug]/page.tsx). This used to serve the
// Recap Video ("Share Movie"); that feature was removed at the host's
// request, and Share was folded into Slideshow instead of staying its own
// card. The folder/route path still says "movie" — this environment blocks
// renaming/deleting files on the mounted repo folder, so the URL couldn't be
// moved to something like /slideshow/[slug] without leaving orphaned dead
// routes behind. Functionally this now serves the event's active slideshow.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { resolveTrackUrl } from "@/lib/integrations/slideshow-music"
import { API_RATE_LIMITS } from "@/lib/constants"

const paramsSchema = z.object({ slug: z.string().min(1) })

export const GET = defineRoute<unknown, unknown, { slug: string }>({
  method: "GET",
  requireAuth: false,
  // Public, unauthenticated — was previously unrated, unlike its sibling
  // public routes.
  rateLimit: { key: "movie:get", limit: API_RATE_LIMITS.PUBLIC_DEFAULT, windowSeconds: 60 },
  handler: async ({ params }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid slug", 422)

    const supabase = await createServiceClient()
    const { data: event, error } = await supabase
      .from("events")
      .select("id, name, slug, cover_image_url, status")
      .eq("slug", parsedParams.data.slug)
      .neq("status", "draft")
      .maybeSingle()

    if (error || !event) return fail("NOT_FOUND", "This memory couldn't be found", 404)

    const { data: slideshow } = await supabase
      .from("slideshows")
      .select("id, photo_ids, transition, interval_seconds, show_brand, music_track")
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let photos: { id: string; storage_path: string; thumbnail_path: string | null }[] = []
    if (slideshow?.photo_ids && (slideshow.photo_ids as string[]).length > 0) {
      const { data: photoRows } = await supabase
        .from("photos")
        .select("id, storage_path, thumbnail_path")
        .in("id", slideshow.photo_ids as string[])
      const photoMap = new Map((photoRows ?? []).map((p) => [p.id, p]))
      photos = (slideshow.photo_ids as string[])
        .map((id) => photoMap.get(id))
        .filter((p): p is { id: string; storage_path: string; thumbnail_path: string | null } => !!p)
    }

    return ok({
      eventName: event.name,
      slug: event.slug,
      coverImageUrl: event.cover_image_url,
      slideshow: slideshow
        ? {
            intervalSeconds: slideshow.interval_seconds as number,
            musicTrackUrl: resolveTrackUrl(slideshow.music_track as string | null),
            photos,
          }
        : null,
    })
  },
}).GET
