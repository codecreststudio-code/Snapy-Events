// src/lib/security/client-ip.ts
//
// Fixes: every rate-limit/audit-log call site that wanted "the caller's IP"
// took the FIRST entry of the X-Forwarded-For header. X-Forwarded-For is a
// comma-separated chain that each proxy hop APPENDS to (never replaces) —
// so the first entry is whatever the ORIGINAL CLIENT claimed, which is
// fully attacker-controlled on a raw HTTP request (curl -H "X-Forwarded-For:
// 1.2.3.4" ...). The rate limiter (src/lib/api/handler.ts) keys its
// per-minute buckets on this value, so trusting the first entry meant
// anyone could dodge every IP-based rate limit in the app (coupon
// brute-force, join-code brute-force, checkout spam, etc.) just by sending
// a different fake header value on each request — no cookies, no auth,
// nothing to bypass, since the limiter never even saw the same "IP" twice.
//
// The LAST entry, by contrast, is what OUR OWN trusted reverse proxy (the
// hosting platform's edge — Vercel, or nginx/similar if self-hosted)
// actually observed as its direct peer when it appended to the header
// before forwarding the request onward. A client can push fake entries onto
// the front of the chain, but can't fabricate what the proxy itself saw and
// appended at the end. x-real-ip, where present, is set directly by that
// same proxy hop (not a chain at all) and is preferred first.
export function getClientIp(headers: { get(name: string): string | null }): string {
  const realIp = headers.get("x-real-ip")
  if (realIp && realIp.trim()) return realIp.trim()

  const xff = headers.get("x-forwarded-for")
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }

  return "anon"
}
