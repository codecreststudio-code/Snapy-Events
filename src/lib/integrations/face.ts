// src/lib/integrations/face.ts
// Face detection + embedding + search abstraction.
//
// ⚠️  STUB IMPLEMENTATION - NOT FOR PRODUCTION
//
// This is a deterministic stub that hashes photo URLs to fake embeddings.
// For production deployment, implement one of:
// - AWS Rekognition API
// - Azure Computer Vision
// - Google Cloud Vision API
// - Self-hosted FaceNet/ArcFace model
// - CloudFlare Workers with ONNX runtime
//
// The FACE_API_KEY env var is currently unused. Set it to enable
// real face detection when you've implemented a proper backend.

import "server-only"
import { serverEnv } from "@/lib/env"
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

const EMBEDDING_DIM = 128
const IS_PRODUCTION = process.env.NODE_ENV === "production"

function hashEmbedding(input: string): number[] {
  // ⚠️  STUB: Deterministic 128-dim pseudo-embedding, NOT real ML
  const out: number[] = new Array(EMBEDDING_DIM)
  let seed = 0
  for (let i = 0; i < input.length; i++) seed = (seed * 31 + input.charCodeAt(i)) >>> 0
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    out[i] = ((seed % 2000) - 1000) / 1000
  }
  return out
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

export interface DetectInput {
  imageUrl?: string
  imageBase64?: string
  maxFaces?: number
}

export async function detectFaces(input: DetectInput): Promise<DetectionResult> {
  // ⚠️  PRODUCTION GUARD
  if (IS_PRODUCTION && !serverEnv.FACE_API_KEY) {
    logger.error(
      "Face detection disabled: FACE_API_KEY not configured in production. " +
      "Set FACE_API_KEY environment variable to enable face detection."
    )
    return { model: "disabled", faces: [] }
  }

  const seed = input.imageUrl ?? input.imageBase64 ?? ""
  
  // Use stub if no real API configured
  if (!serverEnv.FACE_API_KEY) {
    logger.debug("Face detection using stub (development mode)")
    return {
      model: "stub",
      faces: [
        {
          boundingBox: { x: 100, y: 80, width: 120, height: 140 },
          confidence: 0.97,
          embedding: hashEmbedding(`face:${seed}`),
        },
      ],
    }
  }

  // TODO: Implement real face detection API call here
  // For now, log a warning that production API is not implemented
  logger.warn(
    "Face API integration incomplete. " +
    "TODO: Implement real face detection API call to " + serverEnv.FACE_API_KEY
  )
  
  return { model: "not-implemented", faces: [] }
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

export function searchByEmbedding(input: SearchInput): SearchHit[] {
  // ⚠️  STUB: Only works if both embeddings are from same stub function
  const k = input.topK ?? 20
  const threshold = input.threshold ?? 0.6
  return input.candidates
    .map((c) => ({ id: c.id, similarity: cosSim(input.embedding, c.embedding) }))
    .filter((h) => h.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
}

export interface BatchProcessInput {
  organizationId: string
  eventId: string
  photoIds: string[]
  imageUrls: string[]
}

export interface BatchProcessResult {
  processed: number
  facesDetected: number
  errors: { photoId: string; error: string }[]
}

export async function batchProcessFaces(input: BatchProcessInput): Promise<BatchProcessResult> {
  const out: BatchProcessResult = { processed: 0, facesDetected: 0, errors: [] }
  
  if (IS_PRODUCTION && !serverEnv.FACE_API_KEY) {
    const error = "Face detection disabled in production"
    logger.warn(error)
    return out
  }
  
  for (let i = 0; i < input.photoIds.length; i++) {
    try {
      const r = await detectFaces({ imageUrl: input.imageUrls[i] })
      out.processed++
      out.facesDetected += r.faces.length
    } catch (e) {
      out.errors.push({ photoId: input.photoIds[i], error: String(e) })
    }
  }
  return out
}
