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

    // Check nested content_types toggles
    const contentTypes = (eventSettings.content_types as Record<string, boolean>) || {}
    if (featureKey === "video_uploads" && contentTypes.videos === false) {
      return { allowed: false, planId: "free", reason: "Video uploads are disabled for this event in event settings." }
    }
    if (featureKey === "voice_notes" && contentTypes.voice_notes === false) {
      return { allowed: false, planId: "free", reason: "Voice notes are disabled for this event in event settings." }
    }
    if (featureKey === "photos" && contentTypes.photos === false) {
      return { allowed: false, planId: "free", reason: "Photo uploads are disabled for this event in event settings." }
    }

    // Check nested ai_features toggles
    const aiFeatures = (eventSettings.ai_features as Record<string, boolean>) || {}
    if (featureKey === "ai_face_search" && aiFeatures.face_search === false) {
      return { allowed: false, planId: "free", reason: "AI Face Search is disabled for this event in event settings." }
    }


    // 2. Fetch Active Subscription Plan by Host User ID
    let planId = "free"
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
    if (["ai_face_search", "live_photo_wall", "print_ready_downloads", "whatsapp_alerts", "priority_support"].includes(featureKey)) {
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
      if (org?.plan) planId = org.plan
    }

    const { data: planRecord } = await supabase
      .from("plans")
      .select("limits")
      .eq("id", planId)
      .maybeSingle()

    const limits = (planRecord?.limits as Record<string, any>) || {}

    if (limits[featureKey] !== undefined) {
      const isAllowed = Boolean(limits[featureKey])
      return {
        allowed: isAllowed,
        planId,
        reason: isAllowed ? undefined : `Feature '${featureKey}' requires upgrading your plan.`,
      }
    }

    if (["ai_face_search", "live_photo_wall", "video_uploads", "voice_notes", "print_ready_downloads", "whatsapp_alerts", "priority_support"].includes(featureKey)) {
      const isPaid = planId !== "free"
      return { allowed: isPaid, planId }
    }

    return { allowed: true, planId }
  } catch (err) {
    return { allowed: true, planId: "free" }
  }
}
