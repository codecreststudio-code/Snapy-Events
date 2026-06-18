// src/lib/integrations/storage.ts
// Supabase Storage helpers — upload, signed URL, delete, transform.

import "server-only"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { STORAGE_BUCKETS } from "@/lib/constants"
import { logger } from "@/lib/logger"

export interface UploadOptions {
  bucket: keyof typeof STORAGE_BUCKETS
  path: string
  file: File | Blob
  contentType?: string
  cacheControl?: string
  upsert?: boolean
}

export async function uploadFile(opts: UploadOptions): Promise<{ path: string; publicUrl: string | null }> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS[opts.bucket])
    .upload(opts.path, opts.file, {
      contentType: opts.contentType,
      cacheControl: opts.cacheControl ?? "3600",
      upsert: opts.upsert ?? true,
    })
  if (error) {
    logger.error("storage upload error", { error: error.message })
    throw new Error(`Upload failed: ${error.message}`)
  }
  const { data: pub } = supabase.storage.from(STORAGE_BUCKETS[opts.bucket]).getPublicUrl(data.path)
  return { path: data.path, publicUrl: pub.publicUrl }
}

export async function signedUrl(bucket: keyof typeof STORAGE_BUCKETS, path: string, expiresIn = 3600) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.storage.from(STORAGE_BUCKETS[bucket]).createSignedUrl(path, expiresIn)
  if (error) {
    logger.error("storage signed url error", { error: error.message })
    return null
  }
  return data.signedUrl
}

export async function deleteFile(bucket: keyof typeof STORAGE_BUCKETS, path: string) {
  const supabase = await createServiceClient()
  const { error } = await supabase.storage.from(STORAGE_BUCKETS[bucket]).remove([path])
  if (error) throw new Error(error.message)
  return true
}

export function publicUrl(bucket: keyof typeof STORAGE_BUCKETS, path: string) {
  // publicUrl is synchronous; uses the anon client config (env at import time)
  // In a server context the service client is preferred for accurate signing.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ""
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS[bucket]}/${path}`
}

export function transformedImageUrl(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  opts: { width?: number; height?: number; quality?: number; format?: "webp" | "avif" | "origin" } = {},
) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ""
  const params = new URLSearchParams()
  if (opts.width) params.set("width", String(opts.width))
  if (opts.height) params.set("height", String(opts.height))
  if (opts.quality) params.set("quality", String(opts.quality))
  if (opts.format && opts.format !== "origin") params.set("format", opts.format)
  const qs = params.toString()
  return `${base}/storage/v1/render/image/public/${STORAGE_BUCKETS[bucket]}/${path}${qs ? `?${qs}` : ""}`
}
