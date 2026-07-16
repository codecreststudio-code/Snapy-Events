"use client"

// Renders a shareable "invitation card" PNG for an event: the host's cover
// photo, the theme/welcome message they picked in the event wizard's
// "Design your invitation experience" step (src/app/dashboard/events/new/new-event-form.tsx,
// saved to event.settings.invitation), and the event's live QR code, composed
// onto a single portrait image. This is what gets attached when the host
// shares to WhatsApp/Instagram/etc. — not just a bare link — so the invite
// guests receive actually reflects what the host designed.
//
// Everything happens client-side via <canvas>; nothing is uploaded anywhere.

export type InvitationTheme = "minimal" | "luxury" | "modern" | "elegant" | "glass" | "dark"

// Mirrors the THEME_PRESETS palette in new-event-form.tsx (that one is
// Tailwind classes for a live DOM preview; this is the same palette as hex
// values so <canvas> can paint it). Keep these two in sync if the wizard
// palette changes.
const THEME_PALETTES: Record<InvitationTheme, {
  bgFrom: string
  bgTo: string
  title: string
  subtext: string
  accent: string
  panelBg: string
}> = {
  minimal: { bgFrom: "#FAF9F6", bgTo: "#FAF9F6", title: "#1C1A17", subtext: "#7A756E", accent: "#A58263", panelBg: "#FFFFFF" },
  luxury: { bgFrom: "#1C1814", bgTo: "#121110", title: "#F5E6C8", subtext: "#C5A059", accent: "#D4AF37", panelBg: "#27211B" },
  modern: { bgFrom: "#0F172A", bgTo: "#1E1B4B", title: "#FFFFFF", subtext: "#C7D2FE", accent: "#A855F7", panelBg: "#1E1B4B" },
  elegant: { bgFrom: "#FAF5F0", bgTo: "#EFE2D3", title: "#2C221E", subtext: "#8C7665", accent: "#9E5A47", panelBg: "#FFFFFF" },
  glass: { bgFrom: "#1E1B4B", bgTo: "#0F172A", title: "#FFFFFF", subtext: "#E9D5FF", accent: "#F9A8D4", panelBg: "#2A2550" },
  dark: { bgFrom: "#09090B", bgTo: "#09090B", title: "#F4F4F5", subtext: "#A1A1AA", accent: "#FBBF24", panelBg: "#18181B" },
}

export interface InvitationCardOptions {
  eventName: string
  welcomeMessage: string
  theme: InvitationTheme
  eventDate?: string | null
  coverImageUrl?: string | null
  inviteUrl: string
  /** id of an already-rendered <QRCodeSVG> element on the page to reuse (avoids re-encoding the QR). */
  qrSvgElementId: string
  /** Pass playfair.style.fontFamily from the calling component so headings use the site's serif font. */
  headingFontFamily?: string
  /** Short join_code (migrations/0023_event_join_code.sql) — printed under the QR as a no-scan fallback. */
  joinCode?: string
}

function loadImage(src: string, crossOrigin?: "anonymous"): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = crossOrigin
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function loadQrImage(qrSvgElementId: string): Promise<HTMLImageElement | null> {
  const svgEl = document.getElementById(qrSvgElementId)
  if (!svgEl) return null
  const svgData = new XMLSerializer().serializeToString(svgEl)
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)
  const img = await loadImage(url)
  URL.revokeObjectURL(url)
  return img
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines - 1) break
    } else {
      current = attempt
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) lines.length = maxLines
  else if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…")
  }
  return lines
}

/**
 * Draws the card onto a canvas and resolves a PNG Blob. Retries once without
 * the remote cover photo if drawing it taints the canvas (cross-origin image
 * host without permissive CORS headers) — better to ship a card without the
 * photo than to fail the whole share/download action.
 */
