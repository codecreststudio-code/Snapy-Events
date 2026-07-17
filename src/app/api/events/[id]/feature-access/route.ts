// src/app/api/events/[id]/feature-access/route.ts
//
// Advisory, read-only precheck for plan-gated event features. Lets the host
// dashboard (src/app/dashboard/events/[slug]/page.tsx) know up front whether
// Recap Video / AI Smart Clusters / Download All are allowed on this event's
// plan, so it can render a calm disabled state with an "upgrade" tag instead
// of letting the host click into a 403 from the actual action route.
//
// This does NOT replace server-side enforcement — recap/generate,
// ai/faces/batch-process, and download-zip each still run their own
// checkEventFeatureAccess() gate independently (defense in depth). This
// route only exists so the client can ask "would this be allowed?" without
// triggering the real (potentially expensive/long-running) action first.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { checkEventFeatureAccess, type FeatureGateResult } from "@/lib/plans/feature-gate"

const paramsSchema = z.object({ id: z.string().uuid() })

const GATED_FEATURES = ["recap_video", "ai_face_search", "print_ready_downloads"] as const

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
