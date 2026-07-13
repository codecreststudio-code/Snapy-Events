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
  if (process.env.NODE_ENV === "development") {
    // Only log in development, never in production
    console.log(`[Proxy Request] ${pathname} (${request.cookies.getAll().length} cookies)`)
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError && process.env.NODE_ENV === "development") {
    console.error(`[Proxy Auth Error] ${pathname}:`, authError.message)
  }
  if (process.env.NODE_ENV === "development") {
    console.log(`[Proxy Auth] ${pathname}:`, user ? "authenticated" : "unauthenticated")
  }

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
        "media-src 'self' blob:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.razorpay.com",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data: https://*.gstatic.com",
        "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://*.razorpay.com https://api.razorpay.com https://*.resend.com https://graph.facebook.com",
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

      if (!profile?.is_admin && profile?.role !== "owner") {
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
