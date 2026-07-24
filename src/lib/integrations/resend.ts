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

const HERO_TITLES: Record<string, string> = {
  welcome: "WELCOME TO SNAPSY",
  verification: "CONFIRM YOUR EMAIL",
  password_reset: "RESET YOUR PASSWORD",
  payment_receipt: "PAYMENT CONFIRMED",
  event_created: "YOUR EVENT IS LIVE",
  guest_invitation: "YOU'RE INVITED",
  support_ticket: "TICKET UPDATE",
  newsletter: "NEWSLETTER BROADCAST",
}

const HERO_SUBTITLES: Record<string, string> = {
  welcome: "Welcome aboard to Snapsy Events",
  verification: "One more step to unlock your account",
  password_reset: "Secure recovery link for your account",
  payment_receipt: "Thank you for your subscription purchase",
  event_created: "Your live gallery is ready for guests",
  guest_invitation: "You are invited to join the event gallery",
  support_ticket: "Support team update on your ticket",
  newsletter: "Latest news, updates & tips from Snapsy",
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

// 1b. Fetch site branding from platform_settings (social links, footer credits, custom tags)
export async function getSiteBranding(): Promise<{
  social_links: Record<string, string>
  footer_credits: { built_by: string; built_by_url: string; powered_by: string }
  custom_tags: { label: string; url: string }[]
}> {
  const DEFAULTS = {
    social_links: {},
    footer_credits: { built_by: "CodeCrest_Studio", built_by_url: "https://codecreststudio.vercel.app/", powered_by: "Snapsy Events" },
    custom_tags: [],
  }
  try {
    const sb = await adminDb()
    const { data } = await sb
      .from("platform_settings")
      .select("key, value")
      .in("key", ["social_links", "footer_credits", "custom_tags"])
    if (!data) return DEFAULTS
    const map = data.reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {} as Record<string, any>)
    return {
      social_links: map.social_links ?? DEFAULTS.social_links,
      footer_credits: map.footer_credits ?? DEFAULTS.footer_credits,
      custom_tags: map.custom_tags ?? DEFAULTS.custom_tags,
    }
  } catch {
    return DEFAULTS
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



  // Inject the hero banner + footer if HTML contains placeholders or does not contain layout
  if (html && !html.includes("snapsy-wrapper")) {
    const heroTitle = HERO_TITLES[msg.templateId ?? ""] ?? "SNAPSY EVENTS"
    const heroSubtitle = HERO_SUBTITLES[msg.templateId ?? ""] ?? "Event Photography Platform"
    const siteBranding = await getSiteBranding()

    const activeSocials = Object.entries(siteBranding.social_links || {}).filter(([, url]) => url?.trim())
    const socialLinksHtml = activeSocials.length > 0
      ? `<div style="margin: 14px 0 10px; font-size: 11px;">
          ${activeSocials.map(([platform, url]) => `<a href="${url}" target="_blank" style="color: #eab308; text-decoration: none; margin: 0 8px; font-weight: 600;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`).join(" • ")}
        </div>`
      : `<div style="margin: 14px 0 10px; font-size: 11px;">
          <a href="https://wa.me/" target="_blank" style="color: #22c55e; text-decoration: none; margin: 0 8px; font-weight: 600;">WhatsApp</a> • 
          <a href="https://instagram.com/" target="_blank" style="color: #e1306c; text-decoration: none; margin: 0 8px; font-weight: 600;">Instagram</a>
        </div>`

    const customTagsHtml = (siteBranding.custom_tags || []).length > 0
      ? `<div style="margin: 10px 0; font-size: 10px; color: #a1a1aa;">
          ${siteBranding.custom_tags.map(t => `<span style="background-color: #27272a; color: #e4e4e7; padding: 3px 10px; border-radius: 12px; margin: 0 3px; font-size: 10px;">${t.label}</span>`).join(" ")}
        </div>`
      : ""

    const builtByCredit = siteBranding.footer_credits?.built_by
      ? `<div style="margin-top: 10px; font-size: 11px; color: #a1a1aa;">
          Built with <span style="color: #ef4444;">❤️</span> by ${siteBranding.footer_credits.built_by_url ? `<a href="${siteBranding.footer_credits.built_by_url}" target="_blank" style="color: #eab308; text-decoration: underline; font-weight: 600;">${siteBranding.footer_credits.built_by}</a>` : `<span style="color: #eab308; font-weight: 600;">${siteBranding.footer_credits.built_by}</span>`}
        </div>`
      : `<div style="margin-top: 10px; font-size: 11px; color: #a1a1aa;">
          Built with <span style="color: #ef4444;">❤️</span> by <a href="https://codecreststudio.vercel.app/" target="_blank" style="color: #eab308; text-decoration: underline; font-weight: 600;">CodeCrest Studio</a>
        </div>`

    const logoUrl = settings.logo_url || "https://snapsy-events.vercel.app/Logo.png"

    html = `<div class="snapsy-wrapper" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e4e4e7; background-color: #050505; padding: 20px 10px;">
      <!-- Top Utility Header -->
      <table style="width: 100%; max-width: 620px; margin: 0 auto 12px; font-size: 11px; color: #a1a1aa;">
        <tr>
          <td style="text-align: left;">Welcome to Snapsy Event! Let's get your account secure.</td>
          <td style="text-align: right;">Having trouble viewing? <a href="${serverEnv.APP_URL}" style="color: #eab308; text-decoration: underline;">View in browser</a></td>
        </tr>
      </table>

      <!-- Main Card Container -->
      <div style="max-width: 620px; margin: 0 auto; background-color: #08080a; border-radius: 20px; overflow: hidden; border: 1px solid #1f1f23; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">

        <!-- Hero Header with Golden Wave Shimmer -->
        <div style="background: radial-gradient(circle at 50% 0%, #2b2310 0%, #0c0b08 70%), linear-gradient(180deg, #16120b 0%, #08080a 100%); border-top: 3px solid #ca8a04; padding: 36px 24px 28px; text-align: center;">
          <div style="margin-bottom: 12px;">
            <img src="${logoUrl}" alt="${settings.sender_name}" style="height: 60px; width: auto; max-height: 60px; display: inline-block; vertical-align: middle;" />
          </div>
          <div style="font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-transform: uppercase; margin-top: 10px;">
            ${heroTitle}
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #a1a1aa; margin-top: 8px; letter-spacing: 1px;">
            <span style="color: #ca8a04;">——</span> ${heroSubtitle} <span style="color: #ca8a04;">——</span>
          </div>
        </div>

        <!-- Main Content Section -->
        <div style="padding: 24px 24px 32px; background-color: #08080a;">
          <div style="background-color: #121214; border: 1px solid #27272a; border-radius: 16px; padding: 28px 24px;">
            ${html}
            ${settings.signature ? `<p style="margin-top: 25px; font-style: italic; color: #a1a1aa;">${settings.signature}</p>` : ""}
          </div>

          <!-- 4-Column Feature Bar -->
          <div style="background-color: #121214; border: 1px solid #27272a; border-radius: 14px; padding: 20px 12px; margin-top: 20px; text-align: center;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px; border-right: 1px solid #27272a;">
                  <div style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(234,179,8,0.3); background: rgba(234,179,8,0.08); margin: 0 auto 8px; line-height: 36px; font-size: 16px;">📷</div>
                  <div style="font-size: 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">CAPTURE</div>
                  <div style="font-size: 9px; color: #a1a1aa; margin-top: 2px;">Every Moment</div>
                </td>
                <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px; border-right: 1px solid #27272a;">
                  <div style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(234,179,8,0.3); background: rgba(234,179,8,0.08); margin: 0 auto 8px; line-height: 36px; font-size: 16px;">👥</div>
                  <div style="font-size: 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">SHARE</div>
                  <div style="font-size: 9px; color: #a1a1aa; margin-top: 2px;">With Guests</div>
                </td>
                <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px; border-right: 1px solid #27272a;">
                  <div style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(234,179,8,0.3); background: rgba(234,179,8,0.08); margin: 0 auto 8px; line-height: 36px; font-size: 16px;">☁️</div>
                  <div style="font-size: 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">PRESERVE</div>
                  <div style="font-size: 9px; color: #a1a1aa; margin-top: 2px;">Forever</div>
                </td>
                <td style="width: 25%; text-align: center; vertical-align: top; padding: 0 4px;">
                  <div style="width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(234,179,8,0.3); background: rgba(234,179,8,0.08); margin: 0 auto 8px; line-height: 36px; font-size: 16px;">💛</div>
                  <div style="font-size: 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">CHERISH</div>
                  <div style="font-size: 9px; color: #a1a1aa; margin-top: 2px;">Always</div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Footer Section -->
        <div style="padding: 24px 20px 28px; text-align: center; background-color: #08080a; border-top: 1px solid #1a1a1e;">
          <p style="font-size: 13px; font-weight: 500; color: #e4e4e7; margin: 0 0 10px;">Every Guest. Every Moment. <span style="color: #eab308; font-weight: 800;">One Shared Memory.</span></p>
          ${socialLinksHtml}
          ${customTagsHtml}
          ${builtByCredit}
          <p style="font-size: 11px; color: #71717a; margin: 10px 0 0;">© ${new Date().getFullYear()} ${siteBranding.footer_credits?.powered_by || 'Snapsy'}. All rights reserved.</p>
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
