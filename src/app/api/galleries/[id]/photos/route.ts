import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { hasGuestSessionFromRequest, isEventHost } from "@/lib/security/guest-session"
import { pickBestShots } from "@/lib/integrations/quality-score"

const params = z.object({ id: z.string().uuid() })
const query = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  approved: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
})

export const GET = defineRoute<unknown, z.infer<typeof query>, { id: string }>({
  method: "GET",
  query,
  requireAuth: false,
  handler: async ({ params, query, auth, request }) => {
    const { id } = params
    const supabase = await createClient()
    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id, reveal_enabled, reveal_at")
      .eq("id", id)
      .single()
    if (!gallery) return fail("NOT_FOUND", "Gallery not found", 404)

    const { data: event } = await supabase
      .from("events")
      .select("host_id, status, settings")
      .eq("id", gallery.event_id)
      .single()

    if (!event || event.status === "archived") return fail("NOT_FOUND", "Event not found", 404)

    const isHost = (auth?.user?.id && event.host_id === auth.user.id) || (await isEventHost(event.host_id))

    // Same check-in gate as uploads/reactions (src/lib/security/guest-session.ts)
    // — this route isn't currently linked from any page (the main event page
    // fetches photos inline, already gated on checkedIn), but it's still a
    // live, directly-callable API that returns real guest photo listings, so
    // it must enforce the same gate rather than relying on obscurity.
    if (!isHost && !hasGuestSessionFromRequest(request, gallery.event_id)) {
      return fail("FORBIDDEN", "Please check in to this event to view its photos.", 403)
    }

    // If not host, enforce reveal settings & approval rules
    if (!isHost) {
      const eventSettings = (event.settings || {}) as any
      const isInstantReveal = eventSettings.photo_reveal_mode === "instant" || eventSettings.reveal_type === "instant" || !eventSettings.enable_countdown
      const isCountdownExpired = eventSettings.countdown_date && new Date(eventSettings.countdown_date) <= new Date()

      const isGalleryRevealed = !gallery.reveal_enabled || (gallery.reveal_at && new Date(gallery.reveal_at) <= new Date())

      if (!isInstantReveal && !isCountdownExpired && !isGalleryRevealed) {
        return ok([], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: 0 }) })
      }
    }

    let q = supabase.from("photos").select("*", { count: "exact" }).eq("gallery_id", id).order("created_at", { ascending: false })

    const aiFeatures = ((event.settings as any)?.ai_features as Record<string, boolean>) || {}

    if (!isHost) {
      // For guests, show approved photos or default auto-approved photos
      q = q.neq("is_approved", false)
      // Smart Duplicate Detection — same behavior as the main event page's
      // inline query (src/app/event/[slug]/page.tsx); hosts still see
      // everything, guests get near-duplicate burst shots collapsed out.
      if (aiFeatures.duplicate_detection === true) {
        q = q.eq("is_duplicate", false)
      }
    } else {
      if (query.approved !== undefined) q = q.eq("is_approved", query.approved)
    }

    if (query.featured !== undefined) q = q.eq("is_featured", query.featured)
    const from = (query.page - 1) * query.pageSize
    q = q.range(from, from + query.pageSize - 1)
    const { data, count, error } = await q
    if (error) return fail("DB_ERROR", error.message, 500)

    const bestShotIds = aiFeatures.best_shot === true
      ? pickBestShots((data ?? []).map((p: any) => ({
          id: p.id,
          blurScore: p.blur_score,
          brightnessScore: p.brightness_score,
          smileScore: p.smile_score,
        })))
      : new Set<string>()
    const withBestShot = (data ?? []).map((p: any) => ({ ...p, is_best_shot: bestShotIds.has(p.id) }))

    return ok(withBestShot, { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
