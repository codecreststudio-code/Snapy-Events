// src/app/api/photos/[id]/tags/route.ts
//
// Receives client-computed Auto Categorization tags (see
// src/lib/integrations/auto-tag-client.ts) for a single photo. Mirrors the
// auth pattern in /api/ai/faces/index/route.ts — no server-side session
// exists for guest callers (requireAuth: false is required so a checked-in
// guest can hit this anonymously right after their own upload), so the
// event's check-in cookie (or the host's real session) is the actual gate.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { hasGuestSessionFromRequest, isEventHost } from "@/lib/security/guest-session"

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  tags: z.array(z.string().min(1).max(30)).max(10),
})

export const POST = defineRoute<{ tags: string[] }, unknown, { id: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: false,
  handler: async ({ body, params, request }) => {
    const parsed = paramsSchema.safeParse(params)
    if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid photo ID", 422)
    const photoId = parsed.data.id

    const supabase = await createServiceClient()
    const { data: photo, error } = await supabase
      .from("photos")
      .select("id, event_id, event:events(host_id)")
      .eq("id", photoId)
      .single()

    if (error || !photo) return fail("NOT_FOUND", "Photo not found", 404)

    const eventRel = photo.event as { host_id: string } | { host_id: string }[] | null
    const hostId = (Array.isArray(eventRel) ? eventRel[0] : eventRel)?.host_id
    const isHost = await isEventHost(hostId)

    if (!isHost && !hasGuestSessionFromRequest(request, photo.event_id)) {
      return fail("FORBIDDEN", "Not authorized to tag this photo", 403)
    }

    const { error: updateErr } = await supabase.from("photos").update({ tags: body.tags }).eq("id", photoId)
    if (updateErr) return fail("DB_ERROR", updateErr.message, 500)

    return ok({ tags: body.tags })
  },
}).POST
