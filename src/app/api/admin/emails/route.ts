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

  // Auto-seed newsletter template if it doesn't exist in the database yet
  if (data && !data.some(t => t.id === "newsletter")) {
    const defaultNewsletter = {
      id: "newsletter",
      name: "Newsletter Broadcast",
      subject: "✨ {{newsletter_title}} — Snapsy Events",
      html_content: `<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">📰 {{newsletter_title}}</h2>
<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello {{subscriber_name}}, welcome to this edition of the Snapsy Events newsletter!</p>
<div style="background:#fcf9f2;border:1px solid #f3e8d2;border-radius:12px;padding:20px 22px;margin:0 0 22px;">
  <p style="font-size:14px;color:#2c2824;line-height:1.6;margin:0;white-space:pre-wrap;">{{newsletter_content}}</p>
</div>
<div style="margin:0 0 24px;">
  <div style="padding:6px 0;font-size:13px;color:#374151;">📸&nbsp;&nbsp;Discover new live event features</div>
  <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;High-speed real-time photo sharing</div>
  <div style="padding:6px 0;font-size:13px;color:#374151;">🤖&nbsp;&nbsp;AI Face Search & Smart Memories</div>
  <div style="padding:6px 0;font-size:13px;color:#374151;">🎉&nbsp;&nbsp;Exclusive tips for event hosts & guests</div>
</div>
<div style="text-align:center;margin:12px 0 24px;">
  <a href="{{cta_url}}" style="background:linear-gradient(135deg,#c9a96e,#b89252);color:#ffffff;text-decoration:none;padding:14px 34px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 12px rgba(201,169,110,0.3);">{{cta_text}} →</a>
</div>
<div style="background:#f7f5fb;border:1px solid #ede9fe;border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#64748b;line-height:1.5;">You are receiving this email because you subscribed to Snapsy Events. If you wish to unsubscribe, click <a href="{{unsubscribe_url}}" style="color:#b89252;text-decoration:underline;">here</a>.</div>`,
      text_content: `{{newsletter_title}}\n\nHello {{subscriber_name}},\n\n{{newsletter_content}}\n\nRead more at {{cta_url}}`,
      variables: ["subscriber_name", "newsletter_title", "newsletter_content", "cta_text", "cta_url", "unsubscribe_url"],
      is_system: true,
    }
    await sb.from("email_templates").upsert(defaultNewsletter, { onConflict: "id" })
    data.push(defaultNewsletter as any)
  }

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
        subscriber_name: "Valued Subscriber",
        newsletter_title: "Exciting New Features from Snapsy Events!",
        newsletter_content: "We are thrilled to share our latest updates! You can now generate AI face search highlights, guest award badges, and custom video recap movies directly from your live event galleries.",
        cta_text: "Explore Snapsy Features",
        cta_url: "https://snapsy-events.vercel.app/features",
        unsubscribe_url: "https://snapsy-events.vercel.app/delete-data",
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

  if (action === "broadcast") {
    const { template_id, subject, newsletter_title, newsletter_content, cta_text, cta_url } = body
    if (!template_id) {
      return NextResponse.json({ error: "template_id required for broadcast" }, { status: 400 })
    }

    // Fetch all active subscribers
    const { data: subscribers, error: subError } = await sb
      .from("blog_subscribers")
      .select("email, name")
      .eq("status", "active")

    if (subError || !subscribers || subscribers.length === 0) {
      return NextResponse.json({ error: subError?.message || "No active subscribers found" }, { status: 400 })
    }

    let successCount = 0
    let failureCount = 0

    // Dispatch email to all active subscribers
    await Promise.all(
      subscribers.map(async (sub) => {
        const { error } = await sendEmail({
          to: sub.email,
          templateId: template_id,
          subject: subject || undefined,
          variables: {
            subscriber_name: sub.name || "Valued Subscriber",
            newsletter_title: newsletter_title || "Snapsy Events Newsletter",
            newsletter_content: newsletter_content || "Check out our latest updates on Snapsy Events!",
            cta_text: cta_text || "Explore Snapsy Features",
            cta_url: cta_url || "https://snapsy-events.vercel.app/features",
            unsubscribe_url: "https://snapsy-events.vercel.app/delete-data",
          },
          tags: [{ name: "type", value: "broadcast" }],
        })
        if (error) failureCount++
        else successCount++
      })
    )

    return NextResponse.json({
      success: true,
      message: `Broadcast completed: ${successCount} sent, ${failureCount} failed`,
      total: subscribers.length,
      successCount,
      failureCount,
    })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
