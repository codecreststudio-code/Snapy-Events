import { type NextRequest, NextResponse } from "next/server"
import { defineRoute, fail, ok } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { sendEmail, getEmailSettings } from "@/lib/integrations/resend"
import { logger } from "@/lib/logger"
import { z } from "zod"
import { getClientIp } from "@/lib/security/client-ip"

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

const form = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Phone must be a valid international number (7-15 digits, optionally prefixed with +)").optional(),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(10).max(5000),
})

export const POST = defineRoute({
  method: "POST",
  body: form,
  rateLimit: { key: "contact", limit: 5, windowSeconds: 3600 },
  audit: "contact.form.submitted",
  handler: async ({ body, request }) => {
    const supabase = await createServiceClient()
    const settings = await getEmailSettings()
    const contactEmail = settings.contact_email || "snapsyevent@gmail.com"

    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    const userAgent = request.headers.get("user-agent") || "Unknown browser"
    const ip = getClientIp(request.headers)
    const subjectLine = body.subject || `Contact: ${body.name}`

    try {
      // Create support ticket
      await supabase.from("support_tickets").insert({
        subject: subjectLine,
        description: body.message,
        status: "open",
        priority: "normal",
        user_id: null,
      })
    } catch (err) {
      logger.warn("Failed to create support ticket", { error: String(err) })
    }

    // Email to admin/support
    const adminHtml = `
      <h2 style="color:#a58263;">New Contact Form Submission</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:15px 0;">
        <tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;width:120px;">Name:</td><td style="padding:8px 0;font-weight:bold;">${escapeHtml(body.name)}</td></tr>
        <tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">Email:</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(body.email)}" style="color:#a58263;">${escapeHtml(body.email)}</a></td></tr>
        ${body.phone ? `<tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">Phone:</td><td style="padding:8px 0;">${escapeHtml(body.phone)}</td></tr>` : ""}
        ${body.subject ? `<tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">Subject:</td><td style="padding:8px 0;font-weight:bold;">${escapeHtml(body.subject)}</td></tr>` : ""}
        <tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">Submitted:</td><td style="padding:8px 0;">${timestamp} IST</td></tr>
        <tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">IP Address:</td><td style="padding:8px 0;">${ip}</td></tr>
        <tr><td style="padding:8px 0;color:#7a756e;">Browser:</td><td style="padding:8px 0;">${escapeHtml(userAgent.slice(0, 100))}</td></tr>
      </table>
      <h3 style="color:#a58263;margin-top:20px;">Message</h3>
      <div style="background:#faf9f6;border:1px solid #eae5df;border-left:4px solid #a58263;padding:15px;border-radius:0 8px 8px 0;line-height:1.7;">
        ${escapeHtml(body.message).replace(/\n/g, "<br>")}
      </div>
    `

    // Auto-reply to user
    const userHtml = `
      <h2 style="color:#a58263;">Thanks for reaching out, ${escapeHtml(body.name)}!</h2>
      <p>We have received your message and our team will get back to you within <strong>24–48 hours</strong>.</p>
      <div style="background:#faf9f6;border:1px solid #eae5df;padding:15px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#7a756e;font-size:13px;font-style:italic;">"${escapeHtml(body.message.slice(0, 200))}${body.message.length > 200 ? "..." : ""}"</p>
      </div>
      <p>In the meantime, you can check our FAQ or explore Snapsy Events. We look forward to helping you!</p>
      <div style="text-align:center;margin:25px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"}" style="background-color:#a58263;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Visit Snapsy Events</a>
      </div>
    `

    try {
      await Promise.all([
        sendEmail({
          to: contactEmail,
          subject: `📬 ${subjectLine}`,
          html: adminHtml,
          tags: [{ name: "type", value: "contact-admin" }],
        }),
        sendEmail({
          to: body.email,
          subject: "We received your message — Snapsy Events",
          html: userHtml,
          tags: [{ name: "type", value: "contact-confirmation" }],
        }),
      ])

      logger.info("Contact form submitted", { email: body.email, name: body.name })
      return ok({ sent: true, message: "Thank you for reaching out! We'll get back to you within 24–48 hours." })
    } catch (err) {
      logger.error("Failed to send contact emails", { error: String(err) })
      return fail("EMAIL_ERROR", "Failed to send email. Please try again later.", 500)
    }
  },
}).POST
