import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const listQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

export const GET = defineRoute({
  method: "GET",
  query: listQuery,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = await adminDb()
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const { data, count, error } = await sb
      .from("events")
      .select("*, host:users(id, email, full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const eventId = url.searchParams.get("eventId")
    if (!eventId) return fail("VALIDATION_ERROR", "eventId query parameter is required", 422)

    const sb = await adminDb()
    const { error } = await sb.from("events").delete().eq("id", eventId)
    
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).DELETE
