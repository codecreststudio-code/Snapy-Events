// src/lib/env.ts
// Centralized, typed environment access. Fails loudly on build if required
// values are missing, but tolerates missing values in environments where the
// variables are not needed (e.g. the marketing site on Vercel preview).

import { z } from "zod"

const serverSchema = z.object({
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Payments
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Admin credentials (MUST be set in production via environment variables — never hardcode)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  // Security
  CSRF_SECRET: z.string().min(32).optional(),
  // Messaging
  WHATSAPP_BUSINESS_API_KEY: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  // AI
  FACE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  // Observability
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  // Rate limiting / cache
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // App
  APP_URL: z.string().url().default("https://snapsy-events.vercel.app"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
})

function parseClient() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  })
  if (!parsed.success && process.env.NODE_ENV === "production") {
    // Soft warn — Vercel preview URLs may not have full env in dev.
    console.warn("[env] public env validation failed", parsed.error.flatten().fieldErrors)
  }
  return parsed.success
    ? parsed.data
    : {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      }
}

// Server env vars that MUST be present in production for the app to run safely.
// A missing value here means silent runtime failure (unverified webhooks, broken
// billing, RLS-bypass client that can't init) — so we fail the boot instead.
const REQUIRED_IN_PROD = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "CSRF_SECRET",
] as const

function parseServer() {
  const parsed = serverSchema.safeParse(process.env)
  // Skip during `next build` (NEXT_PHASE) — secrets may only be injected at
  // runtime; we don't want to fail the CI build, only refuse to serve traffic.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
  if (process.env.NODE_ENV === "production" && !isBuildPhase) {
    const missing = REQUIRED_IN_PROD.filter((k) => !process.env[k])
    if (missing.length > 0) {
      throw new Error(
        `[env] Missing required production environment variables: ${missing.join(", ")}. ` +
        `Refusing to boot with an insecure/incomplete configuration.`,
      )
    }
  }
  if (!parsed.success) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[env] server env validation failed", parsed.error.flatten().fieldErrors)
    }
    return {
      ...process.env,
      APP_URL: process.env.APP_URL ?? "https://snapsy-events.vercel.app",
      NODE_ENV: process.env.NODE_ENV ?? "development",
    } as any
  }
  return parsed.data
}

export const clientEnv = parseClient()
export const serverEnv = parseServer()

export const publicEnv = {
  SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  APP_URL: clientEnv.NEXT_PUBLIC_APP_URL ?? serverEnv.APP_URL,
  RAZORPAY_KEY_ID: clientEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? serverEnv.RAZORPAY_KEY_ID ?? "",
}
