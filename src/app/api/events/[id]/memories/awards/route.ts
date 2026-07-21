// src/app/api/events/[id]/memories/awards/route.ts
//
// "Guest Awards" — Snapsy Memories feature. Pure SQL aggregation over the
// existing photos table (see get_guest_awards in
// supabase/migrations/0028_snapsy_memories.sql), no AI/model calls. Uses the
// service-role client (like recap/generate/route.ts) since the RPC function
// is only granted to service_role, then manually verifies event ownership —
// the same pattern used there, since this bypasses RLS.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

const paramsSchema = z.object({ id: z.string().uuid() })

interface GuestAwardRow {
  guest_name: string
  photo_count: number
  video_count: number
  voice_note_count: number
  reaction_total: number
  night_owl_uploads: number
  first_upload_at: string | null
  last_upload_at: string | null
}

export interface GuestAward {
  key: string
  emoji: string
  title: string
  guestName: string
  value: number
}

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, host_id")
      .eq("id", eventId)
      .single()

    if (eventErr || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const { data, error } = await supabase.rpc("get_guest_awards", { p_event_id: eventId })
    if (error) {
      logger.error("memories/awards: get_guest_awards failed", { eventId, error: error.message })
      return ok({ awards: [], guestCount: 0 })
    }

    const rows = (data as GuestAwardRow[] | null) ?? []
    if (rows.length === 0) return ok({ awards: [], guestCount: 0 })

    const awards: GuestAward[] = []

    const topPhotographer = [...rows].sort((a, b) => b.photo_count - a.photo_count)[0]
    if (topPhotographer.photo_count > 0) {
      awards.push({ key: "top_photographer", emoji: "🏆", title: "Top Photographer", guestName: topPhotographer.guest_name, value: topPhotographer.photo_count })
    }

    const topVideographer = [...rows].sort((a, b) => b.video_count - a.video_count)[0]
    if (topVideographer.video_count > 0) {
      awards.push({ key: "top_videographer", emoji: "🎥", title: "Top Videographer", guestName: topVideographer.guest_name, value: topVideographer.video_count })
    }

    const mostLoved = [...rows].sort((a, b) => b.reaction_total - a.reaction_total)[0]
    if (mostLoved.reaction_total > 0) {
      awards.push({ key: "most_loved", emoji: "❤️", title: "Most Loved", guestName: mostLoved.guest_name, value: mostLoved.reaction_total })
    }

    const mostActive = [...rows].sort(
      (a, b) => b.photo_count + b.video_count + b.voice_note_count - (a.photo_count + a.video_count + a.voice_note_count),
    )[0]
    awards.push({
      key: "most_active",
      emoji: "🔥",
      title: "Most Active",
      guestName: mostActive.guest_name,
      value: mostActive.photo_count + mostActive.video_count + mostActive.voice_note_count,
    })

    const firstUpload = rows
      .filter((r) => r.first_upload_at)
      .sort((a, b) => new Date(a.first_upload_at!).getTime() - new Date(b.first_upload_at!).getTime())[0]
    if (firstUpload) {
      awards.push({ key: "first_upload", emoji: "📷", title: "First Upload", guestName: firstUpload.guest_name, value: 1 })
    }

    const nightOwl = [...rows].sort((a, b) => b.night_owl_uploads - a.night_owl_uploads)[0]
    if (nightOwl.night_owl_uploads > 0) {
      awards.push({ key: "night_owl", emoji: "😊", title: "Night Owl", guestName: nightOwl.guest_name, value: nightOwl.night_owl_uploads })
    }

    return ok({ awards, guestCount: rows.length })
  },
}).GET
