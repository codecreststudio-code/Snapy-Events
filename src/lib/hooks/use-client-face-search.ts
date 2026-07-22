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

        let searchResults = resData.data?.results || []

        // If no results because photos in this event haven't been indexed into `faces` table yet,
        // automatically index event photos using in-browser face-api (Option A - Zero Cost) and re-search!
        if (searchResults.length === 0 && Array.isArray(resData.data?.photos_to_index) && resData.data.photos_to_index.length > 0 && clientEmbedding) {
          setStatusMessage("Indexing event photos on device...")
          const photosToIndex = resData.data.photos_to_index
          const facesToIndex: Array<{ photo_id: string; embedding: number[] }> = []

          for (const item of photosToIndex) {
            try {
              const embeddings = await extractAllEmbeddingsFromUrl(item.url)
              for (const emb of embeddings) {
                facesToIndex.push({ photo_id: item.id, embedding: emb })
              }
            } catch (idxErr) {
              console.warn("[client-face-search] Failed to index photo:", item.id, idxErr)
            }
          }

          if (facesToIndex.length > 0) {
            setStatusMessage("Saving photo indices...")
            await fetch("/api/ai/faces/index", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event_id: options.eventId,
                faces: facesToIndex,
              }),
            })

            // Re-run search now that faces are indexed!
            setStatusMessage("Finalizing match search...")
            const reSearchResponse = await fetch("/api/ai/faces/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
            if (reSearchResponse.ok) {
              const reData = await reSearchResponse.json()
              searchResults = reData.data?.results || []
            }
          }
        }

        setResults(searchResults)
        setStatusMessage(null)
      } catch (err: any) {
        console.error("[useClientFaceSearch] Error:", err)
        setError(err.message || "An error occurred during face search")
      } finally {
        setIsProcessing(false)
        setStatusMessage(null)
      }
    },
    [options.galleryId, options.eventId]
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
 * Client-side face descriptor extraction helper for data URLs.
 */
async function extractEmbeddingClientSide(dataUrl: string): Promise<number[] | null> {
  const all = await extractAllEmbeddingsFromUrl(dataUrl)
  return all.length > 0 ? all[0] : null
}

/**
 * Client-side face descriptor extraction helper for any image URL or Data URL.
 * Extracts ALL faces present in the image for accurate group photo matching.
 */
async function extractAllEmbeddingsFromUrl(imageUrl: string): Promise<number[][]> {
  if (typeof window === "undefined") return []

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      try {
        const faceapi = await import("@vladmandic/face-api")

        if (!faceapi.nets.tinyFaceDetector.params) {
          const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ])
        }

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
        const detections = await faceapi.detectAllFaces(img, options).withFaceLandmarks().withFaceDescriptors()

        if (detections && detections.length > 0) {
          resolve(detections.map((d: any) => Array.from(d.descriptor)))
        } else {
          resolve([])
        }
      } catch (e) {
        console.warn("Client-side multi-face extraction error:", e)
        resolve([])
      }
    }
    img.onerror = () => resolve([])
    img.src = imageUrl
  })
}
