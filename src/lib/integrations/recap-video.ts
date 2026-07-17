// src/lib/integrations/recap-video.ts
//
// Server-side "recap video" generator — composes a short auto-highlight reel
// (stats intro + a handful of the event's best photos, Ken-Burns pan/zoom,
// crossfade transitions) into a single MP4, entirely inside the same Vercel
// serverless function that serves the API route. There is no queue/worker
// infra in this codebase (see src/app/api/events/[id]/download-zip/route.ts
// for the precedent this follows: a synchronous, long-running request backed
// by a generous `maxDuration` in vercel.json), so this module runs
// synchronously start-to-finish and is called directly from
// src/app/api/events/[id]/recap/generate/route.ts.
//
// No external video service (Shotstack, Remotion Lambda, etc.) and no new
// env vars are used — composition is done with `fluent-ffmpeg` driving the
// static binary bundled by `@ffmpeg-installer/ffmpeg`, and the stats-intro
// frame(s) are rasterized with `sharp` (already a dependency, used the same
// way in image-processing.ts's applyWatermark()). The two "moods" are
// achieved purely through ffmpeg filter parameters — no bundled music/audio
// track, since we were explicitly told not to introduce any audio-licensing
// dependency. The output video is silent (`-an`).

import "server-only"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import ffmpeg from "fluent-ffmpeg"
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg"
import sharp from "sharp"
import type { SupabaseClient } from "@supabase/supabase-js"
import { uploadFile } from "./storage"
import { STORAGE_BUCKETS } from "@/lib/constants"
import { logger } from "@/lib/logger"

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export type RecapMood = "joyful" | "sentimental"

export interface RecapStats {
  guests: number
  photos: number
  videos: number
  voiceNotes: number
  messages: number
}

export interface GenerateRecapVideoParams {
  eventId: string
  mood: RecapMood
  // Service-role Supabase client (RLS-bypassing) — the caller (the API
  // route) is responsible for having already verified the requester owns
  // this event before calling in.
  supabase: SupabaseClient
}

export interface GenerateRecapVideoResult {
  videoUrl: string
  storagePath: string
  stats: RecapStats
}

// ---------------------------------------------------------------------------
// Output + selection constants
// ---------------------------------------------------------------------------

// Portrait, mobile-first framing (matches once.film's reel feel) — simpler to
// get right with a single zoompan/xfade pipeline than a square crop that also
// has to look good full-bleed on a phone.
const OUTPUT_WIDTH = 1080
const OUTPUT_HEIGHT = 1920
const OUTPUT_FPS = 30

// Highlight photo selection is capped at the SQL level (see
// supabase/migrations/0025_recap_video_highlights.sql) — the API/RPC calls
// below only ever ask for at most this many rows each, so a huge event
// (thousands of photos) never has more than a bounded set pulled into this
// function, regardless of table size.
const TOP_REACTED_COUNT = 8
const TIMELINE_SAMPLE_COUNT = 8
const MAX_HIGHLIGHT_PHOTOS = 16

const STATS_INTRO_TOTAL_DURATION_SEC = 3.6
const STATS_INTRO_FRAME_COUNT = 2

// ---------------------------------------------------------------------------
// Mood presets — the only thing that differs between "joyful" and
// "sentimental" is ffmpeg filter parameters. Kept as named constants so
// they're easy to tune later without touching the composition logic.
// ---------------------------------------------------------------------------

interface MoodPreset {
  /** How long each highlight photo is held on screen, in seconds. */
  imageDurationSec: number
  /** Crossfade duration between consecutive clips, in seconds. */
  crossfadeDurationSec: number
  /** Fraction the image zooms in over its on-screen duration (Ken Burns). */
  zoomIntensity: number
  /** ffmpeg `eq` filter grading. */
  eq: { brightness: number; saturation: number; contrast: number }
  /** Whether to apply the `vignette` filter. */
  vignette: boolean
}

export const MOOD_PRESETS: Record<RecapMood, MoodPreset> = {
  // Upbeat, energetic pacing: quick cuts, punchier color.
  joyful: {
    imageDurationSec: 1.8,
    crossfadeDurationSec: 0.35,
    zoomIntensity: 0.12,
    eq: { brightness: 0.03, saturation: 1.25, contrast: 1.06 },
    vignette: false,
  },
  // Slow, warm, reflective pacing: longer holds, gentle desaturation + vignette.
  sentimental: {
    imageDurationSec: 3.0,
    crossfadeDurationSec: 0.9,
    zoomIntensity: 0.08,
    eq: { brightness: 0.0, saturation: 0.85, contrast: 1.0 },
    vignette: true,
  },
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function generateRecapVideo({
  eventId,
  mood,
  supabase,
}: GenerateRecapVideoParams): Promise<GenerateRecapVideoResult> {
  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("id, name, host_id")
    .eq("id", eventId)
    .single()

  if (eventErr || !eventRow) {
    throw new Error("Event not found")
  }

  const stats = await computeRecapStats(supabase, eventId)
  const highlightPhotos = await selectHighlightPhotos(supabase, eventId)

  if (highlightPhotos.length === 0) {
    throw new Error("No approved photos are available yet to generate a recap video")
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `recap-${eventId.slice(0, 8)}-`))
  try {
    const introFramePaths = await renderStatsIntroFrames(workDir, eventRow.name || "Our Event", stats)
    const photoFilePaths = await downloadHighlightPhotos(supabase, workDir, highlightPhotos)

    if (photoFilePaths.length === 0) {
      throw new Error("Highlight photos could not be downloaded from storage")
    }

    const outputPath = path.join(workDir, `recap-${mood}.mp4`)
    await composeRecapVideo({ introFramePaths, photoFilePaths, outputPath, mood })

    const outputBuffer = await fs.readFile(outputPath)
    const storagePath = `${eventRow.host_id}/${eventId}/recap/${mood}-${Date.now()}.mp4`
    const { path: uploadedPath, publicUrl } = await uploadFile({
      bucket: "PHOTOS",
      path: storagePath,
      file: new Blob([new Uint8Array(outputBuffer)], { type: "video/mp4" }),
      contentType: "video/mp4",
      cacheControl: "31536000",
    })

    return { videoUrl: publicUrl || "", storagePath: uploadedPath, stats }
  } finally {
    // Clean up /tmp regardless of success/failure so repeated invocations on
    // the same warm serverless instance don't leak disk space.
    await fs.rm(workDir, { recursive: true, force: true }).catch((err) => {
      logger.warn("recap-video: failed to clean up tmp workdir", { workDir, error: String(err) })
    })
  }
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

async function computeRecapStats(supabase: SupabaseClient, eventId: string): Promise<RecapStats> {
  const { data, error } = await supabase.rpc("get_event_recap_stats", { p_event_id: eventId })
  if (error) {
    logger.error("recap-video: stats query failed", { eventId, error: error.message })
    return { guests: 0, photos: 0, videos: 0, voiceNotes: 0, messages: 0 }
  }
  const row = Array.isArray(data) ? data[0] : data
  return {
    guests: Number(row?.guests ?? 0),
    photos: Number(row?.photos ?? 0),
    videos: Number(row?.videos ?? 0),
    voiceNotes: Number(row?.voice_notes ?? 0),
    messages: Number(row?.messages ?? 0),
  }
}

// ---------------------------------------------------------------------------
// Highlight photo selection
// ---------------------------------------------------------------------------

interface HighlightPhotoRow {
  id: string
  storage_path: string
  created_at: string
}

interface HighlightPhoto {
  id: string
  storagePath: string
}

async function selectHighlightPhotos(supabase: SupabaseClient, eventId: string): Promise<HighlightPhoto[]> {
  const [topReactedRes, sampledRes] = await Promise.all([
    supabase.rpc("get_top_reacted_photos", { p_event_id: eventId, p_limit: TOP_REACTED_COUNT }),
    supabase.rpc("get_timeline_sampled_photos", { p_event_id: eventId, p_sample_count: TIMELINE_SAMPLE_COUNT }),
  ])

  if (topReactedRes.error) {
    logger.error("recap-video: top-reacted photos query failed", { eventId, error: topReactedRes.error.message })
  }
  if (sampledRes.error) {
    logger.error("recap-video: timeline-sampled photos query failed", { eventId, error: sampledRes.error.message })
  }

  const topReacted = (topReactedRes.data as HighlightPhotoRow[] | null) ?? []
  const sampled = (sampledRes.data as HighlightPhotoRow[] | null) ?? []

  const seen = new Set<string>()
  const combined: HighlightPhotoRow[] = []
  for (const row of [...topReacted, ...sampled]) {
    if (!row?.id || seen.has(row.id)) continue
    seen.add(row.id)
    combined.push(row)
  }

  // Play the reel in chronological order (the event's own timeline), not in
  // "most reacted first" order — the reaction/sampling queries above are
  // only responsible for *which* photos make the cut, capped at the SQL
  // level, never for the playback order.
  combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return combined.slice(0, MAX_HIGHLIGHT_PHOTOS).map((row) => ({ id: row.id, storagePath: row.storage_path }))
}

// ---------------------------------------------------------------------------
// Stats-intro frame rendering (sharp + SVG)
// ---------------------------------------------------------------------------

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// System serif fallback stack — deliberately not the app's Playfair webfont.
// Loading a custom font file inside sharp's SVG rasterizer (librsvg via
// resvg/pango depending on platform) is unreliable in a serverless
// environment, so we lean on whatever serif the underlying image (Vercel's
// Amazon Linux) has installed instead.
const SVG_SERIF_STACK = "Georgia, 'Times New Roman', 'DejaVu Serif', serif"

function buildStatsIntroSvgFrames(eventName: string, stats: RecapStats): string[] {
  const bg = "#141110"
  const gold = "#D4AF37"
  const cream = "#F4E9CE"
  // Truncate the raw name BEFORE escaping, not after — escaping first and
  // then slicing to 60 chars can cut an entity reference in half (e.g.
  // "...Bob &amp" with the trailing ";" chopped off), producing malformed
  // XML that sharp's SVG rasterizer fails to parse. Event names can be up
  // to 200 chars (src/lib/validators/index.ts), so this boundary is
  // reachable in normal use, not just a theoretical edge case.
  const safeName = escapeXml(eventName.slice(0, 60))
  const totalMoments = stats.photos + stats.videos

  const frameOne = `<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="40%" text-anchor="middle" font-family="${SVG_SERIF_STACK}" font-size="76" font-weight="600" fill="${gold}">${safeName}</text>
    <text x="50%" y="48%" text-anchor="middle" font-family="${SVG_SERIF_STACK}" font-size="32" fill="${cream}" opacity="0.8">A recap of the moments you shared</text>
    <text x="50%" y="60%" text-anchor="middle" font-family="${SVG_SERIF_STACK}" font-size="44" font-weight="700" fill="${gold}">${stats.guests} guests &#183; ${totalMoments} moments captured</text>
  </svg>`

  const rows: Array<[string, number]> = [
    ["Photos", stats.photos],
    ["Videos", stats.videos],
    ["Voice Notes", stats.voiceNotes],
    ["Messages", stats.messages],
  ]
  const rowHeight = 190
  const blockHeight = rowHeight * rows.length
  const startY = OUTPUT_HEIGHT / 2 - blockHeight / 2 + rowHeight * 0.6

  const rowsMarkup = rows
    .map(([label, value], i) => {
      const y = startY + i * rowHeight
      return `
        <text x="16%" y="${y}" font-family="${SVG_SERIF_STACK}" font-size="86" font-weight="700" fill="${gold}">${value}</text>
        <text x="16%" y="${y + 44}" font-family="${SVG_SERIF_STACK}" font-size="28" fill="${cream}" opacity="0.75">${label}</text>`
    })
    .join("\n")

  const frameTwo = `<svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    ${rowsMarkup}
  </svg>`

  return [frameOne, frameTwo]
}

async function renderStatsIntroFrames(workDir: string, eventName: string, stats: RecapStats): Promise<string[]> {
  const svgFrames = buildStatsIntroSvgFrames(eventName, stats).slice(0, STATS_INTRO_FRAME_COUNT)
  const framePaths: string[] = []
  for (let i = 0; i < svgFrames.length; i++) {
    const framePath = path.join(workDir, `intro-${i}.png`)
    await sharp(Buffer.from(svgFrames[i]))
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT)
      .png()
      .toFile(framePath)
    framePaths.push(framePath)
  }
  return framePaths
}

