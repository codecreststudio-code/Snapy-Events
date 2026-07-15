import "server-only"
import { createServiceClient } from "@/lib/supabase/server"

export interface PlatformFeatureFlags {
  payments_enabled: boolean
  ai_search_enabled: boolean
  live_wall_enabled: boolean
  watermark_enabled: boolean
  white_label_enabled: boolean
  premium_templates_enabled: boolean
  beta_photobooks_enabled: boolean
  advanced_analytics_enabled: boolean
}

const DEFAULT_FLAGS: PlatformFeatureFlags = {
  payments_enabled: true,
  ai_search_enabled: true,
  live_wall_enabled: true,
  watermark_enabled: false,
  white_label_enabled: false,
  premium_templates_enabled: true,
  beta_photobooks_enabled: false,
  advanced_analytics_enabled: true,
}

/**
 * Reads the platform-wide feature-flag toggles set in Admin > Settings /
 * Admin > Feature Flags (both write to the same `platform_settings` row,
 * key = "feature_flags"). Uses the service client because `platform_settings`
 * RLS restricts reads to platform admins — this needs to be readable from
 * routes acting on behalf of a regular host/guest, e.g. checkout.
 *
 * Missing keys fall back to the same defaults the admin UI itself uses, so a
 * flag nobody has touched yet behaves as "on" (or "off", for the ones that
 * default off) rather than as a hard failure.
 */
export async function getFeatureFlags(): Promise<PlatformFeatureFlags> {
  try {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "feature_flags")
      .maybeSingle()

    const stored = (data?.value as Partial<PlatformFeatureFlags>) || {}
    return { ...DEFAULT_FLAGS, ...stored }
  } catch (err) {
    console.error("[platform-settings] Failed to load feature flags, using defaults:", err)
    return DEFAULT_FLAGS
  }
}
