// src/app/api/cron/stories/route.ts
//
// "Memory Stories" — Snapsy Memories feature. Runs daily via Vercel Cron
// (see vercel.json's `crons` entry) and finds events whose event_date hit a
// 30/365/730-day anniversary today, creating an event_stories row for each
// — no AI, just a date comparison. Idempotent: event_stories has a
// UNIQUE(event_id, milestone_days) constraint, so re-running this on the
// same day (or a retried invocation) never creates duplicates.
//
// Not built on defineRoute() — this isn't a user-session request, it's
// triggered by Vercel's scheduler, authenticated via the standard
// `Authorization: Bearer $CRON_SECRET` header Vercel Cron sends when
// CRON_SECRET is set (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
// Requires CRON_SECRET to be configured — refuses to run without it rather
// than silently allowing unauthenticated triggers.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { isMemoriesEnabled, getScoredPhotos } from "@/lib/integrations/memories"
import { logger } from "@/lib/logger"

const MILESTONES: { days: number; label: string }[] = [
  { days: 30, label: "One Month Ago" },
  { days: 365, label: "One Year Ago" },
  { days: 730, label: "Two Years Ago" },
]

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    logger.error("cron/stories: CRON_SECRET is not configured — refusing to run")
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServiceClient()
  let created = 0
  let skippedDisabled = 0
  const errors: string[] = []

  for (const milestone of MILESTONES) {
    const target = new Date()
    target.setUTCDate(target.getUTCDate() - milestone.days)
    const dayStart = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0))
    const dayEnd = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999))

    const { data: events, error } = await supabase
      .from("events")
      .select("id, name, settings, event_date")
      .neq("status", "draft")
      .gte("event_date", dayStart.toISOString())
      .lte("event_date", dayEnd.toISOString())

    if (error) {
      logger.error("cron/stories: events query failed", { milestone: milestone.days, error: error.message })
      errors.push(`${milestone.days}d: ${error.message}`)
      continue
    }

    for (const event of events ?? []) {
      if (!isMemoriesEnabled(event.settings as Record<string, unknown>)) {
        skippedDisabled++
        continue
      }

      const coverCandidates = await getScoredPhotos(supabase, event.id, 1)
      const coverPhotoId = coverCandidates[0]?.id ?? null

      const { error: upsertErr, data: upserted } = await supabase
        .from("event_stories")
        .upsert(
          {
            event_id: event.id,
            milestone_days: milestone.days,
            title: `${event.name} — ${milestone.label}`,
            cover_photo_id: coverPhotoId,
          },
          { onConflict: "event_id,milestone_days", ignoreDuplicates: true },
        )
        .select("id")

      if (upsertErr) {
        logger.error("cron/stories: upsert failed", { eventId: event.id, milestone: milestone.days, error: upsertErr.message })
        errors.push(`${event.id}/${milestone.days}d: ${upsertErr.message}`)
        continue
      }
      if (upserted && upserted.length > 0) created++
    }
  }

  return NextResponse.json({ success: true, created, skippedDisabled, errors })
}