// ---------------------------------------------------------------------------
// Downloading + normalizing highlight photos into /tmp
// ---------------------------------------------------------------------------

async function downloadHighlightPhotos(
  supabase: SupabaseClient,
  workDir: string,
  photos: HighlightPhoto[],
): Promise<string[]> {
  const filePaths: string[] = []
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.PHOTOS).download(photo.storagePath)
      if (error || !data) {
        logger.warn("recap-video: failed to download highlight photo", { photoId: photo.id, error: error?.message })
        continue
      }
      const buffer = Buffer.from(await data.arrayBuffer())
      const framePath = path.join(workDir, `photo-${String(i).padStart(2, "0")}.jpg`)
      // Normalize every highlight photo to the exact output resolution up
      // front — xfade/zoompan require uniform input dimensions, and doing
      // the resize here (rather than in the ffmpeg filter graph) keeps the
      // filter graph itself simple and predictable regardless of source
      // photo aspect ratio.
      await sharp(buffer, { failOn: "none" })
        .rotate() // honor EXIF orientation before cropping
        .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover", position: "attention" })
        .jpeg({ quality: 90 })
        .toFile(framePath)
      filePaths.push(framePath)
    } catch (err) {
      logger.warn("recap-video: error processing highlight photo", { photoId: photo.id, error: String(err) })
    }
  }
  return filePaths
}

