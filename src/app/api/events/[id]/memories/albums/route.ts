// src/app/api/events/[id]/memories/albums/route.ts
//
// "Smart Albums" — Snapsy Memories feature backing the Step 8 wizard's
// aiSmartAlbums toggle (settings.ai_features.smart_albums), which was
// previously cosmetic (saved, never read). GET-only, computed on the fly
// from photo timestamps — no new table, same "no queue/cron infra" approach
// as Auto Collage/Slideshow.
//
// Clustering is deliberately simple: approved photos ordered by created_at,
// a new album starts whenever the gap since the previous photo exceeds
// ALBUM_GAP_MINUTES. This groups "moments" (arrival, cake cutting, dancing,
// etc.) by upload cadence — a real signal for a live event where guests
// upload in bursts around whatever's happening — without needing any scene
// classification model.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { publicUrl } from "@/lib/integrations/storage"

const paramsSchema = z.object({ id: z.string().uuid() })

const ALBUM_GAP_MINUTES = 45

interface AlbumPhotoRow {
  id: string
  storage_path: string
  thumbnail_path: string | null
  mime_type: string | null
  created_at: string
}

export interface SmartAlbum {
  key: string
  label: string
  startsAt: string
  endsAt: string
  photoCount: number
  photos: (AlbumPhotoRow & { url: string })[]
}

export function clusterIntoAlbums(photos: AlbumPhotoRow[]): SmartAlbum[] {
  if (photos.length === 0) return []

  const sorted = [...photos].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const groups: AlbumPhotoRow[][] = []
  let current: AlbumPhotoRow[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const gapMs = new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()
    if (gapMs > ALBUM_GAP_MINUTES * 60 * 1000) {
      groups.push(current)
      current = [sorted[i]]
    } else {
      current.push(sorted[i])
    }
  }
  groups.push(current)

  return groups.map((g, idx) => {
    const startsAt = g[0].created_at
    const endsAt = g[g.length - 1].created_at
    const startLabel = new Date(startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    return {
      key: `moment-${idx + 1}`,
      label: `Moment ${idx + 1} · ${startLabel}`,
      startsAt,
      endsAt,
      photoCount: g.length,
      photos: g.map((p) => ({ ...p, url: publicUrl("PHOTOS", p.storage_path) })).reverse(), // newest-first within the moment
    }
  }).reverse() // most recent moment first
}

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createServiceClient>>, eventId: string, userId: string) {
  const { data: eventRow, error } = await supabase.from("events").select("id, host_id").eq("id", eventId).single()
  if (error || !eventRow) return { ok: false as const, response: fail("NOT_FOUND", "Event not found", 404) }
  if (eventRow.host_id !== userId) {
    return { ok: false as const, response: fail("FORBIDDEN", "You don't have access to this event", 403) }
  }
  return { ok: true as const }
}

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const ownership = await verifyOwnership(supabase, eventId, auth.user!.id)
    if (!ownership.ok) return ownership.response

    const { data, error } = await supabase
      .from("photos")
      .select("id, storage_path, thumbnail_path, mime_type, created_at")
      .eq("event_id", eventId)
      .neq("is_approved", false)
      .ilike("mime_type", "image/%")
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) {
      logger.error("memories/albums: query failed", { eventId, error: error.message })
      return ok({ albums: [] })
    }

    const albums = clusterIntoAlbums((data ?? []) as AlbumPhotoRow[])
    return ok({ albums })
  },
}).GET
