import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { API_RATE_LIMITS } from "@/lib/constants"
import { getPlanLimits } from "@/lib/plans/plan-limits"

export const GET = defineRoute({
  method: "GET",
  requireAuth: false,
  // Public, unauthenticated, does a handful of DB reads per call — was
  // previously unrated, unlike its sibling public routes.
  rateLimit: { key: "events:public-info", limit: API_RATE_LIMITS.PUBLIC_DEFAULT, windowSeconds: 60 },
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const slug = url.searchParams.get("slug")
    if (!slug) return fail("VALIDATION_ERROR", "Slug is required", 400)

    const supabase = await createServiceClient()

    const { data: event, error } = await supabase
      .from("events")
      .select("id, name, slug, settings, host_id, end_date, status")
      .eq("slug", slug)
      // A `draft` event (unpaid/pending-payment, see /api/events POST) has
      // no legitimate guest-facing use — matches gallery/qr/countdown/join,
      // which already gate on status === "published".
      .eq("status", "published")
      .maybeSingle()

    if (error || !event) return fail("NOT_FOUND", "Event not found", 404)

    const eventSettings = (event.settings as Record<string, any>) || {}

    // settings.guest_count_plan is what the wizard writes at event creation
    // (present from creation, paid or not) and is this EVENT's own plan tier
    // — not the host's account-wide `subscriptions` row, which is a single
    // row overwritten by whichever event the host most recently paid for.
    // This route used to key off `subscriptions` exclusively, meaning event
    // A could display event B's guest/shot limits just because B was the
    // host's most recent purchase. Mirrors the same precedence already
    // established in src/lib/plans/feature-gate.ts.
    let planId = "free"
    if (typeof eventSettings.guest_count_plan === "string" && eventSettings.guest_count_plan) {
      planId = eventSettings.guest_count_plan
    } else if (typeof eventSettings.plan_tier === "string" && eventSettings.plan_tier) {
      planId = eventSettings.plan_tier
    } else if (event.host_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", event.host_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sub?.plan_id) planId = sub.plan_id
    }

    // Resolves planId against the LIVE plans table, falling back to the
    // platform's actual current "free" plan (not a hardcoded, drift-prone
    // guess) if planId was renamed/deleted since this event was created —
    // see src/lib/plans/plan-limits.ts.
    const { limits: planLimits, planId: resolvedPlanId } = await getPlanLimits(supabase, planId)
    planId = resolvedPlanId

    // Guest/shot boosts purchased at checkout are written onto THIS event's
    // own settings (see verify/route.ts, checkout-free/route.ts, and the
    // Razorpay webhook) — not onto the host's account-wide
    // `users.preferences`, which used to be read here instead via a
    // `host:users(preferences)` join. That bucket never reset per event, so
    // a boost bought for one event permanently inflated the limits shown
    // for every other event the same host created.
    const guestBoost = eventSettings.guests_boost || 0
    const shotsBoost = eventSettings.shots_boost || 0

    const baseGuestLimit = planLimits.guests_limit ?? planLimits.guest_limit ?? 5
    const baseShotLimit = planLimits.shots_limit ?? planLimits.shot_limit ?? 5

    const maxGuests = baseGuestLimit + guestBoost
    const hostPhotoLimit = typeof (event.settings as any)?.photo_limit === "number" ? (event.settings as any).photo_limit : null
    const effectiveMaxShots = hostPhotoLimit && hostPhotoLimit > 0
      ? Math.min(baseShotLimit + shotsBoost, hostPhotoLimit)
      : (baseShotLimit + shotsBoost)


    // Project ONLY public-safe fields. The raw `event` row carries settings,
    // host_id, and host.preferences — never expose those to anonymous callers.
    return ok({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        end_date: event.end_date,
        status: event.status,
        content_types: (event.settings as any)?.content_types || { photos: true, videos: true, voice_notes: true, messages: true },
        ai_features: (event.settings as any)?.ai_features || {},
      },
      plan_id: planId,
      max_guests: maxGuests,
      max_shots: effectiveMaxShots,
    })

  },
}).GET
