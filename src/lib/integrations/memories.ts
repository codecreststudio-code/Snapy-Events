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
