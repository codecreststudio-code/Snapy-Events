// src/lib/api/handler.ts
// Wraps route handlers with: try/catch, JSON parsing, zod validation,
// auth, RBAC, rate limiting, and analytics emission. The default export
// of a route file should be one of these.

import { NextResponse } from "next/server"
import { ZodError, type ZodSchema } from "zod"
import type { NextRequest } from "next/server"
import { ok, fail, ApiErrors, created, pagination } from "./response"
import { requireAuth, requireAdmin, type AuthContext } from "@/lib/auth/session"
import { rateLimit } from "@/lib/security/rate-limit"
import { verifyCsrf } from "@/lib/security/csrf"
import { trackEvent } from "@/lib/analytics/track"
import { logAudit } from "@/lib/audit/log"
import { getClientIp } from "@/lib/security/client-ip"

export type Handler<C = unknown> = (
  ctx: C,
  request: NextRequest,
  auth: AuthContext,
) => Promise<NextResponse> | NextResponse

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

interface RouteOptions<TBody, TQuery, C> {
  method: Method | Method[]
  body?: ZodSchema<TBody>
  query?: ZodSchema<TQuery>
  requireAuth?: boolean | "admin"
  rateLimit?: { key: string; limit: number; windowSeconds: number }
  audit?: string
  handler: (ctx: {
    body: TBody
    query: TQuery
    params: C
    request: NextRequest
    auth: AuthContext
  }) => Promise<NextResponse> | NextResponse
}

export function defineRoute<TBody = unknown, TQuery = unknown, C = unknown>(opts: RouteOptions<TBody, TQuery, C>) {
  const methods = Array.isArray(opts.method) ? opts.method : [opts.method]
  const out: Record<string, (req: NextRequest, ctx: C | { params: Promise<C> }) => Promise<NextResponse>> = {}

  for (const m of methods) {
    out[m] = async (request: NextRequest, rawCtx: C | { params: Promise<C> }) => {
      try {
        let resolvedParams: C = rawCtx as C

        if (rawCtx && typeof rawCtx === 'object' && 'params' in rawCtx) {
          const ctxWithParams = rawCtx as { params: Promise<C> }
          resolvedParams = await ctxWithParams.params
        }

        // CORS preflight
        if (m === "OPTIONS") {
          return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
        }

        // Rate limit
        if (opts.rateLimit) {
          const ip = getClientIp(request.headers)
          const r = await rateLimit({
            key: `${opts.rateLimit.key}:${ip}`,
            limit: opts.rateLimit.limit,
            windowSeconds: opts.rateLimit.windowSeconds,
          })
          if (!r.allowed) {
            return fail("RATE_LIMITED", "Too many requests", 429, { retry_after: r.resetIn })
          }
        }

        // CSRF protection for state-changing requests
        if (["POST", "PUT", "PATCH", "DELETE"].includes(m)) {
          const csrfToken = request.headers.get("x-csrf-token")
          const isValid = await verifyCsrf(csrfToken, request)
          if (!isValid) {
            return fail("CSRF_INVALID", "Invalid or missing CSRF token", 403)
          }
        }

        // Auth
        let auth: AuthContext = { user: null, role: "viewer", permissions: [], isAdmin: false }
        if (opts.requireAuth === "admin") {
          auth = await requireAdmin()
        } else if (opts.requireAuth) {
          auth = await requireAuth()
        }

        // Body
        let body = {} as TBody
        if (opts.body && ["POST", "PUT", "PATCH", "DELETE"].includes(m)) {
          const raw = await readBody(request)
          const parsed = opts.body.safeParse(raw)
          if (!parsed.success) throw new ZodError(parsed.error.issues)
          body = parsed.data
        }

        // Query
        let query = {} as TQuery
        if (opts.query) {
          const url = new URL(request.url)
          const obj: Record<string, string> = {}
          url.searchParams.forEach((v, k) => {
            obj[k] = v
          })
          const parsed = opts.query.safeParse(obj)
          if (!parsed.success) throw new ZodError(parsed.error.issues)
          query = parsed.data
        }

        // Run handler
        const res = await opts.handler({ body, query, params: resolvedParams, request, auth })

        // Audit + analytics (fire-and-forget)
        if (opts.audit) {
          void logAudit({
            user_id: auth.user?.id ?? null,
            action: opts.audit,
            resource_type: "route",
            resource_id: null,
            request,
          })
        }
        if (auth.user) {
          void trackEvent({
            user_id: auth.user.id,
            event_type: `api.${m.toLowerCase()}`,
            event_data: { path: request.nextUrl.pathname },
            request,
          })
        }
        return res
      } catch (err) {
        return errorToResponse(err)
      }
    }
  }
  return out
}

function corsHeaders(request?: NextRequest) {
  const defaultOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"
  let origin = defaultOrigin
  if (process.env.NODE_ENV !== "production") {
    origin = request?.headers.get("origin") ?? "*"
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-csrf-token",
    "Access-Control-Allow-Credentials": "true",
  }
}

async function readBody(request: NextRequest): Promise<unknown> {
  const ct = request.headers.get("content-type") ?? ""
  if (ct.includes("application/json")) return request.json().catch(() => ({}))
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await request.formData()
    const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
    for (const [k, v] of fd.entries()) {
      if (k in out) {
        const cur = out[k]
        out[k] = Array.isArray(cur) ? [...cur, v] : [cur, v]
      } else {
        out[k] = v
      }
    }
    return out
  }
  return {}
}

export function errorToResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Invalid request", 422, err.flatten().fieldErrors)
  }
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status
    if (status === 401) return ApiErrors.unauthorized()
    if (status === 403) return ApiErrors.forbidden(err.message)
    if (status === 404) return ApiErrors.notFound(err.message)
    if (status === 409) return ApiErrors.conflict(err.message)
    if (status === 429) return ApiErrors.rateLimited()
    if (status === 501) return ApiErrors.notImplemented(err.message)
    if (status && status >= 400 && status < 600) return fail("ERROR", err.message, status)
    console.error("[api] unhandled", err)
    return ApiErrors.internal()
  }
  console.error("[api] unhandled", err)
  return ApiErrors.internal()
}

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export { pagination as paginate, ok, fail, created, ApiErrors }

export function redirect(url: string | URL, status = 302): NextResponse {
  return NextResponse.redirect(url, status)
}