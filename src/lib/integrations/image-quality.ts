// src/lib/integrations/image-quality.ts
//
// Server-side, no-external-service signals that back two of the
// event-creation wizard's "AI organize your memories" toggles
// (see events.settings.ai_features in new-event-form.tsx):
//
//   - Smart Duplicate Detection: an 8x8 average-hash (aHash) of each photo,
//     compared via Hamming distance against other photos in the same
//     gallery. Cheap, no ML model, good enough for its actual job — catching
//     near-identical burst shots, not semantically similar-but-different photos.
//
//   - Best Shot Selection: blur (edge-variance / "Laplacian-ish" sharpness)
//     and brightness (mean luminance) computed directly from pixel data via
//     sharp. Combined with face-api's smile/expression score (captured
//     client-side alongside face embeddings — see face.ts) and the existing
//     engagement score (getScoredPhotos in memories.ts) to rank "best shots"
//     — see quality-score.ts for how these are blended.
//
// Deliberately NOT a cloud vision API or a bundled ML model — this project
// already avoids server-side ML/ffmpeg dependencies wherever a plain pixel
// computation can do the job (see movie-renderer.ts's client-side rendering
// for the same reasoning applied to video).

import sharp from "sharp"

/**
 * 8x8 grayscale average hash. Returns a 16-char hex string encoding a 64-bit
 * hash. Near-identical images (recompressed, minor exposure shift, same
 * burst) produce hashes with a small Hamming distance; unrelated photos
 * produce hashes that differ in roughly half their bits.
 */
export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let sum = 0
  for (let i = 0; i < data.length; i++) sum += data[i]
  const avg = sum / data.length

  // BigInt() function calls (not `0n`/`1n` literal syntax) so this still
  // compiles under this project's ES2017 tsconfig target — literal BigInt
  // syntax requires ES2020+, but the BigInt runtime itself works fine here.
  const ZERO = BigInt(0)
  const ONE = BigInt(1)
  let hash = ZERO
  for (let i = 0; i < data.length; i++) {
    hash = (hash << ONE) | (data[i] >= avg ? ONE : ZERO)
  }
  return hash.toString(16).padStart(16, "0")
}

/** Number of differing bits between two hex-encoded hashes from computePerceptualHash. */
export function hammingDistanceHex(a: string, b: string): number {
  try {
    const ZERO = BigInt(0)
    const ONE = BigInt(1)
    let x = BigInt("0x" + a) ^ BigInt("0x" + b)
    let count = 0
    while (x > ZERO) {
      count += Number(x & ONE)
      x >>= ONE
    }
    return count
  } catch {
    return 64 // malformed hash — treat as maximally different, never a duplicate
  }
}

// Two photos from the same burst/moment consistently land within a handful
// of bits on an 8x8 aHash; unrelated photos of the same scene land much
// further apart. 8 out of 64 bits (~12.5%) is a conservative threshold that
// favors under-flagging (missing a near-duplicate) over false positives that
// would hide a guest's distinct photo from the gallery.
export const DUPLICATE_HAMMING_THRESHOLD = 8

/**
 * Edge-variance sharpness score computed via a Laplacian-style convolution
 * kernel — higher variance means more high-frequency detail (in focus),
 * lower variance means a smoother/blurrier image. Not calibrated to an
 * absolute "in focus" cutoff; used as a relative ranking signal across an
 * event's photos in quality-score.ts, not a pass/fail gate on its own.
 */
export async function computeBlurScore(buffer: Buffer): Promise<number> {
  const { data } = await sharp(buffer)
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .grayscale()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const n = data.length
  if (n === 0) return 0
  let mean = 0
  for (let i = 0; i < n; i++) mean += data[i]
  mean /= n
  let variance = 0
  for (let i = 0; i < n; i++) {
    const d = data[i] - mean
    variance += d * d
  }
  return variance / n
}

/** Mean luminance across RGB channels, normalized to 0-1. */
export async function computeBrightnessScore(buffer: Buffer): Promise<number> {
  const stats = await sharp(buffer).stats()
  const channels = stats.channels.slice(0, 3)
  if (channels.length === 0) return 0.5
  const meanAll = channels.reduce((s, c) => s + c.mean, 0) / channels.length
  return meanAll / 255
}

export interface QualitySignals {
  phash: string
  blurScore: number
  brightnessScore: number
}

/** Computes all three signals from one decode pass's worth of buffer reuse. */
export async function computeQualitySignals(buffer: Buffer): Promise<QualitySignals> {
  const [phash, blurScore, brightnessScore] = await Promise.all([
    computePerceptualHash(buffer),
    computeBlurScore(buffer),
    computeBrightnessScore(buffer),
  ])
  return { phash, blurScore, brightnessScore }
}
