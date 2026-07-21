// src/lib/integrations/memories-automation.ts
//
// Event-completion automation for Snapsy Memories. Once an event is over —
// either its status is flipped to "completed" by the host, or its countdown
// / end date has simply passed (whichever happens first) — this finalizes
// the event's memories in one pass:
//
//   1. Guest Awards — frozen snapshot (see deriveGuestAwards in memories.ts)
//      so late/stray uploads after the event can't change who "won".
//   2. Auto Collage — one collage of 4-5 of the event's best photos.
//   3. Slideshow — two slideshows, one ~30s and one ~60s, always both.
//
// Scaling for long/large events (host explicitly asked me to design this
// part): a bigger approved-photo pool means there's enough genuinely
// distinct content to justify more than the bare minimum, so:
//   - Auto Collage steps up from a 4-photo grid to a denser 9-photo grid
//     once the event has DENSE_COLLAGE_PHOTO_THRESHOLD+ approved photos.
//   - A bonus third slideshow (3 minutes — the `duration_seconds` schema on
//     the manual Slideshow route already allows 180 as a literal, just no
//     manual UI exposes it yet) is added once the event has
//     EXTENDED_SLIDESHOW_PHOTO_THRESHOLD+ approved photos, so a big wedding
//     or multi-day event gets a longer cut instead of the same 60s recap as
//     a small dinner party.
//   - Each slideshow gets a different music track (rotated from
//     SLIDESHOW_TRACKS) so the 30s/60s/180s cuts don't sound identical.
//
// Idempotent: writes settings.memories_finalized_at once complete, and
// refuses to run again for an event that already has it — see
// isEventReadyForMemoriesFinalization + the guard at the top of
// finalizeEventMemories. Called from src/app/api/cron/memories-finalize/route.ts.

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"
import { getScoredPhotos, getGuestAwardRows, deriveGuestAwards, isMemoriesEnabled, type GuestAward } from "./memories"
import { COLLAGE_LAYOUTS, composeCollage, downloadPhotoBuffer, uploadCollage, type CollageLayout } from "./collage"
import { SLIDESHOW_TRACKS } from "./slideshow-music"

export interface EligibleEventRow {
  id: string
  host_id: string
  status: string
  event_date: string | null
  end_date: string | null
  settings: Record<string, unknown> | null
}

export interface MemoriesFinalizationOutcome {
  eventId: string
  skipped: boolean
  reason?: string
  guestAwardsCount?: number
  collageId?: string | null
  slideshowIds?: string[]
}

const SECONDS_PER_PHOTO = 4
const MIN_PHOTOS = 3
const MAX_PHOTOS = 60
const DENSE_COLLAGE_PHOTO_THRESHOLD = 30
const EXTENDED_SLIDESHOW_PHOTO_THRESHOLD = 60

// Whether an event is "over" for the purposes of this automation — status
// flipped to completed, OR the top-level end_date has passed, OR the
// guest-facing settings.countdown_date has passed. Any one of the three is
// enough (matches the host's "both, whichever is first" instruction).
export function isEventReadyForMemoriesFinalization(event: Pick<EligibleEventRow, "status" | "end_date" | "settings">): boolean {
  if (event.status === "completed") return true

  const now = Date.now()

  if (event.end_date) {
    const endMs = new Date(event.end_date).getTime()
    if (!Number.isNaN(endMs) && endMs < now) return true
  }

  const countdownRaw = (event.settings as Record<string, unknown> | null)?.countdown_date
  if (typeof countdownRaw === "string") {
    const countdownMs = new Date(countdownRaw).getTime()
    if (!Number.isNaN(countdownMs) && countdownMs < now) return true
  }

  return false
}

function pickCollageLayout(approvedPhotoCount: number): CollageLayout {
  return approvedPhotoCount >= DENSE_COLLAGE_PHOTO_THRESHOLD ? "grid-9" : "grid-4"
}

function pickMusicTrack(index: number): string {
  return SLIDESHOW_TRACKS[index % SLIDESHOW_TRACKS.length].id
}

async function countApprovedPhotos(supabase: SupabaseClient, eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("is_approved", true)
    .ilike("mime_type", "image/%")

  if (error) {
    logger.error("memories-automation: approved-photo count failed", { eventId, error: error.message })
    return 0
  }
  return count ?? 0
}

