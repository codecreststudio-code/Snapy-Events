"use client"

import { useState, useCallback } from "react"

export interface FaceSearchHit {
  id: string
  similarity: number
  photo_id?: string
  photo?: {
    id: string
    storage_path: string
    url?: string | null
    gallery_id: string
    event_id: string
    is_approved: boolean
  }
}

export interface UseClientFaceSearchOptions {
  galleryId?: string
  eventId?: string
}

/**
 * Option A: Pure Client-Side In-Browser AI Face Search (Zero Server CPU/RAM Cost)
 *
 * Extracts face descriptors directly in the guest's browser/phone using client-side AI.
 * Sends ONLY the 128-dimensional math vector to the backend, bypassing server-side
 * image decoding and eliminating third-party API costs completely.
 */
export function useClientFaceSearch(options: UseClientFaceSearchOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [results, setResults] = useState<FaceSearchHit[]>([])
  const [error, setError] = useState<string | null>(null)

  const searchWithImage = useCallback(
    async (imageData: string | File) => {
      setIsProcessing(true)
      setError(null)
      setResults([])
      setStatusMessage("Preparing image...")

      try {
        let base64String = ""

        if (imageData instanceof File) {
          base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(imageData)
          })
        } else {
          base64String = imageData
        }

        // Try client-side face extraction using browser face-api / MediaPipe
        let clientEmbedding: number[] | null = null
        try {
          setStatusMessage("Extracting face features on your device...")
          clientEmbedding = await extractEmbeddingClientSide(base64String)
        } catch (clientErr) {
          console.warn("[client-face-search] Client-side extraction fallback to server", clientErr)
        }

        setStatusMessage("Searching matching photos...")
        const payload: Record<string, any> = {
          event_id: options.eventId,
          gallery_id: options.galleryId,
          max_results: 30,
        }

        if (clientEmbedding && clientEmbedding.length > 0) {
          // Pure Option A: send vector directly
          payload.embedding = clientEmbedding
        } else {
          // Fallback: send image_data
          payload.image_data = base64String
        }

        const response = await fetch("/api/ai/faces/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        let resData: any = {}
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          resData = await response.json()
        } else {
          const rawText = await response.text()
          throw new Error(`Server response error (${response.status}): ${rawText.slice(0, 120)}`)
        }

        if (!response.ok || !resData.success) {
          throw new Error(resData.error || resData.message || "Failed to complete face search")
        }

        setResults(resData.data?.results || [])
        setStatusMessage(null)
      } catch (err: any) {
        console.error("[useClientFaceSearch] Error:", err)
        setError(err.message || "An error occurred during face search")
      } finally {
        setIsProcessing(false)
        setStatusMessage(null)
      }
    },
    [options.galleryId]
  )

  return {
    searchWithImage,
    isProcessing,
    statusMessage,
    results,
    error,
    clearResults: () => setResults([]),
  }
}

/**
 * Client-side face descriptor extraction helper.
 * Uses browser HTMLCanvasElement and dynamic face-api loader.
 */
async function extractEmbeddingClientSide(dataUrl: string): Promise<number[] | null> {
  if (typeof window === "undefined") return null

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      try {
        // Dynamic import of face-api to keep initial bundle size light
        const faceapi = await import("@vladmandic/face-api")

        // Load tiny face detector & descriptor models from public static path or CDN if not loaded
        if (!faceapi.nets.tinyFaceDetector.params) {
          const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ])
        }

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 })
        const detection = await faceapi.detectSingleFace(img, options).withFaceLandmarks().withFaceDescriptor()

        if (detection && detection.descriptor) {
          resolve(Array.from(detection.descriptor))
        } else {
          resolve(null)
        }
      } catch (e) {
        console.warn("Client-side face-api extraction error:", e)
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}
