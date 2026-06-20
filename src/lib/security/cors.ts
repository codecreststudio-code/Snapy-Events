// src/lib/security/cors.ts
// CORS headers utility for API routes that need cross-origin access
// (Razorpay webhooks, public event pages, etc.).

import { NextResponse } from "next/server"

export function corsHeaders(origin: string | null = "*") {
  const defaultOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"
  let allowed = defaultOrigin
  if (process.env.NODE_ENV !== "production") {
    allowed = origin ?? "*"
  }
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-razorpay-signature",
    "Access-Control-Max-Age": "86400",
  }
}

export function preflight(origin: string | null = "*") {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}
