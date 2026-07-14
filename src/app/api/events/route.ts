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

    // Enforce Active Subscription Event Limit
    let planId = "free"
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", auth.user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSub?.plan_id) {
      planId = activeSub.plan_id
    } else {
      const { data: userObj } = await supabase.from("users").select("plan").eq("id", auth.user!.id).maybeSingle()
      if (userObj?.plan) planId = userObj.plan
    }

    let maxEvents = planId === "premium" ? 5 : planId === "standard" ? 2 : 1
    const { data: planData } = await supabase.from("plans").select("limits").eq("id", planId).maybeSingle()
    if (planData?.limits?.events_limit !== undefined) {
      maxEvents = planData.limits.events_limit
    }

    if (maxEvents !== -1) {
      const { count, error: countError } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("host_id", auth.user!.id)
        .neq("status", "archived")

      if (countError) return fail("DB_ERROR", countError.message, 500)
      if (count !== null && count >= maxEvents) {
        return fail(
          "PLAN_LIMIT_REACHED",
          `Event creation limit reached (${count}/${maxEvents}). Your ${planId} package allows at most ${maxEvents} active event(s). Please purchase an additional event slot or upgrade your plan to create another event.`,
          403
        )
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
