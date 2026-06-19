// src/lib/api/response.ts
// Standardized API response envelopes + error helpers.

import { NextResponse } from "next/server"
import type { ApiError, ApiResponse, Pagination } from "@/lib/types"

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=self, microphone=self",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
}

function withSecurity<T>(res: NextResponse<T>): NextResponse<T> {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v)
  return res
}

export function ok<T>(data: T, init?: ResponseInit & { pagination?: Pagination }): NextResponse<ApiResponse<T>> {
  const { pagination, ...rest } = init ?? {}
  const body: ApiResponse<T> = { success: true, data }
  if (pagination) body.meta = { pagination }
  return withSecurity(NextResponse.json<ApiResponse<T>>(body, rest))
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return withSecurity(NextResponse.json<ApiResponse<T>>({ success: true, data }, { status: 201 }))
}

export function noContent(): NextResponse {
  return withSecurity(new NextResponse(null, { status: 204 }))
}

export function fail(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  const error: ApiError = { code, message }
  if (details !== undefined) error.details = details
  return withSecurity(NextResponse.json<ApiResponse<never>>({ success: false, error }, { status }))
}

export const ApiErrors = {
  unauthorized: () => fail("UNAUTHORIZED", "Authentication required", 401),
  forbidden: (msg = "Insufficient permissions") => fail("FORBIDDEN", msg, 403),
  notFound: (resource = "Resource") => fail("NOT_FOUND", `${resource} not found`, 404),
  conflict: (msg: string) => fail("CONFLICT", msg, 409),
  validation: (details: unknown) => fail("VALIDATION_ERROR", "Invalid request payload", 422, details),
  rateLimited: () => fail("RATE_LIMITED", "Too many requests", 429),
  internal: (msg = "Internal server error") => fail("INTERNAL_ERROR", msg, 500),
  notImplemented: (feature: string) => fail("NOT_IMPLEMENTED", `${feature} is not available on this plan`, 501),
}

export function pagination(params: {
  page: number
  pageSize: number
  total: number
}): Pagination {
  return {
    page: params.page,
    page_size: params.pageSize,
    total: params.total,
    total_pages: Math.max(1, Math.ceil(params.total / params.pageSize)),
  }
}