// ---------------------------------------------------------------------------
// ffmpeg composition
// ---------------------------------------------------------------------------

interface ComposeParams {
  introFramePaths: string[]
  photoFilePaths: string[]
  outputPath: string
  mood: RecapMood
}

async function composeRecapVideo({ introFramePaths, photoFilePaths, outputPath, mood }: ComposeParams): Promise<void> {
  const preset = MOOD_PRESETS[mood]

  const introClipDuration = STATS_INTRO_TOTAL_DURATION_SEC / Math.max(introFramePaths.length, 1)

  interface ClipInput {
    file: string
    duration: number
    isPhoto: boolean
  }

  const clips: ClipInput[] = [
    ...introFramePaths.map((file): ClipInput => ({ file, duration: introClipDuration, isPhoto: false })),
    ...photoFilePaths.map((file): ClipInput => ({ file, duration: preset.imageDurationSec, isPhoto: true })),
  ]

  if (clips.length === 0) throw new Error("No clips to compose into a recap video")

  const xfadeDuration = preset.crossfadeDurationSec

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg()

    // Each source is a still image looped for its on-screen duration plus
    // the crossfade overlap it needs to blend into the next clip. An
    // explicit input framerate matters here: `zoompan`'s `d` (frame count)
    // below assumes the input actually delivers OUTPUT_FPS frames per
    // second — without `-r`, a looped still image defaults to a much lower
    // synthesized framerate and the zoom would race ahead of real time.
    clips.forEach((clip) => {
      const inputDuration = (clip.duration + xfadeDuration).toFixed(3)
      command.input(clip.file).inputOptions(["-loop 1", `-t ${inputDuration}`, `-r ${OUTPUT_FPS}`])
    })

    const filterParts: string[] = []
    const clipLabels: string[] = []

    clips.forEach((clip, i) => {
      const totalFrames = Math.max(1, Math.round((clip.duration + xfadeDuration) * OUTPUT_FPS))
      const label = `v${i}`
      const gradeFilter =
        `eq=brightness=${preset.eq.brightness}:saturation=${preset.eq.saturation}:contrast=${preset.eq.contrast}` +
        (preset.vignette ? ",vignette" : "")

      if (clip.isPhoto) {
        // Ken Burns: slow, steady zoom-in over the clip's duration. Upscale
        // first so zoompan always has headroom to zoom into without
        // upscaling artifacts appearing at the tail end of the clip.
        const maxZoom = (1 + preset.zoomIntensity).toFixed(4)
        const zoomStep = (preset.zoomIntensity / totalFrames).toFixed(6)
        filterParts.push(
          `[${i}:v]scale=${Math.round(OUTPUT_WIDTH * 1.2)}:${Math.round(OUTPUT_HEIGHT * 1.2)},` +
            `zoompan=z='min(zoom+${zoomStep},${maxZoom})':d=${totalFrames}:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:fps=${OUTPUT_FPS},` +
            `${gradeFilter},setsar=1[${label}]`,
        )
      } else {
        // Stats-intro frames are already rendered at the exact output
        // resolution — no zoompan needed, just hold + grade.
        filterParts.push(`[${i}:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=${OUTPUT_FPS},setsar=1[${label}]`)
      }
      clipLabels.push(label)
    })

    // Chain `xfade` transitions pairwise across all clips. `offset` is the
    // time, relative to the *current* combined stream's own timeline
    // (`finalLabel`), at which the next transition begins.
    //
    // Each xfade node's output duration is `offset + duration(secondInput)`
    // — the combined stream does NOT retain the full sum of the two inputs'
    // raw durations, it loses `xfadeDuration` to the overlap. So the running
    // duration tracked here must be reset to `offset + clips[i].duration`
    // after every merge, not incremented by the next clip's raw duration on
    // top of the previous (already-correct) cumulative total. The previous
    // version summed raw durations and only ever subtracted a single
    // `xfadeDuration` regardless of how many transitions had already been
    // chained, so offsets drifted later by one full `xfadeDuration` per
 