// src/lib/analytics/track.ts
// Fire-and-forget analytics ingestion. Writes to the analytics_events table
// and (optionally) to a Sentry breadcrumb.

import { createServiceClient } from "@/lib/supabase/server"
import type { NextRequest } from "next/server"
import { getClientIp } from "@/lib/security/client-ip"

export interface TrackEventInput {
  user_id?: string
  event_type: string
  event_data?: Record<string, unknown>
  session_id?: string | null
  request?: NextRequest
}

export async function trackEvent(input: TrackEventInput) {
  try {
    const supabase = await createServiceClient()
    const ip = input.request ? getClientIp(input.request.headers) : null
    const ua = input.request?.headers.get("user-agent") ?? null
    await supabase.from("analytics_events").insert({
      user_id: input.user_id,
      event_type: input.event_type,
      event_data: input.event_data ?? {},
      session_id: input.session_id ?? null,
      ip_address: ip,
      user_agent: ua,
    })
  } catch (e) {
    console.error("[analytics] failed to track", e)
  }
}
