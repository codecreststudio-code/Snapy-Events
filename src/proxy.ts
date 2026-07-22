import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

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
  "/admin/login",
])

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith("/event/")) return true
  if (pathname.startsWith("/api/auth/")) return true
  if (pathname.startsWith("/api/admin/auth/")) return true
  if (pathname.startsWith("/api/qr/")) return true
  if (pathname.startsWith("/api/photos/upload")) return true
  if (pathname.startsWith("/api/payments/webhooks")) return true
  if (pathname.startsWith("/api/ai/webhooks")) return true
  if (pathname.startsWith("/api/payments/plans")) return true
  if (pathname.startsWith("/api/payments/addons")) return true
  if (pathname.startsWith("/api/blog/")) return true
  if (pathname.startsWith("/api/contact")) return true
  if (pathname.startsWith("/_next")) return true
  if (pathname.toLowerCase().startsWith("/favicon")) return true
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true

  // Allow static image extensions
  const lower = pathname.toLowerCase()
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".ico") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  ) {
    return true
  }

  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const reqId = request.headers.get("x-request-id") ?? crypto.randomUUID()

  // Per-request CSP nonce (Next.js's documented pattern for a script-src
  // that doesn't need 'unsafe-inline' — see the CSP block below). Set on
  // the *request* headers (not just the response) so it flows through to
  // Server Components/route handlers via headers().get("x-nonce"), for any
  // inline <script> our own code renders (e.g. the blog post's JSON-LD tags
  // and the admin analytics HTML export's auto-print script) to attach it
  // via nonce={nonce}. Next.js also auto-detects this nonce from the CSP
  // header value and applies it to its own framework-injected inline
  // scripts, so no other wiring is needed for those.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  request.headers.set("x-nonce", nonce)

  // 1. Create response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Initialize Supabase SSR client for cookie refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Trigger session refresh to write updated cookies to response
  // (debug console.log/error calls that used to sit here — dev-gated, so
  // never actually reached in production — were removed; this middleware
  // runs on every single request, and per-request console noise isn't worth
  // it even in local dev. Use the request's X-Request-Id header to correlate
  // logs elsewhere if needed.)
  const { data: { user } } = await supabase.auth.getUser()

  // 4. Set security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
  response.headers.set("X-Request-Id", reqId)
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "img-src 'self' data: blob: https:",
        // Voice-note replies and recap videos are served straight from
        // Supabase Storage's public URL (not proxied through our own
        // origin), so 'self' alone 404-blocks every <audio>/<video> element
        // pointed at them — this was silently breaking voice-note playback
        // in production (console: "violates ... media-src 'self' blob:").
        "media-src 'self' blob: https://*.supabase.co",
        // 'unsafe-inline' replaced with a per-request nonce (generated
        // above) — closes off arbitrary inline-script execution (the
        // dangerous half of an XSS payload) while still allowing the
        // handful of inline scripts this app legitimately renders itself
        // (blog JSON-LD, admin export auto-print), which now carry
        // nonce={nonce}/nonce="${nonce}" explicitly. Per the CSP spec,
        // browsers that understand 'nonce-...' ignore 'unsafe-inline' when
        // both are present, so this is a real tightening, not cosmetic.
        `script-src 'self' 'nonce-${nonce}' https://*.supabase.co https://*.razorpay.com https://cdn.jsdelivr.net`,
        // style-src intentionally keeps 'unsafe-inline': this app uses
        // React inline style={{...}} extensively (dynamic gradients, per-
        // event theme colors, etc.), which renders as native style=""
        // attributes — governed by style-src, not nonce-able the way
        // <script> tags are (a nonce on a style attribute isn't a thing;
        // only nonces/hashes on <style> *elements* are supported, and CSP
        // has no per-attribute equivalent). Removing this would require
        // migrating every dynamic inline style to CSS custom properties/
        // classes first — a large, separate refactor, not a one-line fix.
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data: https://*.gstatic.com",
        "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://*.razorpay.com https://api.razorpay.com https://*.resend.com https://graph.facebook.com https://cdn.jsdelivr.net",
        "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    )
  }

  // 5. Auth route guards
  if (!isPublic(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone()
      const target = pathname.startsWith("/admin") ? "/admin/login" : "/login"
      url.pathname = target
      url.searchParams.set("next", pathname)
      return NextResponse.redirect(url)
    }

    // Admin guard
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      const { data: profile } = await supabase
        .from("users")
        .select("is_admin, role")
        .eq("id", user.id)
        .single()

      if (!profile?.is_admin) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
