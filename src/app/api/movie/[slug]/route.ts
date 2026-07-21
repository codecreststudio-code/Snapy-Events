// src/app/api/movie/[slug]/route.ts
//
// Public, unauthenticated read for the "Shareable Movie" page
// (src/app/movie/[slug]/page.tsx) — mirrors the public-info route's
// project-only-safe-fields pattern (src/app/api/events/public-info/route.ts).
// Never exposes settings, host_id, or anything beyond what's needed to
// play/share the highlight movie.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"

const paramsSchema = z.object({ slug: z.string().min(1) })

export const GET = defineRoute<unknown, unknown, { slug: string }>({
  method: "GET",
  requireAuth: false,
  handler: async ({ params }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid slug", 422)

    const supabase = await createServiceClient()
    const { data: event, error } = await supabase
      .from("events")
      .select("id, name, slug, cover_image_url, settings, status")
      .eq("slug", parsedParams.data.slug)
      .neq("status", "draft")
      .maybeSingle()

    if (error || !event) return fail("NOT_FOUND", "This memory couldn't be found", 404)

    const recap = (event.settings as Record<string, any> | null)?.recap_video

    return ok({
      eventName: event.name,
      slug: event.slug,
      coverImageUrl: event.cover_image_url,
      movie: recap?.status === "ready" ? { videoUrl: recap.video_url, mood: recap.mood, generatedAt: recap.generated_at } : null,
    })
  },
}).GET
