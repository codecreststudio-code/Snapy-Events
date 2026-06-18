// src/lib/integrations/face.ts
// Face detection + embedding + search abstraction.
//
// In production, this points at a hosted face API (e.g. AWS Rekognition,
// a self-hosted FaceNet endpoint, or OpenAI Vision). For local dev and
// testing, we ship a deterministic stub that hashes the photo URL to a
// 128-dim "embedding" — enough to exercise the API surface end-to-end
// without a real model.

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

function hashEmbedding(input: string): number[] {
  // Deterministic 128-dim pseudo-embedding in [-1, 1].
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
  const seed = input.imageUrl ?? input.imageBase64 ?? ""
  if (!serverEnv.FACE_API_KEY) {
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
  try {
    const res = await fetch("https://api.face-api.example/v1/detect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.FACE_API_KEY}`,
      },
      body: JSON.stringify({ image: input.imageBase64 ?? input.imageUrl, max_faces: input.maxFaces ?? 10 }),
    })
    if (!res.ok) {
      logger.warn("face api non-ok; falling back to stub", { status: res.status })
      return {
        model: "stub",
        faces: [
          {
            boundingBox: { x: 0, y: 0, width: 0, height: 0 },
            confidence: 0,
            embedding: hashEmbedding(seed),
          },
        ],
      }
    }
    const data = (await res.json()) as { faces: DetectedFace[]; width: number; height: number; model: string }
    return { faces: data.faces, model: data.model, width: data.width, height: data.height }
  } catch (e) {
    logger.error("face api error", { error: String(e) })
    return { model: "stub", faces: [] }
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

export function searchByEmbedding(input: SearchInput): SearchHit[] {
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
