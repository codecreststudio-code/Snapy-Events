import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { createEventSchema } from "@/lib/validators"
import { slugify } from "@/lib/utils"
import { logAudit } from "@/lib/audit/log"
import { sendEmail } from "@/lib/integrations/resend"
import { serverEnv } from "@/lib/env"
import { calculatePrice } from "@/app/api/payments/checkout/route"

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

    // Per-event model: no global event count limit — each event is a fresh per-event purchase.
    //
    // SECURITY: this event's initial `status` (and settings.payment_status)
    // must NEVER be trusted from the client. This route used to insert with
    // `status: body.status || "published"` — the wizard always sent
    // "published", so a fully live, fully functional, unlimited event was
    // created and made publicly joinable the instant this request landed,
    // regardless of whether the host had paid (or would ever pay) for it.
    // The "Launch Event" button's redirect to Razorpay checkout was a purely
    // optional, decoupled next step — closing that tab, hitting Back, or
    // just never clicking it left the event permanently live for free.
    //
    // The fix: recompute the real price server-side here, the exact same
    // way /api/payments/checkout sizes its Razorpay order. A ₹0 result
    // (free plan, no boosts/add-ons) publishes immediately, same as before.
    // Anything above ₹0 is created as `draft` with payment_status
    // "pending_payment" and stays that way — every guest-facing entry point
    // (event/[slug] page, check-in, /api/events/join, gallery/qr/countdown
    // pages) already gates on status === "published", and the host's own
    // management dashboard now blocks full access for a draft/pending
    // event too. Only a verified Razorpay payment (webhook or the signed
    // /api/payments/verify callback) can flip status to "published" — see
    // those routes for the other half of this fix.
    const slug = `${slugify(body.name)}-${Date.now().toString(36).slice(-4)}`
    const requestedSettings = (body.settings ?? {}) as Record<string, any>
    let requiresPayment = false
    if (typeof requestedSettings.guest_count_plan === "string" && requestedSettings.guest_count_plan) {
      try {
        const price = await calculatePrice(
          supabase,
          requestedSettings.guest_count_plan,
          Number(requestedSettings.guests_boost) || 0,
          Number(requestedSettings.shots_boost) || 0,
          // Coupons are redeemed explicitly at checkout, never silently
          // applied at creation time — a coupon code here would otherwise
          // let a $0-priced draft masquerade as "free" without ever going
          // through checkout's coupon eligibility/consumption logic.
          undefined,
          "INR",
          auth.user!.id,
          typeof requestedSettings.photo_limit === "number" ? requestedSettings.photo_limit : undefined,
          Boolean(requestedSettings.content_types?.videos),
          Boolean(requestedSettings.content_types?.voice_notes)
        )
        requiresPayment = price > 0
      } catch {
        // Unknown/invalid plan id — fail closed (require payment/checkout
        // to resolve it) rather than silently publishing a mispriced event.
        requiresPayment = true
      }
    }

    const initialStatus = requiresPayment ? "draft" : "published"
    const { data, error } = await supabase
      .from("events")
      .insert({
        ...body,
        slug,
        host_id: auth.user!.id,
        status: initialStatus,
        settings: {
          ...requestedSettings,
          payment_status: requiresPayment ? "pending_payment" : "free",
        },
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
