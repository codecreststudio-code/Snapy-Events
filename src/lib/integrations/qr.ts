// src/lib/integrations/qr.ts
// Generates QR code images and encodes them as data URLs.

import "server-only"
import QRCode from "qrcode"

export async function generateQrDataUrl(opts: { data: string; size?: number; margin?: number; dark?: string; light?: string }) {
  return QRCode.toDataURL(opts.data, {
    errorCorrectionLevel: "M",
    margin: opts.margin ?? 1,
    width: opts.size ?? 512,
    color: { dark: opts.dark ?? "#000000", light: opts.light ?? "#ffffff" },
  })
}

export async function generateQrBuffer(opts: { data: string; size?: number; margin?: number }) {
  return QRCode.toBuffer(opts.data, {
    errorCorrectionLevel: "M",
    margin: opts.margin ?? 1,
    width: opts.size ?? 1024,
    type: "png",
  })
}

export function generateQrCode(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let out = ""
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
