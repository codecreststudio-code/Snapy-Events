// src/lib/integrations/whatsapp.ts
// WhatsApp Business Cloud API. Sends pre-approved template messages.

import "server-only"
import { serverEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

const API_BASE = "https://graph.facebook.com/v20.0"

export function isWhatsAppConfigured(): boolean {
  return Boolean(serverEnv.WHATSAPP_BUSINESS_API_KEY && serverEnv.WHATSAPP_PHONE_NUMBER_ID)
}

interface TemplateMessage {
  to: string // E.164 phone number
  template: string
  languageCode?: string
  parameters: string[]
}

async function sendTemplate(msg: TemplateMessage) {
  if (!isWhatsAppConfigured()) {
    logger.info("[whatsapp:dev]", { to: msg.to, template: msg.template, parameters: msg.parameters })
    return { id: null, error: null }
  }
  const url = `${API_BASE}/${serverEnv.WHATSAPP_PHONE_NUMBER_ID}/messages`
  const body = {
    messaging_product: "whatsapp",
    to: msg.to,
    type: "template",
    template: {
      name: msg.template,
      language: { code: msg.languageCode ?? "en" },
      components: [
        {
          type: "body",
          parameters: msg.parameters.map((text) => ({ type: "text", text })),
        },
      ],
    },
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.WHATSAPP_BUSINESS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } }
  if (!res.ok || data.error) {
    const err = data.error?.message ?? `HTTP ${res.status}`
    logger.error("whatsapp error", { error: err })
    return { id: null, error: err }
  }
  return { id: data.messages?.[0]?.id ?? null, error: null }
}

// Templates ----------------------------------------------------------------
export const WhatsAppTemplates = {
  eventCreated: (eventName: string, eventUrl: string) =>
    sendTemplate({ to: "", template: "event_created", parameters: [eventName, eventUrl] }),
  photoUploaded: (eventName: string, count: number) =>
    sendTemplate({ to: "", template: "photo_uploaded", parameters: [eventName, String(count)] }),
  galleryRevealed: (eventName: string, galleryUrl: string) =>
    sendTemplate({ to: "", template: "gallery_revealed", parameters: [eventName, galleryUrl] }),
  photoApproved: (count: number, eventName: string) =>
    sendTemplate({ to: "", template: "photo_approved", parameters: [String(count), eventName] }),
}

export async function verifyWhatsAppWebhook(opts: { mode: string; token: string; challenge: string }) {
  const VERIFY_TOKEN = serverEnv.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "snapsy-verify"
  if (opts.mode === "subscribe" && opts.token === VERIFY_TOKEN) {
    return { ok: true as const, challenge: opts.challenge }
  }
  return { ok: false as const, challenge: null }
}
