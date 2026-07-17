// src/lib/feature-flags.ts
// Resolves whether a feature flag is on for a given organization.
// Flags are stored on the organization row under `feature_flags` (JSONB) and
// can also be overridden at the platform level via env / a future admin toggle.

import type { AuthContext } from "@/lib/auth/session"
import { FEATURE_FLAGS } from "@/lib/constants"

type FlagKey = keyof typeof FEATURE_FLAGS | string

export function isEnabled(ctx: AuthContext | null, flag: FlagKey): boolean {
  if (!ctx) return false
  return Boolean((ctx.user as any)?.settings?.[flag])
}

export function isPhaseEnabled(phase: "payments" | "ai" | "premium" | "enterprise" | "whatsapp"): boolean {
  switch (phase) {
    case "payments":
      return process.env.NEXT_PUBLIC_FEATURE_PAYMENTS !== "false"
    case "ai":
      return process.env.NEXT_PUBLIC_FEATURE_AI !== "false"
    case "premium":
      return process.env.NEXT_PUBLIC_FEATURE_PREMIUM !== "false"
    case "enterprise":
      return process.env.NEXT_PUBLIC_FEATURE_ENTERPRISE !== "false"
    case "whatsapp":
      return process.env.NEXT_PUBLIC_FEATURE_WHATSAPP !== "false"
  }
}

export function defaultOrgFlags(plan: string): Record<string, boolean> {
  const base: Record<string, boolean> = {
    [FEATURE_FLAGS.PAYMENTS_ENABLED]: true,
    [FEATURE_FLAGS.AI_FACE_SEARCH]: false,
    [FEATURE_FLAGS.PREMIUM_FEATURES]: false,
    [FEATURE_FLAGS.ENTERPRISE_SCALE]: false,
    [FEATURE_FLAGS.WHATSAPP_NOTIFICATIONS]: false,
    [FEATURE_FLAGS.LIVE_PHOTO_WALL]: false,
    [FEATURE_FLAGS.SLIDESHOW_MODE]: false,
    [FEATURE_FLAGS.WATERMARKING]: false,
    [FEATURE_FLAGS.CUSTOM_DOMAINS]: false,
    [FEATURE_FLAGS.WHITE_LABEL]: false,
  }
  if (plan === "premium" || plan === "standard") {
    base[FEATURE_FLAGS.AI_FACE_SEARCH] = true
    base[FEATURE_FLAGS.PREMIUM_FEATURES] = true
    base[FEATURE_FLAGS.LIVE_PHOTO_WALL] = true
    base[FEATURE_FLAGS.SLIDESHOW_MODE] = true
    base[FEATURE_FLAGS.WATERMARKING] = true
  }
  if (plan === "premium") {
    base[FEATURE_FLAGS.ENTERPRISE_SCALE] = true
    base[FEATURE_FLAGS.CUSTOM_DOMAINS] = true
    base[FEATURE_FLAGS.WHITE_LABEL] = true
  }
  return base
}
