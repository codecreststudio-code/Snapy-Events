import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, fail, ok } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/integrations/resend"
import { logger } from "@/lib/logger"

const form = z.object({ 
  name: z.string().min(1).max(100), 
  email: z.string().email(), 
  message: z.string().min(10).max(5000) 
})

export const POST = defineRoute({
  method: "POST",
  body: form,
  rateLimit: { key: "contact", limit: 5, windowSeconds: 3600 }, // 5 per hour per IP
  audit: "contact.form.submitted",
  handler: async ({ body }) => {
    const supabase = await createServiceClient()
    const supportEmail = process.env.CONTACT_EMAIL || "support@snapsy.app"
    
    try {
      // Create support ticket in database
      await supabase.from("support_tickets").insert({
        subject: `Contact form: ${body.name}`,
        description: body.message,
        status: "open",
        priority: "normal",
        organization_id: null,
      })
    } catch (err) {
      logger.warn("Failed to create support ticket", { error: String(err) })
      // Continue anyway, email is more important
    }

    try {
      // Send email to support
      await sendEmail({
        to: supportEmail,
        subject: `New Contact Form Submission from ${body.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(body.name)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(body.email)}">${escapeHtml(body.email)}</a></p>
            <h3>Message:</h3>
            <p>${escapeHtml(body.message).replace(/\n/g, "<br>")}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p><small>Submitted from: Snapsy Events</small></p>
          </div>
        `,
      })

      // Send confirmation email to user
      await sendEmail({
        to: body.email,
        subject: "We received your message - Snapsy Events",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Thank you for reaching out!</h2>
            <p>Hi ${escapeHtml(body.name)},</p>
            <p>We've received your message and will get back to you as soon as possible.</p>
            <p>In the meantime, if you have any urgent questions, feel free to check out our <a href="${process.env.NEXT_PUBLIC_APP_URL}/faq">FAQ page</a>.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p>Best regards,<br/>The Snapsy Events Team</p>
          </div>
        `,
      })

      logger.info("Contact form submitted", { email: body.email, name: body.name })
      return ok({ sent: true, message: "Thank you for reaching out! We'll get back to you soon." })
    } catch (err) {
      logger.error("Failed to send contact emails", { error: String(err) })
      return fail("EMAIL_ERROR", "Failed to send email. Please try again later.", 500)
    }
  },
}).POST

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
