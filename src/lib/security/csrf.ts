// src/lib/security/csrf.ts
// CSRF protection for state-changing requests. Relies primarily on SameSite=Lax
// cookies (defense-in-depth). Also checks Origin/Referer headers and supports
// double-submit cookie pattern for clients that provide x-csrf-token.

import { cookies } from "next/headers"
import { createHmac, randomBytes } from "node:crypto"
import type { NextRequest } from "next/server"

const COOKIE = "csrf_token"


function secret(): string {
  const csrfSecret = process.env.CSRF_SECRET
  if (!csrfSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CSRF_SECRET environment variable is not set. This is a security configuration error.")
    }
    return "csrf-dev-secret-do-not-use-in-production"
  }
  return csrfSecret
}

export async function ensureCsrfCookie(): Promise<string> {
  const store = await cookies()
  const existing = store.get(COOKIE)?.value
  if (existing) return existing
  const raw = randomBytes(16).toString("hex")
  const token = sign(raw)
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  store.set(`${COOKIE}_raw`, raw, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return token
}

function getAllowedOrigins(): string[] {
  const origins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    "https://snapsy-events.vercel.app",
  ].filter((x): x is string => !!x)
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://localhost:3001")
  }
  return origins
}

export async function verifyCsrf(
  headerToken: string | null | undefined,
  request?: NextRequest,
): Promise<boolean> {
  // Defense-in-depth: check Origin/Referer. With SameSite=Lax cookies, this
  // catches the remaining cases where SameSite doesn't apply (e.g. some
  // browser configurations, or if SameSite is downgraded by a proxy).
  if (request) {
    const origin = request.headers.get("origin")
    const referer = request.headers.get("referer")
    const source = origin || referer
    if (source) {
      // Compare by exact ORIGIN, not startsWith — otherwise
      // "https://app.example.com.evil.com" passes the "https://app.example.com" prefix.
      let srcOrigin: string | null = origin
      if (!srcOrigin && referer) {
        try { srcOrigin = new URL(referer).origin } catch { srcOrigin = null }
      }
      if (!srcOrigin) return false
      const allowed = getAllowedOrigins()
      const isAllowed = allowed.some((a) => {
        try { return new URL(a).origin === srcOrigin } catch { return a === srcOrigin }
      })
      if (!isAllowed) return false
      // Same-origin request with SameSite=Lax cookie — safe.
      return true
    }
  }

  // No Origin/Referer header (e.g. server-to-server, curl, some mobile clients).
  // Fall back to double-submit cookie pattern.
  if (!headerToken) return false

  const store = await cookies()
  const rawCookie = store.get(`${COOKIE}_raw`)?.value
  if (rawCookie && safeEqual(headerToken, rawCookie)) return true

  const signedCookie = store.get(COOKIE)?.value
  if (signedCookie && safeEqual(headerToken, signedCookie)) return true

  return false
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let res = 0
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return res === 0
}
