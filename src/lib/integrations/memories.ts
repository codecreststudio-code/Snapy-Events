// src/lib/integrations/memories.ts
//
// Shared server-side helpers for the "Snapsy Memories" feature set
// (Guest Awards, Event Summary, Auto Collage, Slideshow, Stories, Highlight
// Movie). Pure Next.js + Supabase — no ffmpeg/AI services beyond the
// already-existing recap-video pipeline. See
// supabase/migrations/0028_snapsy_memories.sql for the SQL side.

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

export interface EventSummaryStats {
  guests: number
  photos: number
  videos: number
  voiceNotes: number
  totalReactions: number
  totalComments: number
  storageBytes: number
  mostActiveUploader: string | null
  peakUploadHour: number | null
}

interface SummaryStatsRow {
  guests: number
  photos: number
  videos: number
  voice_notes: number
  total_reactions: number
  total_comments: number
  storage_bytes: number
  most_active_uploader: string | null
  peak_upload_hour: number | null
}

export async function getEventSummaryStats(supabase: SupabaseClient, eventId: string): Promise<EventSummaryStats> {
  const { data, error } = await supabase.rpc("get_event_summary_stats", { p_event_id: eventId })
  if (error) {
    logger.error("memories: get_event_summary_stats failed", { eventId, error: error.message })
    return {
      guests: 0,
      photos: 0,
      videos: 0,
      voiceNotes: 0,
      totalReactions: 0,
      totalComments: 0,
      storageBytes: 0,
      mostActiveUploader: null,
      peakUploadHour: null,
    }
  }
  const row = (Array.isArray(data) ? data[0] : data) as SummaryStatsRow | undefined
  return {
    guests: Number(row?.guests ?? 0),
    photos: Number(row?.photos ?? 0),
    videos: Number(row?.videos ?? 0),
    voiceNotes: Number(row?.voice_notes ?? 0),
    totalReactions: Number(row?.total_reactions ?? 0),
    totalComments: Number(row?.total_comments ?? 0),
    storageBytes: Number(row?.storage_bytes ?? 0),
    mostActiveUploader: row?.most_active_uploader ?? null,
    peakUploadHour: row?.peak_upload_hour ?? null,
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatHour(hour: number | null): string {
  if (hour === null || hour === undefined) return "N/A"
  const h = ((hour + 11) % 12) + 1
  const ampm = hour >= 12 ? "PM" : "AM"
  return `${h} ${ampm}`
}

export interface ScoredMediaRow {
  id: string
  storage_path: string
  thumbnail_path: string | null
  mime_type: string | null
  created_at: string
  score: number
}

// Weighted highlight selection (get_scored_highlight_photos /
// get_scored_highlight_videos in the migration) — used by Auto Collage and
// Slideshow. Approved photos only, scored by
// reactions*5 + comments*4 + host_favorite*10 + recency*1.
export async function getScoredPhotos(supabase: SupabaseClient, eventId: string, limit: number): Promise<ScoredMediaRow[]> {
  const { data, error } = await supabase.rpc("get_scored_highlight_photos", { p_event_id: eventId, p_limit: limit })
  if (error) {
    logger.error("memories: get_scored_highlight_photos failed", { eventId, error: error.message })
    return []
  }
  return (data as ScoredMediaRow[] | null) ?? []
}

export async function getScoredVideos(supabase: SupabaseClient, eventId: string, limit: number): Promise<ScoredMediaRow[]> {
  const { data, error } = await supabase.rpc("get_scored_highlight_videos", { p_event_id: eventId, p_limit: limit })
  if (error) {
    logger.error("memories: get_scored_highlight_videos failed", { eventId, error: error.message })
    return []
  }
  return (data as ScoredMediaRow[] | null) ?? []
}

// Host opt-out for automatic memory generation (Stories cron, etc.) — see
// settings.memories_enabled in the event's JSONB settings column. Missing
// key defaults to enabled (matches how every other settings toggle in this
// codebase treats an absent key), so this only ever needs to be written
// when a host explicitly turns it off.
export function isMemoriesEnabled(settings: Record<string, unknown> | null | undefined): boolean {
  if (!settings || typeof settings !== "object") return true
  const value = (settings as Record<string, unknown>).memories_enabled
  return value !== false
}

// --- Guest Awards ---------------------------------------------------------
//
// Pulled out of src/app/api/events/[id]/memories/awards/route.ts so the
// event-completion automation (memories-automation.ts) can compute the exact
// same award set without duplicating the derivation logic, and so both stay
// in sync if the scoring rules ever change.

export interface GuestAwardRow {
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

export async function getGuestAwardRows(supabase: SupabaseClient, eventId: string): Promise<GuestAwardRow[]> {
  const { data, error } = await supabase.rpc("get_guest_awards", { p_event_id: eventId })
  if (error) {
    logger.error("memories: get_guest_awards failed", { eventId, error: error.message })
    return []
  }
  return (data as GuestAwardRow[] | null) ?? []
}

export function deriveGuestAwards(rows: GuestAwardRow[]): { awards: GuestAward[]; guestCount: number } {
  if (rows.length === 0) return { awards: [], guestCount: 0 }

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

  return { awards, guestCount: rows.length }
}
