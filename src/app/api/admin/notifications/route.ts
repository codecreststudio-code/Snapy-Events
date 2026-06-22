import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const listQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

const postBodySchema = z.object({
  type: z.enum(["email", "whatsapp", "push", "sms"]),
  recipient: z.string().min(1),
  subject: z.string().optional(),
  message: z.string().min(1),
  scheduledFor: z.string().optional(),
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
      .from("notification_queue")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: postBodySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { type, recipient, subject, message, scheduledFor } = body

    const payload = {
      subject: subject || "System Broadcast",
      message,
      title: "Snapsy Platform Update",
    }

    const { error } = await sb
      .from("notification_queue")
      .insert({
        type,
        recipient,
        payload,
        status: "pending",
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : new Date().toISOString(),
        created_at: new Date().toISOString(),
      })

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok({ success: true })
  },
}).POST
