// src/proxy.ts
// Renamed from middleware.ts in Next.js 16. Runs on the edge before each
// request. Used here for: auth refresh, security headers, request ID,
// and the `/admin` and `/dashboard` route guards (optimistic check — the
// page is the source of truth, this just short-circuits unauthenticated
// traffic).

import { NextResponse, type NextRequest } from "next/server"
import { serverEnv } from "@/lib/env"

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/pricing",
  "/features",
  "/faq",
  "/contact",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
])

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith("/event/")) return true
  if (pathname.startsWith("/api/qr/scan")) return true
  if (pathname.startsWith("/api/payments/webhooks")) return true
  if (pathname.startsWith("/api/ai/webhooks")) return true
  if (pathname.startsWith("/_next")) return true
  if (pathname.startsWith("/favicon")) return true
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true
  return false
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Request ID
  const reqId = request.headers.get("x-request-id") ?? crypto.randomUUID()

  // 2. Supabase auth — handled by `@supabase/ssr`'s session refresh in
  // route handlers/server components. Nothing to do here besides pass
  // through cookies, which Next.js does automatically.

  // 3. Security headers
  const res = NextResponse.next()
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("X-XSS-Protection", "1; mode=block")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
  res.headers.set("X-Request-Id", reqId)
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  if (serverEnv.NODE_ENV === "production") {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.razorpay.com",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data: https://*.gstatic.com",
        "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.razorpay.com https://*.resend.com https://graph.facebook.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    )
  }

  // 4. Optimistic auth gate
  if (!isPublic(pathname)) {
    const hasAuthCookie = Boolean(
      request.cookies.get("sb-access-token")?.value ||
        request.cookies.get("supabase-auth-token")?.value,
    )
    if (!hasAuthCookie && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
      const url = request.nextUrl.clone()
      const target = pathname.startsWith("/admin") ? "/admin/login" : "/login"
      url.pathname = target
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}
