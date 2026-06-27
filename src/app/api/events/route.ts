import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { createEventSchema } from "@/lib/validators"
import { slugify } from "@/lib/utils"
import { logAudit } from "@/lib/audit/log"

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

    // Enforce Event Limit
    const { data: userObj } = await supabase.from("users").select("plan").eq("id", auth.user!.id).single()
    const plan = userObj?.plan || "free"
    
    let maxEvents = 1
    const { data: planData } = await supabase.from("plans").select("limits").eq("id", plan).single()
    if (planData?.limits?.events_limit !== undefined) {
      maxEvents = planData.limits.events_limit
    }

    if (maxEvents !== -1) {
      const { count, error: countError } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("host_id", auth.user!.id)

      if (countError) return fail("DB_ERROR", countError.message, 500)
      if (count !== null && count >= maxEvents) {
        return fail("PLAN_LIMIT_REACHED", `Event creation limit reached. You can create at most ${maxEvents} events on the ${plan} plan. Please upgrade to create more.`, 403)
      }
    }

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
    return NextResponse.json({ success: true, data })
  },
}).POST
