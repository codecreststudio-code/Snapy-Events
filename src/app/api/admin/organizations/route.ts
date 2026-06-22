import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const listQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

const patchBodySchema = z.object({
  orgId: z.string().uuid(),
  action: z.enum(["edit", "suspend", "activate", "change_plan"]),
  name: z.string().min(2).optional(),
  plan: z.enum(["free", "starter", "standard", "premium"]).optional(),
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
      .from("organizations")
      .select(`
        id,
        name,
        slug,
        plan,
        settings,
        created_at,
        events:events(id),
        users:users(id),
        transactions:transactions(amount, status),
        storage_usage:storage_usage(total_bytes)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
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
    const { orgId, action, name, plan } = body

    const { data: org, error: getErr } = await sb
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single()

    if (getErr || !org) {
      return fail("NOT_FOUND", "Organization not found", 404)
    }

    const currentSettings = org.settings && typeof org.settings === "object" ? org.settings : {}

    if (action === "edit") {
      if (!name) return fail("VALIDATION_ERROR", "name is required to edit", 422)
      const { error } = await sb
        .from("organizations")
        .update({ name })
        .eq("id", orgId)
      if (error) return fail("DB_ERROR", error.message, 500)
    } 
    else if (action === "suspend") {
      const { error } = await sb
        .from("organizations")
        .update({ settings: { ...currentSettings, is_suspended: true } })
        .eq("id", orgId)
      if (error) return fail("DB_ERROR", error.message, 500)
    } 
    else if (action === "activate") {
      const { error } = await sb
        .from("organizations")
        .update({ settings: { ...currentSettings, is_suspended: false } })
        .eq("id", orgId)
      if (error) return fail("DB_ERROR", error.message, 500)
    } 
    else if (action === "change_plan") {
      if (!plan) return fail("VALIDATION_ERROR", "plan is required", 422)
      const { error } = await sb
        .from("organizations")
        .update({ plan })
        .eq("id", orgId)
      if (error) return fail("DB_ERROR", error.message, 500)
    }

    return ok({ success: true })
  },
}).PATCH

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("orgId")
    if (!orgId) return fail("VALIDATION_ERROR", "orgId query parameter is required", 422)

    const sb = await adminDb()
    const { error } = await sb.from("organizations").delete().eq("id", orgId)
    if (error) return fail("DB_ERROR", error.message, 500)

    return ok({ success: true })
  },
}).DELETE
