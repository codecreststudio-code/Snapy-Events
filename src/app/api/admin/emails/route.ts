import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { sendEmail, getEmailSettings } from "@/lib/integrations/resend"
import { verifyCsrf } from "@/lib/security/csrf"
import { z } from "zod"

async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: profile } = await sb.from("users").select("is_admin").eq("id", user.id).single()
  return profile?.is_admin ? user : null
}

// GET: Fetch templates and logs
export async function GET(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sb = await adminDb()
  const { searchParams } = new URL(request.url)
  const resource = searchParams.get("resource") || "templates"

  if (resource === "logs") {
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const search = searchParams.get("search")

    let query = sb.from("email_logs").select("*").order("created_at", { ascending: false }).limit(200)
    if (status) query = query.eq("status", status)
    if (type) query = query.eq("email_type", type)
    if (search) query = query.ilike("recipient", `%${search}%`)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  const { data, error } = await sb.from("email_templates").select("*").order("is_system", { ascending: false }).order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  html_content: z.string().min(1),
  text_content: z.string().optional(),
  variables: z.array(z.string()).default([]),
})

// POST: Create or update template, or send test email
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // This route predates defineRoute() (which auto-applies this same check
  // for every POST/PUT/PATCH/DELETE — see src/lib/api/handler.ts) and was
  // built directly on NextRequest/NextResponse, so it never got CSRF
  // protection despite mutating email templates/settings and sending mail.
  // verifyCsrf() passes automatically for genuine same-origin requests (it
  // checks Origin/Referer first), so this doesn't require any client-side
  // change — it only blocks requests that don't originate from this app.
  const isValidCsrf = await verifyCsrf(request.headers.get("x-csrf-token"), request)
  if (!isValidCsrf) {
    return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 })
  }

  const body = await request.json()
  const action = body.action as string

  const sb = await adminDb()

  if (action === "test") {
    const { template_id, recipient } = body
    if (!template_id || !recipient) {
      return NextResponse.json({ error: "template_id and recipient required" }, { status: 400 })
    }
    const { error } = await sendEmail({
      to: recipient,
      templateId: template_id,
      variables: {
        host_name: "Test User",
        host_email: recipient,
        event_name: "My Test Event",
        event_link: "https://snapsy-events.vercel.app/event/test",
        invoice_number: "INV-TEST001",
        plan_name: "Pro Plan",
        payment_amount: "999.00",
        guest_name: "Guest User",
        ticket_id: "TKT-001",
        ticket_status: "Open",
        ticket_message: "Test message",
        reset_url: "https://snapsy-events.vercel.app/reset-password?token=test",
        verification_url: "https://snapsy-events.vercel.app/verify?token=test",
        dashboard_url: "https://snapsy-events.vercel.app/dashboard",
        support_email: "snapsyevent@gmail.com",
      },
      tags: [{ name: "type", value: "test" }],
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "upsert") {
    const parsed = templateSchema.safeParse(body.template)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid template data", details: parsed.error.flatten() }, { status: 400 })
    }
    const template = parsed.data
    const { error } = await sb.from("email_templates").upsert({
      ...template,
      is_system: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "delete") {
    const { id } = body
    // Prevent deleting system templates
    const { data: tpl } = await sb.from("email_templates").select("is_system").eq("id", id).single()
    if (tpl?.is_system) return NextResponse.json({ error: "Cannot delete system templates" }, { status: 400 })
    const { error } = await sb.from("email_templates").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === "save_settings") {
    const { settings } = body
    const { error } = await sb.from("platform_settings").upsert({
      key: "email_settings",
      value: settings,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
