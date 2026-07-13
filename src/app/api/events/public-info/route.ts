import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"

const PLAN_DEFAULT_LIMITS: Record<string, { guests: number; shots: number }> = {
  free: { guests: 5, shots: 5 },
  starter: { guests: 10, shots: 10 },
  standard: { guests: 50, shots: 15 },
  premium: { guests: 100, shots: 25 },
}

export const GET = defineRoute({
  method: "GET",
  requireAuth: false,
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const slug = url.searchParams.get("slug")
    if (!slug) return fail("VALIDATION_ERROR", "Slug is required", 400)

    const supabase = await createServiceClient()

    const { data: event, error } = await supabase
      .from("events")
      .select("id, name, slug, settings, host_id, end_date, status, host:users(preferences)")
      .eq("slug", slug)
      .neq("status", "archived")
      .maybeSingle()

    if (error || !event) return fail("NOT_FOUND", "Event not found", 404)

    let planId = "free"
    if (event.host_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", event.host_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sub?.plan_id) planId = sub.plan_id
    }

    const { data: planData } = await supabase.from("plans").select("limits").eq("id", planId).maybeSingle()
    const planLimits = planData?.limits || {}
    const fallback = PLAN_DEFAULT_LIMITS[planId] || PLAN_DEFAULT_LIMITS.free

    const hostPrefs = (event.host as any)?.preferences || {}
    const guestBoost = hostPrefs.guest_boost || 0
    const shotsBoost = hostPrefs.shots_boost || 0

    const baseGuestLimit = planLimits.guests_limit ?? planLimits.guest_limit ?? fallback.guests
    const baseShotLimit = planLimits.shots_limit ?? planLimits.shot_limit ?? fallback.shots

    const maxGuests = baseGuestLimit + guestBoost
    const maxShots = baseShotLimit + shotsBoost

    // Optional: return current guest-shot counts for quota checks
    const guestEmail = url.searchParams.get("guest_email")
    const guestName = url.searchParams.get("guest_name")
    let currentInfo: { current_guests: number; current_shots: number } | undefined

    if (guestEmail || guestName) {
      const { data: allPhotos } = await supabase
        .from("photos")
        .select("uploader_email, uploader_name")
        .eq("event_id", event.id)

      if (allPhotos) {
        const uniqueGuests = new Set(
          allPhotos
            .map((p) => (p.uploader_email ?? p.uploader_name ?? "").toLowerCase())
            .filter(Boolean)
        )

        const identifier = (guestEmail ?? guestName ?? "").toLowerCase()
        const currentShots = allPhotos.filter(
          (p) =>
            p.uploader_email?.toLowerCase() === identifier ||
            p.uploader_name?.toLowerCase() === identifier
        ).length

        currentInfo = {
          current_guests: uniqueGuests.size,
          current_shots: currentShots,
        }
      }
    }

    return ok({
      event,
      plan_id: planId,
      max_guests: maxGuests,
      max_shots: maxShots,
      ...(currentInfo && currentInfo),
    })
  },
}).GET
