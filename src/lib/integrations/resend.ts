// src/lib/integrations/resend.ts
// Centralized email service using Resend.
// Fetches dynamic email settings and templates from database, logs all activity,
// and handles retries. Falls back to no-op logs in development if API key is missing.

import "server-only"
import { serverEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { adminDb } from "@/lib/supabase/admin"

let _resend: any = null

async function getResendClient(): Promise<any> {
  if (!serverEnv.RESEND_API_KEY) return null
  if (_resend) return _resend
  const { Resend } = await import("resend")
  _resend = new Resend(serverEnv.RESEND_API_KEY)
  return _resend
}

export interface EmailAttachment {
  filename: string
  content: string | Buffer
}

export interface EmailMessage {
  to: string | string[]
  subject?: string
  html?: string
  text?: string
  templateId?: string
  variables?: Record<string, string>
  attachments?: EmailAttachment[]
  tags?: { name: string; value: string }[]
}

export interface EmailSettings {
  sender_name: string
  sender_email: string
  reply_to: string
  support_email: string
  contact_email: string
  logo_url?: string
  signature?: string
  footer_text: string
  company_address?: string
  social_links?: Record<string, string>
}

// NOTE on sender_email: Resend (and every transactional email provider) only
// lets you send "from" a domain you've added and verified via DNS at
// https://resend.com/domains. A webmail domain like gmail.com/yahoo.com can
// never be verified by anyone but its owner, so sending "from" one always
// fails with "domain is not verified" regardless of the API key or template.
// `onboarding@resend.dev` is Resend's own sandbox sender — it works with zero
// setup, which is why it's the default here instead of a gmail.com address.
// Once a real domain is verified, change sender_email in Admin → Email
// Management → Settings to an address on that domain (e.g. noreply@yourdomain.com).
const DEFAULT_SETTINGS: EmailSettings = {
  sender_name: "Snapsy Event",
  sender_email: "onboarding@resend.dev",
  reply_to: "snapsyevent@gmail.com",
  support_email: "snapsyevent@gmail.com",
  contact_email: "snapsyevent@gmail.com",
  // Must be a publicly reachable image URL (email clients can't resolve
  // relative paths or GitHub blob/page links, only raw file URLs). This is
  // a cropped/downsized copy of the site logo (/logo_png.png is 1536x1024
  // and 2.1MB — far too heavy to inline in an email; some clients render a
  // broken-image placeholder rather than wait on a multi-MB fetch). This
  // logo-email.png is the same artwork cropped to its content bounds and
  // resized to 233x160 (~9KB), meant for a ~40px-tall display in the header.
  logo_url: "https://snapsy-events.vercel.app/logo-email.png",
  footer_text: "© Snapsy. All rights reserved.",
  social_links: {}
}

// 1. Fetch Dynamic Settings from platform_settings
export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("platform_settings")
      .select("value")
      .eq("key", "email_settings")
      .single()

    if (error || !data) {
      return DEFAULT_SETTINGS
    }
    return { ...DEFAULT_SETTINGS, ...(data.value as any) }
  } catch (err) {
    logger.error("Failed to fetch email settings from DB", { error: err })
    return DEFAULT_SETTINGS
  }
}

// 2. Fetch Template from DB or return default fallback
export async function getEmailTemplate(templateId: string) {
  try {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single()

    if (error || !data) {
      return null
    }
    return data
  } catch (err) {
    logger.error("Failed to fetch email template from DB", { templateId, error: err })
    return null
  }
}

// 3. Parse variables in HTML or Text templates
export function parseTemplateContent(content: string, variables: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
    result = result.replace(regex, value)
  }
  return result
}

// 4. Centralized send email function with logs and retries
export async function sendEmail(msg: EmailMessage): Promise<{ id: string | null; error: string | null }> {
  const sb = await adminDb()
  const settings = await getEmailSettings()
  
  const recipient = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to
  const emailType = msg.templateId || "custom"

  // Load subject and templates
  let subject = msg.subject || ""
  let html = msg.html || ""
  let text = msg.text || ""

  const variables = {
    dashboard_url: `${serverEnv.APP_URL}/dashboard`,
    support_email: settings.support_email,
    sender_name: settings.sender_name,
    ...msg.variables
  }

  if (msg.templateId) {
    const template = await getEmailTemplate(msg.templateId)
    if (template) {
      subject = parseTemplateContent(template.subject, variables)
      html = parseTemplateContent(template.html_content, variables)
      if (template.text_content) {
        text = parseTemplateContent(template.text_content, variables)
      }
    }
  }

  // Inject logo and settings-configured signature/footer if HTML contains placeholders or does not contain layout
  if (html && !html.includes("snapsy-wrapper")) {
    // Explicit width/height (not just CSS) matter here: Outlook desktop and
    // some other clients render <img> at native pixel size and ignore
    // max-height in CSS, so without these attributes a correctly-hosted but
    // large-dimension image can still blow out the layout or fail to load
    // in time. 58x40 mirrors the intended ~40px-tall header display size.
    const logoHtml = settings.logo_url ? `<img src="${settings.logo_url}" alt="${settings.sender_name}" width="58" height="40" style="max-height: 40px; width: auto; margin-bottom: 24px; display: block;" />` : ""
    const footerHtml = `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ede9fe; font-size: 11px; color: #9c958e; text-align: center;">
      ${settings.company_address ? `<p>${settings.company_address}</p>` : ""}
      <p>${settings.footer_text}</p>
    </div>`

    // Brand: violet-600 -> fuchsia-500 gradient, matching the marketing site
    // (src/app/page.tsx uses the same "from-violet-600 to-fuchsia-500" accent
    // throughout) — not the tan/brown palette used only inside the event
    // creation wizard's own UI, which isn't the site's actual brand identity.
    html = `<div class="snapsy-wrapper" style="font-family: sans-serif; color: #1c1a17; background-color: #f7f5fb; padding: 30px 15px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(124,58,237,0.08); border: 1px solid #ede9fe;">
        <div style="height: 6px; background: linear-gradient(to right, #7c3aed, #d946ef);"></div>
        <div style="padding: 32px 30px;">
          ${logoHtml}
          ${html}
          ${settings.signature ? `<p style="margin-top: 25px; font-style: italic; color: #7a756e;">${settings.signature}</p>` : ""}
          ${footerHtml}
        </div>
      </div>
    </div>`
  }

  // 4a. Create Initial Log Row (status = pending)
  const { data: logData, error: logError } = await sb
    .from("email_logs")
    .insert({
      recipient,
      subject,
      email_type: emailType,
      status: "pending",
      retry_count: 0
    })
    .select("id")
    .single()

  const logId = logData?.id

  // 4b. Perform Send Attempts with Retries
  let attempts = 0
  const maxAttempts = 3
  let sendId: string | null = null
  let sendError: string | null = null

  const resendClient = await getResendClient()

  while (attempts < maxAttempts) {
    try {
      if (!resendClient) {
        // Dev fallback mode if Resend key is missing
        logger.info("[email:dev-mock]", { to: recipient, subject, type: emailType })
        sendId = `mock-resend-id-${Math.random().toString(36).substring(7)}`
        sendError = null
        break
      }

      const { data, error } = await resendClient.emails.send({
        from: `${settings.sender_name} <${settings.sender_email}>`,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject,
        html,
        text: text || undefined,
        replyTo: settings.reply_to,
        attachments: msg.attachments ? msg.attachments.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? Buffer.from(att.content, 'base64') : att.content
        })) : undefined,
        tags: msg.tags,
      })

      if (error) {
        throw new Error(error.message)
      }

      sendId = data?.id ?? null
      sendError = null
      break // Successful send, exit loop
    } catch (err: any) {
      attempts++
      sendError = err.message || "Unknown send error"
      logger.warn(`Resend email attempt ${attempts} failed for ${recipient}`, { error: sendError })
      
      if (attempts < maxAttempts) {
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  // 4c. Update Log Row with final results
  if (logId) {
    await sb
      .from("email_logs")
      .update({
        status: sendError ? "failed" : "sent",
        error_message: sendError,
        retry_count: attempts - 1,
        resend_id: sendError ? null : sendId,
      })
      .eq("id", logId)
  }

  return { id: sendId, error: sendError }
}
