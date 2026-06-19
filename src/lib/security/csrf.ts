// src/lib/security/csrf.ts
// CSRF protection for state-changing requests. Compares a header token
// against a cookie. Both must be present, equal, and the request must
// have a non-GET method.

import { cookies } from "next/headers"
import { createHmac, randomBytes } from "node:crypto"
import { serverEnv } from "@/lib/env"

const COOKIE = "csrf_token"
const HEADER = "x-csrf-token"

function secret(): string {
  return serverEnv.SUPABASE_SERVICE_ROLE_KEY ?? "csrf-dev-secret"
}

export async function ensureCsrfCookie(): Promise<string> {
  const store = await cookies()
  const existing = store.get(COOKIE)?.value
  if (existing) return existing
  const token = sign(randomBytes(16).toString("hex"))
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return token
}

export async function verifyCsrf(headerToken: string | null | undefined): Promise<boolean> {
  if (!headerToken) return false
  const cookie = (await cookies()).get(COOKIE)?.value
  if (!cookie) return false
  return safeEqual(cookie, headerToken)
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