export async function generateInvitationCard(opts: InvitationCardOptions): Promise<Blob | null> {
  const palette = THEME_PALETTES[opts.theme] || THEME_PALETTES.minimal

  async function render(includeCover: boolean): Promise<Blob | null> {
    const W = 1080
    const H = 1350
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
    bgGrad.addColorStop(0, palette.bgFrom)
    bgGrad.addColorStop(1, palette.bgTo)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // Cover photo band (top ~48%), faded into the background color
    const bandH = Math.round(H * 0.48)
    if (includeCover && opts.coverImageUrl) {
      const cover = await loadImage(opts.coverImageUrl, "anonymous")
      if (cover) {
        const scale = Math.max(W / cover.width, bandH / cover.height)
        const dw = cover.width * scale
        const dh = cover.height * scale
        ctx.drawImage(cover, (W - dw) / 2, (bandH - dh) / 2, dw, dh)
      }
    }
    const fade = ctx.createLinearGradient(0, bandH - 260, 0, bandH)
    fade.addColorStop(0, "rgba(0,0,0,0)")
    fade.addColorStop(1, palette.bgTo)
    ctx.fillStyle = fade
    ctx.fillRect(0, bandH - 260, W, 260)

    // Eyebrow
    ctx.textAlign = "center"
    ctx.fillStyle = palette.accent
    ctx.font = "700 28px system-ui, -apple-system, sans-serif"
    ctx.fillText("Y O U ' R E   I N V I T E D", W / 2, bandH + 70)

    // Event name (heading font, wrapped up to 2 lines)
    const headingFont = opts.headingFontFamily || "Georgia, 'Times New Roman', serif"
    if (opts.headingFontFamily && (document as any).fonts?.load) {
      try { await (document as any).fonts.load(`600 64px ${headingFont}`) } catch { /* best-effort */ }
    }
    ctx.fillStyle = palette.title
    ctx.font = `600 64px ${headingFont}`
    const nameLines = wrapLines(ctx, opts.eventName, W - 160, 2)
    let y = bandH + 150
    for (const line of nameLines) {
      ctx.fillText(line, W / 2, y)
      y += 74
    }

    // Date
    if (opts.eventDate) {
      const formatted = new Date(opts.eventDate).toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
      ctx.fillStyle = palette.accent
      ctx.font = "600 30px system-ui, -apple-system, sans-serif"
      ctx.fillText(formatted, W / 2, y + 20)
      y += 60
    }

    // Welcome message
    ctx.fillStyle = palette.subtext
    ctx.font = "400 32px system-ui, -apple-system, sans-serif"
    const msgLines = wrapLines(ctx, opts.welcomeMessage, W - 220, 3)
    let my = y + 55
    for (const line of msgLines) {
      ctx.fillText(line, W / 2, my)
      my += 42
    }

    // QR panel
    const panelSize = 480
    const panelY = H - panelSize - 130
    const panelX = (W - panelSize) / 2
    const radius = 32
    ctx.fillStyle = palette.panelBg
    ctx.beginPath()
    ctx.moveTo(panelX + radius, panelY)
    ctx.arcTo(panelX + panelSize, panelY, panelX + panelSize, panelY + panelSize, radius)
    ctx.arcTo(panelX + panelSize, panelY + panelSize, panelX, panelY + panelSize, radius)
    ctx.arcTo(panelX, panelY + panelSize, panelX, panelY, radius)
    ctx.arcTo(panelX, panelY, panelX + panelSize, panelY, radius)
    ctx.closePath()
    ctx.fill()

    const qrImg = await loadQrImage(opts.qrSvgElementId)
    const qrPad = 40
    if (qrImg) {
      ctx.drawImage(qrImg, panelX + qrPad, panelY + qrPad, panelSize - qrPad * 2, panelSize - qrPad * 2)
    }

    ctx.fillStyle = palette.subtext
    ctx.font = "600 26px system-ui, -apple-system, sans-serif"
    ctx.fillText("Scan to upload photos", W / 2, panelY + panelSize + 50)

    // No-scan fallback: the event's short join code, for anyone typing it in
    // manually (e.g. off a printed card) instead of scanning.
    if (opts.joinCode) {
      ctx.fillStyle = palette.accent
      ctx.font = "700 30px system-ui, -apple-system, sans-serif"
      ctx.fillText(`Or enter code: ${opts.joinCode}`, W / 2, panelY + panelSize + 92)
    }

    // Footer: fallback link text + brand
    ctx.fillStyle = palette.subtext
    ctx.font = "400 22px system-ui, -apple-system, sans-serif"
    ctx.fillText(opts.inviteUrl.replace(/^https?:\/\//, ""), W / 2, H - 50)

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"))
  }

  const blob = await render(true)
  if (blob) return blob
  // Cover image likely tainted the canvas (no CORS header) — retry without it.
  return render(false)
}

export function buildInvitationCaption(eventName: string, welcomeMessage: string, inviteUrl: string, joinCode?: string): string {
  const codeLine = joinCode ? `\n\nOr enter code ${joinCode} at ${new URL(inviteUrl).origin}` : ""
  return `${welcomeMessage}\n\nJoin "${eventName}" and share your photos:\n${inviteUrl}${codeLine}`
}
