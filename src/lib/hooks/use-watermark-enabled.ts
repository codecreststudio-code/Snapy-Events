"use client"

import { useQuery } from "@tanstack/react-query"

async function fetchWatermarkEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/settings/watermark-status")
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.enabled)
  } catch {
    return false
  }
}

/**
 * Whether Admin > Feature Flags → "Automated Image Watermarking" is
 * currently on. Used by client components that can't call the server-only
 * getFeatureFlags() directly (the guest gallery's client component, the
 * host dashboard timeline). Cached for a few minutes since this rarely
 * changes and every media tile would otherwise trigger its own fetch.
 */
export function useWatermarkEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ["platform-watermark-enabled"],
    queryFn: fetchWatermarkEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
  return data ?? false
}
