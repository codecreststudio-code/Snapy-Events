// src/app/api/cron/memories-finalize/route.ts
//
// Runs on a schedule via Vercel Cron (see vercel.json's `crons` entry) and
// finalizes Snapsy Memories for any event that has finished — status is
// "completed", OR its end_date has passed, OR its guest-facing
// settings.countdown_date has passed (whichever happens first — see
// isEventReadyForMemoriesFinalization in memories-automation.ts). Finishing
// triggers: one frozen Guest Awards snapshot, one Auto Collage, and two (or
// three, for larger events — see memories-automation.ts) Slideshows.
//
// Same auth/shape as the existing src/app/api/cron/stories/route.ts: not
// built on defineRoute() since this isn't a user-session request, just the
// standard Authorization: Bearer $CRON_SECRET header Vercel Cron sends.
// Idempotent via settings.memories_finalized_at — safe to re-run or retry.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { finalizeEventMemories, isEventReadyForMemoriesFinalization, type EligibleEventRow } from "@/lib/integrations/memories-automation"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    logger.error("cron/memories-finalize: CRON_SECRET is not configured — refusing to run")
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Draft events can't be "over" yet (never published), archived events are
  // an explicit host action separate from natural completion — everything
  // else is a candidate, narrowed further in-memory below since the
  // eligibility rule mixes a top-level column with JSONB settings.
  const { data: events, error } = await supabase
    .from("events")
    .select("id, host_id, status, event_date, end_date, settings")
    .not("status", "in", "(draft,archived)")

  if (error) {
    logger.error("cron/memories-finalize: events query failed", { error: error.message })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  let finalized = 0
  let skipped = 0
  let notReady = 0
  const errors: string[] = []

  for (const event of (events ?? []) as EligibleEventRow[]) {
    if (!isEventReadyForMemoriesFinalization(event)) {
      notReady++
      continue
    }

    try {
      const result = await finalizeEventMemories(supabase, event)
      if (result.skipped) {
        skipped++
      } else {
        finalized++
      }
    } catch (err) {
      logger.error("cron/memories-finalize: finalization threw", { eventId: event.id, error: String(err) })
      errors.push(`${event.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ success: true, finalized, skipped, notReady, errors })
}
