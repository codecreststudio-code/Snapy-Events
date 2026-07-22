// src/lib/integrations/face.ts
// Face detection + embedding + search — powered by face-api.js running
// entirely inside this Node process (TensorFlow.js WASM backend).
//
// This is a genuinely free, self-hosted implementation: no external API,
// no per-image billing, no API key. Model weights ship inside the
// @vladmandic/face-api npm package itself (node_modules/@vladmandic/face-api/model)
// so `npm install` is the only "download" step — nothing extra to bundle.
// See next.config.ts outputFileTracingIncludes for why that path needs to
// be listed explicitly for Vercel. Loaded once per server instance.
// Images are decoded with @canvas/image
// (pure WASM/JS decoders — no native `canvas`/cairo dependency), which
// keeps this compatible with Vercel serverless functions.
//
// Detection uses the "tiny" face detector (fast, small model — good fit
// for guest-selfie matching at event scale). If you need higher accuracy
// on group photos with small/partial faces, swap in `ssdMobilenetv1`
// (its weights are already present in the same model/ directory).

import "server-only"
import path from "node:path"
import sharp from "sharp"
import { logger } from "@/lib/logger"

export interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
  embedding: number[]
}

export interface DetectionResult {
  faces: DetectedFace[]
  model: string
  width?: number
  height?: number
}

const MODEL_DIR = path.join(process.cwd(), "node_modules", "@vladmandic", "face-api", "model")
const MODEL_ID = "face-api-tiny-wasm-v1"

// The tiny face detector runs at a fixed inputSize of 416px (see
// TinyFaceDetectorOptions below) — feeding it a full-resolution phone-camera
// original (commonly 3000-4000px+, 12MP+) buys zero detection benefit while
// multiplying memory cost at every step of the pipeline below: decoding to
// raw RGBA pixels, boxing those pixels into a tensor, and holding the WASM
// backend + model weights in the same process. A 12MP RGBA buffer alone is
// ~48M bytes; without this cap this route was crashing the entire Vercel
// serverless function (an OOM kill, surfaced to the client as a raw
// platform-level 500 with no app-level error detail — not a caught
// exception) rather than gracefully returning zero faces for that photo.
const MAX_DETECT_DIMENSION = 1280

// @tensorflow/tfjs-backend-wasm's package.json "main" points at the Node
// build (dist/tf-backend-wasm.node.js), but bundlers commonly prefer its
// "module" field (dist/index.js, the browser/isomorphic build) instead —
// that build locates its .wasm binary via a `scriptDirectory`-relative
// guess that breaks once Next.js re-packages this route into a serverless
// Lambda (the .wasm file no longer sits where the bundled code expects).
// Importing the Node subpath explicitly forces the fs-based build
// regardless of what the bundler would otherwise resolve — same defensive
// pattern already used below for face-api's own node-wasm build.
const WASM_DIR = path.join(process.cwd(), "node_modules", "@tensorflow", "tfjs-backend-wasm", "dist") + "/"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceapiPromise: Promise<any> | null = null
let modelsLoadedPromise: Promise<void> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFaceApi(): Promise<any> {
  if (!faceapiPromise) {
    faceapiPromise = (async () => {
      const tf = await import("@tensorflow/tfjs")
      // This subpath (the Node-native build) has no adjacent .d.ts, unlike
      // the package's top-level "index.d.ts" — @ts-expect-error is the
      // correct suppression (not a real "any" typing issue) since import()
      // itself is what TS can't resolve types for here.
      // @ts-expect-error - no type declarations for this subpath import
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wasmBackend: any = await import("@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.node.js")
      // Point directly at the on-disk .wasm binaries (also explicitly
      // included in next.config.ts's outputFileTracingIncludes, since
      // Next's automatic tracer can't see this fs-based lookup either) and
      // force the platform `fs.readFileSync` path instead of a `fetch()`,
      // which wouldn't work against a plain filesystem path under Node.
      wasmBackend.setWasmPaths(WASM_DIR, true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faceapi: any = await import("@vladmandic/face-api/dist/face-api.node-wasm.js")
      await tf.setBackend("wasm")
      await tf.ready()
      return faceapi
    })()
  }
  return faceapiPromise
}

async function ensureModelsLoaded(): Promise<void> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = (async () => {
      const faceapi = await getFaceApi()
      await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_DIR)
      await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR)
      await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR)
      logger.info("[face] models loaded", { dir: MODEL_DIR })
    })()
  }
  return modelsLoadedPromise
}

export interface DetectInput {
  imageUrl?: string
  imageBase64?: string
  maxFaces?: number
}

