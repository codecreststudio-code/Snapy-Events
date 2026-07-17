import { createServiceClient } from "@/lib/supabase/server"

export interface FeatureGateResult {
  allowed: boolean
  planId: string
  reason?: string
}

/**
 * Validates whether a specific feature toggle (e.g. 'ai_face_search', 'video_uploads')
 * is enabled for an event based on its host organization's subscription plan.
 */
export async function checkEventFeatureAccess(
  eventId: string,
  featureKey: string
): Promise<FeatureGateResult> {
  try {
    const supabase = await createServiceClient()

    // 1. Fetch Event & Host ID
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("host_id, settings")
      .eq("id", eventId)
      .single()

    if (eventErr || !event) {
      return { allowed: false, planId: "free", reason: "Event not found" }
    }

    // Host override check (if host explicitly turned off feature in event settings)
    const eventSettings = (event.settings as Record<string, any>) || {}
    if (eventSettings[featureKey] === false) {
      return { allowed: false, planId: "free", reason: "Feature disabled in event settings" }
    }

    // 2. Determine this EVENT's own plan tier. Snapy Events charges per
    // event, not as an ongoing account subscription (fixed earlier — see
    // calculatePrice()/verify/checkout-free route comments) — so the
    // authoritative entitlement lives on the event itself
    // (settings.plan_tier, set at successful checkout), not on a
    // user-scoped `subscriptions` row. That table is a single row per host
    // and gets overwritten by whichever event the host most recently paid
    // for, so keying off it here silently misattributed plan tier to every
    // OTHER event that same host owns (e.g. a free test event would
    // inherit "premium" from a later purchase, or vice versa). Only fall
    // back to `subscriptions` for events created before `plan_tier` started
    // being persisted on settings.
    let planId = "free"
    if (typeof eventSettings.plan_tier === "string" && eventSettings.plan_tier) {
      planId = eventSettings.plan_tier
    } else {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", event.host_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      if (sub?.plan_id) {
        planId = sub.plan_id
      }
    }

    // Check nested content_types toggles. An explicit true/false is honored
    // either way — it reflects what the host actually selected in the event
    // wizard (and, for anything above the plan's own included tier, what
    // they were charged for at checkout; see PLAN_BASE_PHOTO_LIMITS /
    // VIDEO_UNLOCK_ADDON_PRICE / VOICE_UNLOCK_ADDON_PRICE in
    // src/lib/constants). Only when content_types is missing entirely
    // (older events created before this was persisted, or any path that
    // bypassed the wizard) do we fall back to the plan's own tier — NOT to
    // "allowed", which previously let any plan get video/voice uploads for
    // free whenever content_types hadn't been saved.
    const contentTypes = (eventSettings.content_types as Record<string, boolean>) || {}
    if (featureKey === "photos" && contentTypes.photos === false) {
      return { allowed: false, planId, reason: "Photo uploads are disabled for this event in event settings." }
    }
    if (featureKey === "video_uploads") {
      if (contentTypes.videos === false) {
        return { allowed: false, planId, reason: "Video uploads are disabled for this event in event settings." }
      }
      if (contentTypes.videos !== true) {
        const planIncludesVideo = planId === "standard" || planId === "premium"
        return {
          allowed: planIncludesVideo,
          planId,
          reason: planIncludesVideo ? undefined : "Videos are not included in this event's plan.",
        }
      }
    }
    if (featureKey === "voice_notes") {
      if (contentTypes.voice_notes === false) {
        return { allowed: false, planId, reason: "Voice notes are disabled for this event in event settings." }
      }
      if (contentTypes.voice_notes !== true) {
        const planIncludesVoice = planId === "premium"
        return {
          allowed: planIncludesVoice,
          planId,
          reason: planIncludesVoice ? undefined : "Voice notes are a Premium-only feature.",
        }
      }
    }

    // Check nested ai_features toggles
    const aiFeatures = (eventSettings.ai_features as Record<string, boolean>) || {}
    if (featureKey === "ai_face_search" && aiFeatures.face_search === false) {
      return { allowed: false, planId, reason: "AI Face Search is disabled for this event in event settings." }
    }

    // 3. Fetch Plan Limits & Toggles
    const { data: planRecord } = await supabase
      .from("plans")
      .select("limits, features")
      .eq("id", planId)
      .maybeSingle()

    const limits = (planRecord?.limits as Record<string, any>) || {}

    // Check if explicitly set in plan limits
    if (limits[featureKey] !== undefined) {
      const isAllowed = Boolean(limits[featureKey])
      return {
        allowed: isAllowed,
        planId,
        reason: isAllowed ? undefined : `Feature '${featureKey}' is not included in your ${planId} plan.`,
      }
    }

    // Default Fallback Rules based on Plan Tier
    // NOTE: video_uploads and voice_notes are controlled by event content_types settings (checked above).
    // Only block premium AI features when host has no paid plan.
    if (["ai_face_search", "live_photo_wall", "print_ready_downloads", "whatsapp_alerts", "priority_support", "recap_video"].includes(featureKey)) {
      const isPaid = planId !== "free"
      return {
        allowed: isPaid,
        planId,
        reason: isPaid ? undefined : `Feature '${featureKey}' requires a paid plan.`,
      }
    }

    // video_uploads and voice_notes: allowed if event settings permit (already checked above)
    return { allowed: true, planId }
  } catch (err: any) {
    console.error(`[feature-gate] Error checking '${featureKey}' for event ${eventId}:`, err)
    return { allowed: true, planId: "free" }
  }
}

/**
 * Validates feature access directly by Organization ID (for host-level actions)
 */
export async function checkOrgFeatureAccess(
  orgId: string,
  featureKey: string
): Promise<FeatureGateResult> {
  try {
    const supabase = await createServiceClient()

    let planId = "free"
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .or(`organization_id.eq.${orgId},user_id.eq.${orgId}`)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (sub?.plan_id) {
      planId = sub.plan_id
    } else {
      const { data: org } = await supabase
        .from("organizations")
        .select("plan")
        .eq("id", orgId)
        .maybeSingle()
      if (org?.plan) planId = or