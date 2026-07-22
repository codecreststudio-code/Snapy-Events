// src/lib/plans/plan-limits.ts
//
// Fixes: an event's settings.guest_count_plan (or, in a couple of places,
// settings.plan_tier / the account's `subscriptions` row) is a plain plan
// id string, resolved against the live `plans` table at read time. If an
// admin later renames or deletes that plan id in Admin > Plan Builder,
// every existing event still carrying the old id had its entitlements
// silently collapse — three separate call sites (photos/upload/route.ts,
// feature-gate.ts, events/public-info/route.ts) each hardcoded their own
// slightly-different low "free tier" numbers as the fallback, so an admin
// renaming "standard" to "pro" would, without anyone noticing, downgrade
// every event still tagged "standard" to a hardcoded 5-guest/5-shot/1GB
// ceiling that had no connection to what the live Free plan actually
// offers, and the three fallback objects could (and did) drift out of sync
// with each other.
//
// getPlanLimits() replaces all three: on an unresolvable plan id, it falls
// back to whatever the live `plans` table's "free" row currently says
// (reflecting real admin configuration, not a stale hardcoded guess), and
// only drops to a hardcoded constant if the `plans` table has no "free" row
// at all (e.g. a fresh DB before 0004_seed_plans.sql has ever run).

export interface ResolvedPlanLimits {
  /** The plan id actually used to resolve limits — may differ from the requested id if it had to fall back. */
  planId: string
  limits: Record<string, any>
  /** True if the requested plan id didn't exist in the live `plans` table and this fell back to the platform default. */
  fellBack: boolean
}

// Last-resort safety net — only used if the `plans` table itself has no
// "free" row to fall back to. Deliberately the most conservative (lowest)
// entitlement in the product so an unresolvable plan id never accidentally
// grants MORE than intended, only ever less.
export const HARDCODED_SAFETY_NET_LIMITS: Record<string, any> = {
  guests_limit: 5,
  shots_limit: 5,
  storage_limit_gb: 1,
  events_limit: 1,
  photo_limit: 100,
}

const DEFAULT_FALLBACK_PLAN_ID = "free"

/**
 * Resolves a plan id to its live `limits` JSONB, falling back to the
 * platform's default ("free") plan — not a hardcoded guess — if the id
 * doesn't exist (renamed or deleted since it was assigned to an event).
 */
export async function getPlanLimits(supabase: any, planId: string | null | undefined): Promise<ResolvedPlanLimits> {
  const requestedId = planId || DEFAULT_FALLBACK_PLAN_ID

  const { data: planRecord } = await supabase
    .from("plans")
    .select("limits")
    .eq("id", requestedId)
    .maybeSingle()

  if (planRecord?.limits) {
    return { planId: requestedId, limits: planRecord.limits as Record<string, any>, fellBack: false }
  }

  // Requested id doesn't exist (or has no limits set) — fall back to the
  // platform's actual current default plan rather than a hardcoded guess.
  if (requestedId !== DEFAULT_FALLBACK_PLAN_ID) {
    const { data: fallbackRecord } = await supabase
      .from("plans")
      .select("limits")
      .eq("id", DEFAULT_FALLBACK_PLAN_ID)
      .maybeSingle()
    if (fallbackRecord?.limits) {
      console.warn(`[plan-limits] Plan id "${requestedId}" not found in live plans table — falling back to "${DEFAULT_FALLBACK_PLAN_ID}" plan limits. This plan id was likely renamed or deleted in Admin > Plan Builder while events still reference it.`)
      return { planId: DEFAULT_FALLBACK_PLAN_ID, limits: fallbackRecord.limits as Record<string, any>, fellBack: true }
    }
  }

  console.warn(`[plan-limits] Neither "${requestedId}" nor the default "${DEFAULT_FALLBACK_PLAN_ID}" plan exist in the live plans table — using hardcoded safety-net limits.`)
  return { planId: DEFAULT_FALLBACK_PLAN_ID, limits: HARDCODED_SAFETY_NET_LIMITS, fellBack: true }
}
