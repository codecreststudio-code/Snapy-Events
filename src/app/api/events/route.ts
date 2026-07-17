import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { createEventSchema } from "@/lib/validators"
import { slugify } from "@/lib/utils"
import { logAudit } from "@/lib/audit/log"
import { sendEmail } from "@/lib/integrations/resend"
import { serverEnv } from "@/lib/env"

const listQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["draft", "published", "completed", "archived"]).optional(),
  search: z.string().optional(),
})

export const GET = defineRoute({
  method: "GET",
  query: listQuery,
  requireAuth: true,
  handler: async ({ query, auth }) => {
    const supabase = await createClient()
    let q = supabase
      .from("events")
      .select("*, galleries(id, name, photo_count)", { count: "exact" })
      .eq("host_id", auth.user!.id)
      .order("created_at", { ascending: false })
    if (query.status) q = q.eq("status", query.status)
    if (query.search) q = q.ilike("name", `%${query.search}%`)
    const from = (query.page - 1) * query.pageSize
    q = q.range(from, from + query.pageSize - 1)
    const { data, count, error } = await q
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET

export const POST = defineRoute({
  method: "POST",
  body: createEventSchema,
  requireAuth: true,
  audit: "event.created",
  handler: async ({ body, auth, request }) => {
    const supabase = await createClient()

    // Per-event model: no global event count limit — each event is a fresh per-event purchase
    // Payment enforcement happens at checkout after event is created
    const slug = `${slugify(body.name)}-${Date.now().toString(36).slice(-4)}`
    const { data, error } = await supabase
      .from("events")
      .insert({
        ...body,
        slug,
        host_id: auth.user!.id,
        status: body.status || "published",
      })
      .select()
      .single()
    if (error) return fail("DB_ERROR", error.message, 400)
    // Default gallery
    await supabase.from("galleries").insert({
      event_id: data.id,
      name: "All Photos",
      slug: "all-photos",
    })
    await logAudit({ user_id: auth.user!.id, action: "event.created", resource_type: "event", resource_id: data.id, request })

    // Notify the host once their event actually goes live — draft events
    // (saved but not published yet) shouldn't trigger this. Fire-and-forget,
    // same pattern as the welcome email in api/auth/signup/route.ts.
    if (data.status === "published" && auth.user!.email) {
      void sendEmail({
        to: auth.user!.email,
        templateId: "event_created",
        variables: {
          host_name: auth.user!.full_name || auth.user!.email,
          event_name: data.name,
          event_link: `${serverEnv.APP_URL}/event/${data.slug}`,
        },
        tags: [{ name: "type", value: "event-published" }],
      })
    }

    return NextResponse.json({ success: true, data })
  },
}).POST
