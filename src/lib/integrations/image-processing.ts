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