async function loadImageBuffer(input: DetectInput): Promise<Buffer> {
  if (input.imageUrl) {
    const res = await fetch(input.imageUrl)
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`)
    return Buffer.from(await res.arrayBuffer())
  }
  if (input.imageBase64) {
    // Accept either a raw base64 string or a full "data:image/...;base64,xxx" URL.
    const raw = input.imageBase64.includes(",") ? input.imageBase64.split(",").pop()! : input.imageBase64
    return Buffer.from(raw, "base64")
  }
  throw new Error("detectFaces requires imageUrl or imageBase64")
}

export async function detectFaces(input: DetectInput): Promise<DetectionResult> {
  let faceapi: Awaited<ReturnType<typeof getFaceApi>>
  let tf: typeof import("@tensorflow/tfjs")
  try {
    faceapi = await getFaceApi()
    await ensureModelsLoaded()
    tf = await import("@tensorflow/tfjs")
  } catch (err) {
    logger.error("[face] failed to initialize model runtime", { error: String(err) })
    return { model: MODEL_ID, faces: [] }
  }

  let buffer: Buffer
  try {
    buffer = await loadImageBuffer(input)
  } catch (err) {
    logger.error("[face] failed to load image", { error: String(err) })
    return { model: MODEL_ID, faces: [] }
  }

  const canvasImage = await import("@canvas/image")
  let width = 0
  let height = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tensor: any
  try {
    // Downscale BEFORE decoding to raw pixels — sharp resizes the compressed
    // (jpeg/png/webp) buffer itself, so the decoder below never has to hold
    // a full-resolution RGBA buffer in memory for a typical multi-megapixel
    // phone-camera original. Falls back to the original buffer if sharp
    // can't process it (e.g. an already-tiny or corrupt image) rather than
    // failing detection outright.
    let detectBuffer = buffer
    try {
      detectBuffer = await sharp(buffer)
        .resize(MAX_DETECT_DIMENSION, MAX_DETECT_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .toBuffer()
    } catch (resizeErr) {
      logger.error("[face] resize before detect failed, using original buffer", { error: String(resizeErr) })
    }

    const canvas = await canvasImage.imageFromBuffer(detectBuffer)
    const imageData = canvasImage.getImageData(canvas)
    if (!imageData) throw new Error("Failed to read pixel data from decoded image")
    width = canvas.width
    height = canvas.height
    tensor = tf.tidy(() => {
      // Pass the decoded Uint8ClampedArray straight to tf.tensor — the
      // previous Array.from(imageData.data) boxed every pixel byte into a
      // plain JS array first, an unnecessary allocation on top of an
      // already resize-capped buffer that (combined with the WASM backend +
      // model weights sharing the same process) was pushing this function
      // past its serverless memory budget and getting OOM-killed — which
      // surfaces to the client as a raw platform 500, not a catchable error.
      const data = tf.tensor(imageData.data, [canvas.height, canvas.width, 4], "int32")
      const channels = tf.split(data, 4, 2)
      const rgb = tf.stack([channels[0], channels[1], channels[2]], 2)
      return tf.reshape(rgb, [1, canvas.height, canvas.width, 3])
    })
  } catch (err) {
    logger.error("[face] failed to decode image", { error: String(err) })
    return { model: MODEL_ID, faces: [], width, height }
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
    const detections = await faceapi.detectAllFaces(tensor, options).withFaceLandmarks().withFaceDescriptors()

    const maxFaces = input.maxFaces ?? 50
    const faces: DetectedFace[] = detections
      .slice(0, maxFaces)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({
        boundingBox: {
          x: Math.round(r.detection.box.x),
          y: Math.round(r.detection.box.y),
          width: Math.round(r.detection.box.width),
          height: Math.round(r.detection.box.height),
        },
        confidence: r.detection.score,
        embedding: Array.from(r.descriptor as Float32Array) as number[],
      }))

    return { model: MODEL_ID, faces, width, height }
  } catch (err) {
    logger.error("[face] detection failed", { error: String(err) })
    return { model: MODEL_ID, faces: [], width, height }
  } finally {
    tensor.dispose()
  }
}

export interface SearchInput {
  embedding: number[]
  candidates: { id: string; embedding: number[] }[]
  topK?: number
  threshold?: number
}

export interface SearchHit {
  id: string
  similarity: number
}

function cosSim(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1
  return dot / denom
}

export function searchByEmbedding(input: SearchInput): SearchHit[] {
  const k = input.topK ?? 20
  // face-api.js 128-d descriptors are L2 normalized. True matches of the same
  // person across different photos/angles score >= 0.60, while different people score < 0.50.
  const threshold = input.threshold ?? 0.60
  return input.candidates
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length === input.embedding.length)
    .map((c) => ({ id: c.id, similarity: cosSim(input.embedding, c.embedding) }))
    .filter((h) => h.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
}

export interface FaceClusterCandidate {
  id: string
  embedding: number[]
}

/**
 * Greedy nearest-cluster assignment: compares a new face's descriptor against
 * every existing cluster's representative-face descriptor (cosine similarity,
 * same metric/threshold as searchByEmbedding) and returns the best match
 * above `threshold`, or null when nothing qualifies — callers should start a
 * new cluster in that case.
 */
export function pickBestCluster(
  embedding: number[],
  clusters: FaceClusterCandidate[],
  threshold = 0.75,
): string | null {
  let bestId: string | null = null
  let bestScore = -Infinity
  for (const c of clusters) {
    if (!Array.isArray(c.embedding) || c.embedding.length !== embedding.length) continue
    const score = cosSim(embedding, c.embedding)
    if (score >= threshold && score > bestScore) {
      bestScore = score
      bestId = c.id
    }
  }
  return bestId
}

export interface DetectAndStoreParams {
  eventId: string
  photoId: string
  imageUrl: string
}

export interface DetectAndStoreResult {
  facesDetected: number
}

/**
 * Runs detection for a single photo, persists each detected face to the
 * `faces` table, and greedily assigns each face to an existing `face_clusters`
 * row (by comparing against that cluster's representative face) or creates a
 * new cluster when nothing matches closely enough. This is the piece that
 * was entirely missing before: `faces` rows could be created by the old
 * per-route insert logic, but nothing anywhere ever wrote to `face_clusters`,
 * so the "AI Smart Clusters" panel (which queries `face_clusters` directly)
 * was permanently empty regardless of how much detection ran.
 *
 * `supabase` is typed loosely (any Supabase client shape with `.from`) so
 * this can be called with either the cookie-scoped server client or the
 * service-role client depending on the caller's auth context.
 */
export async function detectAndStoreFaces(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: DetectAndStoreParams,
): Promise<DetectAndStoreResult> {
  const det = await detectFaces({ imageUrl: params.imageUrl })

  if (det.faces.length > 0) {
    // Existing clusters for this event, each carrying its representative
    // face's descriptor so newly detected faces can be matched against them.
    const { data: existingClusters, error: clustersReadErr } = await supabase
      .from("face_clusters")
      .select("id, representative_face:representative_face_id(embedding)")
      .eq("event_id", params.eventId)

    if (clustersReadErr) {
      logger.error("[face] failed to read existing face_clusters", { eventId: params.eventId, error: clustersReadErr.message })
    }

    const clusterCandidates: FaceClusterCandidate[] = (existingClusters ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => ({ id: c.id, embedding: c.representative_face?.embedding }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => Array.isArray(c.embedding) && c.embedding.length > 0)

    for (const f of det.faces) {
      const { data: inserted, error: insertErr } = await supabase
        .from("faces")
        .insert({
          photo_id: params.photoId,
          event_id: params.eventId,
          bounding_box: f.boundingBox,
          confidence: f.confidence,
          embedding: f.embedding,
          embedding_model: det.model,
        })
        .select("id")
        .single()

      // Previously: a failed insert (RLS denial, constraint violation, etc.)
      // silently `continue`d to the next face with no log and no error
      // surfaced anywhere — the route would still report facesDetected
      // based on raw detection count, so a host could see "found 3 faces"
      // in the toast while zero rows (and zero clusters) actually existed
      // in the database. Throwing here instead lets the per-photo try/catch
      // in the batch-process route record and surface the real failure.
      if (insertErr || !inserted) {
        throw new Error(`Failed to persist detected face: ${insertErr?.message || "insert returned no row"}`)
      }

      const clusterId = pickBestCluster(f.embedding, clusterCandidates)
      if (clusterId) {
        const { error: assignErr } = await supabase.from("faces").update({ cluster_id: clusterId }).eq("id", inserted.id)
        if (assignErr) logger.error("[face] failed to assign face to cluster", { faceId: inserted.id, clusterId, error: assignErr.message })
        const { data: clusterRow } = await supabase
          .from("face_clusters")
          .select("face_count")
          .eq("id", clusterId)
          .single()
        const { error: countErr } = await supabase
          .from("face_clusters")
          .update({ face_count: (clusterRow?.face_count ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", clusterId)
        if (countErr) logger.error("[face] failed to update cluster face_count", { clusterId, error: countErr.message })
      } else {
        const { data: newCluster, error: newClusterErr } = await supabase
          .from("face_clusters")
          .insert({ event_id: params.eventId, representative_face_id: inserted.id, face_count: 1 })
          .select("id")
          .single()
        if (newCluster) {
          await supabase.from("faces").update({ cluster_id: newCluster.id }).eq("id", inserted.id)
          clusterCandidates.push({ id: newCluster.id, embedding: f.embedding })
        } else {
          logger.error("[face] failed to create new face_cluster", {
            eventId: params.eventId,
            faceId: inserted.id,
            error: newClusterErr?.message,
          })
        }
      }
    }
  }

  await supabase.from("photos").update({ face_count: det.faces.length }).eq("id", params.photoId)
  return { facesDetected: det.faces.length }
}
