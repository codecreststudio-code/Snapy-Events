import sharp from "sharp"

export interface ProcessedImage {
  buffer: Buffer
  width: number
  height: number
  format: string
  mimeType: string
}

export interface ProcessResult {
  processed: ProcessedImage
  thumbnail: ProcessedImage | null
  thumbnailUploadPath: string | null
}

export async function processImage(
  buffer: Buffer,
  mimeType: string,
  orgId: string,
  eventId: string,
  galleryId: string,
): Promise<ProcessResult> {
  const image = sharp(buffer, {
    failOn: "none",
    pages: -1,
  })

  const metadata = await image.metadata()

  const stripped = image

  const formatMap: Record<string, { format: string; mime: string }> = {
    "image/jpeg": { format: "jpeg", mime: "image/jpeg" },
    "image/png": { format: "png", mime: "image/png" },
    "image/webp": { format: "webp", mime: "image/webp" },
    "image/heic": { format: "heif", mime: "image/heif" },
    "image/heif": { format: "heif", mime: "image/heif" },
  }

  const fmt = formatMap[mimeType]
  let processed: Buffer
  let outputFormat: string
  let outputMime: string

  if (fmt) {
    processed = await stripped
      .toFormat(fmt.format as any, { quality: mimeType === "image/jpeg" ? 88 : mimeType === "image/webp" ? 82 : 85 })
      .toBuffer()
    outputFormat = fmt.format
    outputMime = fmt.mime
  } else {
    processed = await stripped.toBuffer()
    outputFormat = metadata.format || "jpeg"
    outputMime = mimeType
  }

  const width = metadata.width || 0
  const height = metadata.height || 0

  let thumbnail: ProcessedImage | null = null
  let thumbnailUploadPath: string | null = null

  if (width > 0 && height > 0) {
    const MAX_THUMB_DIM = 400
    const thumbBuf = await sharp(buffer)
      .resize(MAX_THUMB_DIM, MAX_THUMB_DIM, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer()

    const thumbMeta = await sharp(thumbBuf).metadata()
    const slug = `${orgId}/${eventId}/${galleryId}/thumb_${crypto.randomUUID()}.jpg`
    thumbnailUploadPath = slug

    thumbnail = {
      buffer: thumbBuf,
      width: thumbMeta.width || 0,
      height: thumbMeta.height || 0,
      format: "jpeg",
      mimeType: "image/jpeg",
    }
  }

  return {
    processed: {
      buffer: processed,
      width,
      height,
      format: outputFormat,
      mimeType: outputMime,
    },
    thumbnail,
    thumbnailUploadPath,
  }
}

// The logo composited onto downloaded media (mirrors the in-app
// <WatermarkOverlay> CSS mark, src/lib/components/media/watermark-overlay.tsx,
// which uses the same /Favicon.png). Fetched over HTTP rather than read off
// disk because on Vercel the `public/` folder isn't reliably available to a
// serverless function's filesystem — an outbound fetch to the app's own
// public asset URL always works regardless of bundling. Cached in module
// scope so a warm serverless instance only fetches it once.
let cachedLogoBuffer: Buffer | null = null
async function getWatermarkLogoBuffer(): Promise<Buffer | null> {
  if (cachedLogoBuffer) return cachedLogoBuffer
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://snapsy-events.vercel.app"
    const res = await fetch(`${baseUrl}/Favicon.png`)
    if (!res.ok) return null
    cachedLogoBuffer = Buffer.from(await res.arrayBuffer())
    return cachedLogoBuffer
  } catch {
    return null
  }
}

/**
 * Composites a small logo mark into the bottom-right corner of an image and
 * returns the re-encoded buffer. Used for guest photo downloads when
 * Admin > Feature Flags → "Automated Image Watermarking" is enabled
 * (src/app/api/photos/[id]/download/route.ts). This burns the mark into the
 * actual pixels so it survives outside the app; the in-app display-time
 * equivalent is the CSS <WatermarkOverlay> component, which is free to show
 * everywhere without re-encoding every image on every view.
 *
 * Previously this tiled a rotated "SNAPSY" text string across the entire
 * image, which made downloaded photos unreadable. Replaced with a single
 * small corner logo so the actual photo stays fully visible.
 */
export async function applyWatermark(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const image = sharp(buffer, { failOn: "none" })
  const metadata = await image.metadata()
  const width = metadata.width || 1200
  const height = metadata.height || 1200

  const formatMap: Record<string, "jpeg" | "png" | "webp"> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  }
  // Anything not directly re-encodable in its original format (heic, etc.)
  // falls back to jpeg, which is fine for a download copy.
  const outFormat = formatMap[mimeType] || "jpeg"

  const logoBuf = await getWatermarkLogoBuffer()
  let overlay: sharp.OverlayOptions

  if (logoBuf) {
    const logoTargetSize = Math.max(40, Math.min(220, Math.round(width * 0.12)))
    const padding = Math.max(14, Math.round(width * 0.02))
    const resizedLogo = await sharp(logoBuf)
      .resize(logoTargetSize, logoTargetSize, { fit: "inside" })
      .ensureAlpha()
      .png()
      .toBuffer()
    const logoMeta = await sharp(resizedLogo).metadata()
    const logoW = logoMeta.width || logoTargetSize
    const logoH = logoMeta.height || logoTargetSize
    overlay = { input: resizedLogo, left: Math.max(0, width - logoW - padding), top: Math.max(0, height - logoH - padding) }
  } else {
    // Fallback if the logo fetch fails: a small single-line text mark in the
    // corner (not tiled) so a download is never fully unwatermarked.
    const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.032))
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width - 16}" y="${height - 16}" font-size="${fontSize}" font-family="sans-serif" font-weight="700" fill="#ffffff" fill-opacity="0.85" stroke="#000000" stroke-opacity="0.25" stroke-width="1" text-anchor="end">SNAPSY</text></svg>`
    overlay = { input: Buffer.from(svg), top: 0, left: 0 }
  }

  let pipeline = image.composite([overlay])
  pipeline = outFormat === "png"
    ? pipeline.png()
    : pipeline.toFormat(outFormat, { quality: 88 })

  return pipeline.toBuffer()
}

export async function validateImageDimensions(
  buffer: Buffer,
  maxWidth = 10000,
  maxHeight = 10000,
): Promise<{ valid: boolean; width: number; height: number; error?: string }> {
  try {
    const metadata = await sharp(buffer, { failOn: "none" }).metadata()
    const w = metadata.width || 0
    const h = metadata.height || 0
    if (w === 0 || h === 0) return { valid: false, width: 0, height: 0, error: "Could not determine image dimensions" }
    if (w > maxWidth || h > maxHeight) return { valid: false, width: w, height: h, error: `Image dimensions ${w}x${h} exceed maximum ${maxWidth}x${maxHeight}` }
    return { valid: true, width: w, height: h }
  } catch (err) {
    return { valid: false, width: 0, height: 0, error: `Failed to read image: ${err}` }
  }
}
