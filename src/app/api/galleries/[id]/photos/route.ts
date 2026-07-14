import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

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
  handler: async ({ params, query, auth }) => {
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

    const isHost = auth?.user?.id && event.host_id === auth.user.id

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

    if (!isHost) {
      // For guests, show approved photos or default auto-approved photos
      q = q.neq("is_approved", false)
    } else {
      if (query.approved !== undefined) q = q.eq("is_approved", query.approved)
    }

    if (query.featured !== undefined) q = q.eq("is_featured", query.featured)
    const from = (query.page - 1) * query.pageSize
    q = q.range(from, from + query.pageSize - 1)
    const { data, count, error } = await q
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET
