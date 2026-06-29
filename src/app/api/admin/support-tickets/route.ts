import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const listQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
})

const patchBodySchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
})

const postBodySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(1),
  author: z.string().default("Support Agent"),
})

export const GET = defineRoute({
  method: "GET",
  query: listQuery,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = await adminDb()
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    let q = sb
      .from("support_tickets")
      .select("id, subject, description, status, priority, created_at, updated_at, user:users(full_name), messages:support_ticket_messages(*)", { count: "exact" })

    if (query.status) {
      q = q.eq("status", query.status)
    }

    const { data, count, error } = await q
      .order("updated_at", { ascending: false })
      .range(from, to)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET

export const PATCH = defineRoute({
  method: "PATCH",
  body: patchBodySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { ticketId, status, priority } = body

    const updates: any = {}
    if (status) updates.status = status
    if (priority) updates.priority = priority
    updates.updated_at = new Date().toISOString()

    const { error } = await sb
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).PATCH

export const POST = defineRoute({
  method: "POST",
  body: postBodySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { ticketId, message, author } = body

    // 1. Add reply message
    const { error: msgErr } = await sb
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        message,
        author,
        created_at: new Date().toISOString(),
      })

    if (msgErr) return fail("DB_ERROR", msgErr.message, 500)

    // 2. Set ticket status to pending and update timestamp
    const { error: ticketErr } = await sb
      .from("support_tickets")
      .update({
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)

    if (ticketErr) return fail("DB_ERROR", ticketErr.message, 500)

    return ok({ success: true })
  },
}).POST
