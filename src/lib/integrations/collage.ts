// src/lib/integrations/collage.ts
//
// "Auto Collage" — Snapsy Memories feature. Composites a handful of the
// event's best photos into a single PNG using sharp's `.composite()`, which
// is already a proven-safe dependency in this codebase (image-processing.ts's
// applyWatermark(), recap-video.ts's SVG rasterization). Deliberately NOT
// using node-canvas/the "Canvas API" server-side — that package needs a
// native cairo binary, exactly the class of Vercel-serverless-bundling
// problem this codebase has already been bitten by (see face.ts's WASM
// backend saga). sharp.composite() gets the same result with zero native
// binary risk.

import "server-only"
import sharp from "sharp"
import type { SupabaseClient } from "@supabase/supabase-js"
import { STORAGE_BUCKETS } from "@/lib/constants"
import { uploadFile } from "./storage"
import { logger } from "@/lib/logger"

// "auto" backs the Step 8 wizard's Custom Layout Planner toggle
// (settings.ai_features.custom_layouts) — instead of the host picking a
// fixed preset, the grid dimensions and tile spacing are computed from how
// many approved photos are actually available (see buildAutoLayoutSpec),
// scaling from a spacious 1x1/2x1 for a couple of photos down to a denser
// print-ready grid as the count grows.
export type CollageLayout = "grid-2" | "grid-4" | "grid-9" | "polaroid" | "auto"

export const AUTO_LAYOUT_MAX_PHOTOS = 12

interface LayoutSpec {
  cols: number
  rows: number
  count: number
  canvasWidth: number
  canvasHeight: number
  gap: number
  frame: "none" | "polaroid"
  background: { r: number; g: number; b: number; alpha: number }
}

export const COLLAGE_LAYOUTS: Record<Exclude<CollageLayout, "auto">, LayoutSpec> = {
  "grid-2": { cols: 2, rows: 1, count: 2, canvasWidth: 1200, canvasHeight: 600, gap: 8, frame: "none", background: { r: 20, g: 17, b: 16, alpha: 1 } },
  "grid-4": { cols: 2, rows: 2, count: 4, canvasWidth: 1080, canvasHeight: 1080, gap: 8, frame: "none", background: { r: 20, g: 17, b: 16, alpha: 1 } },
  "grid-9": { cols: 3, rows: 3, count: 9, canvasWidth: 1080, canvasHeight: 1080, gap: 6, frame: "none", background: { r: 20, g: 17, b: 16, alpha: 1 } },
  polaroid: { cols: 2, rows: 2, count: 4, canvasWidth: 1200, canvasHeight: 1200, gap: 24, frame: "polaroid", background: { r: 255, g: 255, b: 255, alpha: 1 } },
}

/**
 * Dynamically-sized grid for the "auto" layout: near-square (cols/rows as
 * close to sqrt(count) as possible) so the print/export always reads as a
 * deliberate grid rather than one long strip, with tile size (and gap)
 * scaled down as photo count climbs so a 9- or 12-photo grid still fits a
 * print-ready canvas instead of ballooning in file size.
 */
export function buildAutoLayoutSpec(photoCount: number): LayoutSpec {
  const count = Math.max(1, Math.min(photoCount, AUTO_LAYOUT_MAX_PHOTOS))
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const tileTarget = count <= 4 ? 480 : count <= 9 ? 340 : 260
  const gap = count <= 4 ? 10 : count <= 9 ? 7 : 5
  return {
    cols,
    rows,
    count,
    canvasWidth: cols * tileTarget + gap * (cols + 1),
    canvasHeight: rows * tileTarget + gap * (rows + 1),
    gap,
    frame: "none",
    background: { r: 20, g: 17, b: 16, alpha: 1 },
  }
}

export function resolveLayoutSpec(layout: CollageLayout, photoCount: number): LayoutSpec {
  if (layout === "auto") return buildAutoLayoutSpec(photoCount)
  return COLLAGE_LAYOUTS[layout]
}

export interface CollagePhotoInput {
  id: string
  buffer: Buffer
}

export interface ComposeCollageResult {
  buffer: Buffer
  width: number
  height: number
}

export async function composeCollage(layout: CollageLayout, photos: CollagePhotoInput[]): Promise<ComposeCollageResult> {
  const spec = resolveLayoutSpec(layout, photos.length)
  const tileWidth = Math.floor((spec.canvasWidth - spec.gap * (spec.cols + 1)) / spec.cols)
  const tileHeight = Math.floor((spec.canvasHeight - spec.gap * (spec.rows + 1)) / spec.rows)

  // Polaroid frame: white border around each photo + extra caption strip at
  // the bottom, so it reads as a stack of polaroid prints rather than a
  // plain grid, without needing per-tile rotation (which would need larger
  // canvas math to avoid clipping corners — not worth the complexity for a
  // v1 layout).
  const innerPad = spec.frame === "polaroid" ? 18 : 0
  const captionStrip = spec.frame === "polaroid" ? 46 : 0
  const innerWidth = tileWidth - innerPad * 2
  const innerHeight = tileHeight - innerPad * 2 - captionStrip

  const composites: { input: Buffer; left: number; top: number }[] = []

  for (let i = 0; i < spec.count; i++) {
    const photo = photos[i]
    const col = i % spec.cols
    const row = Math.floor(i / spec.cols)
    const tileX = spec.gap + col * (tileWidth + spec.gap)
    const tileY = spec.gap + row * (tileHeight + spec.gap)

    if (spec.frame === "polaroid") {
      const frameBuf = await sharp({
        create: { width: tileWidth, height: tileHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
      })
        .png()
        .toBuffer()
      composites.push({ input: frameBuf, left: tileX, top: tileY })
    }

    if (!photo) continue // fewer photos than the layout's tile count — leave that tile as background/frame only

    const photoBuf = await sharp(photo.buffer)
      .resize(innerWidth, innerHeight, { fit: "cover", position: "attention" })
      .toBuffer()

    composites.push({ input: photoBuf, left: tileX + innerPad, top: tileY + innerPad })
  }

  const outBuffer = await sharp({
    create: { width: spec.canvasWidth, height: spec.canvasHeight, channels: 4, background: spec.background },
  })
    .composite(composites)
    .png()
    .toBuffer()

  return { buffer: outBuffer, width: spec.canvasWidth, height: spec.canvasHeight }
}

export async function downloadPhotoBuffer(supabase: SupabaseClient, storagePath: string): Promise<Buffer | null> {
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.PHOTOS).download(storagePath)
    if (error || !data) {
      logger.error("collage: failed to download photo", { storagePath, error: error?.message })
      return null
    }
    return Buffer.from(await data.arrayBuffer())
  } catch (err) {
    logger.error("collage: photo download threw", { storagePath, error: String(err) })
    return null
  }
}

export async function uploadCollage(hostId: string, eventId: string, layout: CollageLayout, buffer: Buffer) {
  const storagePath = `${hostId}/${eventId}/collages/${layout}-${Date.now()}.png`
  const { path, publicUrl } = await uploadFile({
    bucket: "PHOTOS",
    path: storagePath,
    file: new Blob([new Uint8Array(buffer)], { type: "image/png" }),
    contentType: "image/png",
    cacheControl: "31536000",
  })
  return { storagePath: path, imageUrl: publicUrl }
}