async function generateAutoCollage(
  supabase: SupabaseClient,
  event: EligibleEventRow,
  approvedPhotoCount: number,
): Promise<string | null> {
  const layout = pickCollageLayout(approvedPhotoCount)
  const spec = COLLAGE_LAYOUTS[layout]

  try {
    const scored = await getScoredPhotos(supabase, event.id, spec.count)
    if (scored.length === 0) return null

    const buffers = await Promise.all(scored.map((p) => downloadPhotoBuffer(supabase, p.storage_path)))
    const photos = scored
      .map((p, i) => (buffers[i] ? { id: p.id, buffer: buffers[i]! } : null))
      .filter((p): p is { id: string; buffer: Buffer } => p !== null)

    if (photos.length === 0) return null

    const composed = await composeCollage(layout, photos)
    const uploaded = await uploadCollage(event.host_id, event.id, layout, composed.buffer)

    const { data: inserted, error: insertErr } = await supabase
      .from("event_collages")
      .insert({
        event_id: event.id,
        layout,
        photo_ids: photos.map((p) => p.id),
        storage_path: uploaded.storagePath,
        image_url: uploaded.imageUrl,
        width: composed.width,
        height: composed.height,
      })
      .select("id")
      .single()

    if (insertErr) {
      logger.error("memories-automation: collage insert failed", { eventId: event.id, error: insertErr.message })
      return null
    }
    return inserted?.id ?? null
  } catch (err) {
    logger.error("memories-automation: collage generation threw", { eventId: event.id, error: String(err) })
    return null
  }
}

async function generateAutoSlideshows(
  supabase: SupabaseClient,
  event: EligibleEventRow,
  approvedPhotoCount: number,
): Promise<string[]> {
  const durations = [30, 60, ...(approvedPhotoCount >= EXTENDED_SLIDESHOW_PHOTO_THRESHOLD ? [180] : [])]
  const slideshowIds: string[] = []

  for (let i = 0; i < durations.length; i++) {
    const duration = durations[i]
    const label = duration === 180 ? "3 min" : `${duration}s`

    try {
      const photoCount = Math.max(MIN_PHOTOS, Math.min(MAX_PHOTOS, Math.round(duration / SECONDS_PER_PHOTO)))
      const scored = await getScoredPhotos(supabase, event.id, photoCount)
      if (scored.length === 0) continue

      // Named "Highlights (…)" rather than "Auto Slideshow" so this never
      // collides with the manual "Generate Slideshow" button's own
      // dedup-by-name logic in memories/slideshow/route.ts — both can
      // coexist as active rows.
      const { data: inserted, error: insertErr } = await supabase
        .from("slideshows")
        .insert({
          event_id: event.id,
          name: `Highlights (${label})`,
          photo_ids: scored.map((p) => p.id),
          transition: "fade",
          interval_seconds: SECONDS_PER_PHOTO,
          show_brand: true,
          music_track: pickMusicTrack(i),
          is_active: true,
        })
        .select("id")
        .single()

      if (insertErr) {
        logger.error("memories-automation: slideshow insert failed", { eventId: event.id, duration, error: insertErr.message })
        continue
      }
      if (inserted) slideshowIds.push(inserted.id)
    } catch (err) {
      logger.error("memories-automation: slideshow generation threw", { eventId: event.id, duration, error: String(err) })
    }
  }

  return slideshowIds
}

export async function finalizeEventMemories(
  supabase: SupabaseClient,
  event: EligibleEventRow,
): Promise<MemoriesFinalizationOutcome> {
  const settings = (event.settings as Record<string, unknown>) || {}

  if (settings.memories_finalized_at) {
    return { eventId: event.id, skipped: true, reason: "already_finalized" }
  }
  if (!isMemoriesEnabled(settings)) {
    return { eventId: event.id, skipped: true, reason: "memories_disabled" }
  }

  const approvedPhotoCount = await countApprovedPhotos(supabase, event.id)

  const awardRows = await getGuestAwardRows(supabase, event.id)
  const { awards, guestCount }: { awards: GuestAward[]; guestCount: number } = deriveGuestAwards(awardRows)

  const collageId = await generateAutoCollage(supabase, event, approvedPhotoCount)
  const slideshowIds = await generateAutoSlideshows(supabase, event, approvedPhotoCount)

  const { error: settingsErr } = await supabase
    .from("events")
    .update({
      settings: {
        ...settings,
        memories_finalized_at: new Date().toISOString(),
        memories_snapshot: {
          guest_awards: awards,
          guest_count: guestCount,
          collage_id: collageId,
          slideshow_ids: slideshowIds,
        },
      },
    })
    .eq("id", event.id)

  if (settingsErr) {
    logger.error("memories-automation: failed to persist finalization marker", { eventId: event.id, error: settingsErr.message })
  }

  return {
    eventId: event.id,
    skipped: false,
    guestAwardsCount: awards.length,
    collageId,
    slideshowIds,
  }
}
