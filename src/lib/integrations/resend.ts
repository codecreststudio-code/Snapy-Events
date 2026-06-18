// src/lib/integrations/resend.ts
// Resend transactional email. Falls back to no-op in dev when the key is
// missing (we log the message instead).

import "server-only"
import { serverEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

let _resend: import("resend").Resend | null = null

async function client(): Promise<import("resend").Resend | null> {
  if (!serverEnv.RESEND_API_KEY) return null
  if (_resend) return _resend
  const { Resend } = await import("resend")
  _resend = new Resend(serverEnv.RESEND_API_KEY)
  return _resend
}

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: { name: string; value: string }[]
}

export async function sendEmail(msg: EmailMessage): Promise<{ id: string | null; error: string | null }> {
  const c = await client()
  if (!c) {
    logger.info("[email:dev]", { to: msg.to, subject: msg.subject })
    return { id: null, error: null }
  }
  const { data, error } = await c.emails.send({
    from: msg.from ?? "Snapsy <hello@snapsy.app>",
    to: Array.isArray(msg.to) ? msg.to : [msg.to],
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo: msg.replyTo,
    tags: msg.tags,
  })
  if (error) {
    logger.error("resend error", { error: error.message })
    return { id: null, error: error.message }
  }
  return { id: data?.id ?? null, error: null }
}

// Template helpers -----------------------------------------------------------
export function emailWelcome(name: string) {
  return {
    subject: "Welcome to Snapsy",
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h1>Welcome aboard, ${name || "creator"}!</h1>
      <p>Your Snapsy account is ready. Create your first event and start collecting photos in minutes.</p>
      <p><a href="${serverEnv.APP_URL}/dashboard/events/new">Create your first event →</a></p>
    </div>`,
  }
}

export function emailEventCreated(eventName: string) {
  return {
    subject: `Event "${eventName}" is live`,
    html: `<p>Your event <strong>${eventName}</strong> is now live. Share the QR code with your guests to start collecting photos.</p>`,
  }
}

export function emailPhotoUploaded(count: number, eventName: string) {
  return {
    subject: `${count} new photo${count === 1 ? "" : "s"} for ${eventName}`,
    html: `<p>Guests uploaded ${count} new photo${count === 1 ? "" : "s"} to <strong>${eventName}</strong>. <a href="${serverEnv.APP_URL}/dashboard">Review them now →</a></p>`,
  }
}

export function emailPaymentReceipt(invoiceNumber: string, amount: number, currency: string) {
  return {
    subject: `Payment receipt — ${invoiceNumber}`,
    html: `<p>Thank you for your payment of <strong>${(amount / 100).toFixed(2)} ${currency}</strong>. Invoice: ${invoiceNumber}.</p>`,
  }
}
