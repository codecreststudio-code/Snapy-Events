// src/app/api/events/[id]/feature-access/route.ts
//
// Advisory, read-only precheck for plan-gated event features. Lets the host
// dashboard (src/app/dashboard/events/[slug]/page.tsx) know up front whether
// Download All is allowed on this event's plan, so it can render a calm
// disabled state with an "upgrade" tag instead of letting the host click
// into a 403 from the actual action route.
//
// Recap Video and AI Smart Clusters used to be gated here too, but both
// features were removed from the dashboard entirely (Recap Video kept
// failing in production and wasn't wanted; AI Smart Clusters' underlying
// face detection already runs automatically on upload via
// detectAndStoreFaces() in photos/upload/route.ts, so the manual "batch
// re-scan" button added nothing guests couldn't already get from
// /api/ai/faces/search).
//
// This does NOT replace server-side enforcement — download-zip still runs
// its own checkEventFeatureAccess() gate independently (defense in depth).
// This route only exists so the client can ask "would this be allowed?"
// without triggering the real (potentially expensive) action first.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { checkEventFeatureAccess, type FeatureGateResult } from "@/lib/plans/feature-gate"

const paramsSchema = z.object({ id: z.string().uuid() })

const GATED_FEATURES = ["print_ready_downloads"] as const

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, host_id")
      .eq("id", eventId)
      .single()

    if (eventErr || !event) return fail("NOT_FOUND", "Event not found", 404)
    if (event.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const results = await Promise.all(
      GATED_FEATURES.map((key) => checkEventFeatureAccess(eventId, key))
    )

    const data = GATED_FEATURES.reduce((acc, key, idx) => {
      acc[key] = results[idx]
      return acc
    }, {} as Record<(typeof GATED_FEATURES)[number], FeatureGateResult>)

    return ok(data)
  },
}).GET
