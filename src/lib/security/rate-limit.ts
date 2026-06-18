// src/lib/security/rate-limit.ts
// Edge-friendly in-memory + Upstash Redis rate limiter. Falls back to the
// in-process map when Upstash is not configured (development / single-region
// dev). Production multi-region deployments MUST set Upstash env vars.

import { serverEnv } from "@/lib/env"

interface Bucket {
  count: number
  reset: number // epoch ms
}

const local = new Map<string, Bucket>()

interface LimitResult {
  allowed: boolean
  remaining: number
  resetIn: number // seconds
}

export async function rateLimit(opts: { key: string; limit: number; windowSeconds: number }): Promise<LimitResult> {
  const { key, limit, windowSeconds } = opts
  if (serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN) {
    return upstashLimit(key, limit, windowSeconds)
  }
  return localLimit(key, limit, windowSeconds)
}

function localLimit(key: string, limit: number, windowSeconds: number): LimitResult {
  const now = Date.now()
  const b = local.get(key)
  if (!b || b.reset < now) {
    local.set(key, { count: 1, reset: now + windowSeconds * 1000 })
    return { allowed: true, remaining: limit - 1, resetIn: windowSeconds }
  }
  b.count += 1
  const remaining = Math.max(0, limit - b.count)
  const resetIn = Math.max(0, Math.ceil((b.reset - now) / 1000))
  return { allowed: b.count <= limit, remaining, resetIn }
}

async function upstashLimit(key: string, limit: number, windowSeconds: number): Promise<LimitResult> {
  const url = `${serverEnv.UPSTASH_REDIS_REST_URL}/incr/${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${serverEnv.UPSTASH_REDIS_REST_TOKEN}` },
  })
  if (!res.ok) {
    // Fail open
    return { allowed: true, remaining: limit, resetIn: windowSeconds }
  }
  const data: { result: number } = await res.json()
  const count = data.result
  // Expire the bucket
  await fetch(
    `${serverEnv.UPSTASH_REDIS_REST_URL}/expire/${encodeURIComponent(key)}/${windowSeconds}`,
    { method: "POST", headers: { Authorization: `Bearer ${serverEnv.UPSTASH_REDIS_REST_TOKEN}` } },
  ).catch(() => null)
  const allowed = count <= limit
  return { allowed, remaining: Math.max(0, limit - count), resetIn: windowSeconds }
}
