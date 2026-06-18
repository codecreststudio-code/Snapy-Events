// src/lib/security/cors.ts
// CORS headers utility for API routes that need cross-origin access
// (Razorpay webhooks, public event pages, etc.).

import { NextResponse } from "next/server"

export function corsHeaders(origin: string | null = "*") {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-razorpay-signature",
    "Access-Control-Max-Age": "86400",
  }
}

export function preflight(origin: string | null = "*") {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}
