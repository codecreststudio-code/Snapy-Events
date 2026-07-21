// src/lib/integrations/slideshow-music.ts
//
// Background-music catalog for the live in-browser Slideshow player. Kept as
// a small static list (not a DB table) since these are fixed app assets, not
// per-event data — same reasoning as COLLAGE_LAYOUTS in collage.ts. Multiple
// tracks on purpose (per host feedback) so every slideshow doesn't sound
// identical; the host picks one per generation, stored as `music_track` on
// the `slideshows` row (see 0031_slideshow_music.sql).
//
// IMPORTANT — audio files are NOT bundled by this code. Each entry expects a
// real .mp3 file at public/audio/slideshow/<id>.mp3. Sourcing/licensing
// actual royalty-free tracks needs a human to pick and download them (e.g.
// from Pixabay Music, YouTube Audio Library, or Free Music Archive — filter
// for tracks explicitly cleared for commercial/no-attribution use) — that
// step hasn't been done yet. Until those files exist, `resolveTrackUrl`
// still returns a path, but the <audio> element will simply fail to load and
// the slideshow plays silently (no crash) — see SlideshowPlayer's onError.

export interface SlideshowTrack {
  id: string
  label: string
  mood: string
}

export const SLIDESHOW_TRACKS: SlideshowTrack[] = [
  { id: "uplifting", label: "Uplifting", mood: "Bright, energetic" },
  { id: "sentimental", label: "Sentimental", mood: "Warm, reflective" },
  { id: "cinematic", label: "Cinematic", mood: "Sweeping, emotional" },
  { id: "acoustic", label: "Acoustic Chill", mood: "Relaxed, intimate" },
  { id: "feelgood", label: "Feel-Good Pop", mood: "Fun, celebratory" },
]

const TRACK_IDS = new Set(SLIDESHOW_TRACKS.map((t) => t.id))

export function isValidTrackId(id: string | null | undefined): boolean {
  return !!id && TRACK_IDS.has(id)
}

export function resolveTrackUrl(id: string | null | undefined): string | null {
  if (!isValidTrackId(id)) return null
  return `/audio/slideshow/${id}.mp3`
}
