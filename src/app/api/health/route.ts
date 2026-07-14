import { NextResponse } from "next/server"

// Public, unauthenticated liveness probe for Vercel/uptime monitors.
// Intentionally does no DB work — see /api/admin/health for a deep check.
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
}
