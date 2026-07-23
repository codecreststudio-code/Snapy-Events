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
//
// Layout is computed in two passes: first we measure how tall the header
// text (eyebrow / event name / date / welcome message) will actually render
// at — since a long event name or welcome message can wrap to multiple
// lines — and only THEN do we decide where the QR panel, "scan to upload"
// caption, and footer link go, and how tall the whole canvas needs to be.
// Previously the QR panel's Y position (and canvas height) were fixed
// constants that assumed a single short line of text everywhere; any event
// with a longer name/message/date pushed the header past that fixed offset
// and the QR panel got drawn right on top of it.

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
  luxury: { bgFrom: "#ffffff", bgTo: "#121110", title: "#F5E6C8", subtext: "#C5A059", accent: "#D4AF37", panelBg: "#27211B" },
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

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "")
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
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
    const hasCover = includeCover && !!opts.coverImageUrl
    // Only reserve a big photo band when there's actually a photo to show —
    // otherwise the card was rendering ~45% of blank cream space up top.
    const bandH = hasCover ? 620 : 90

    const headingFont = opts.headingFontFamily || "Georgia, 'Times New Roman', serif"
    if (opts.headingFontFamily && (document as any).fonts?.load) {
      try { await (document as any).fonts.load(`600 64px ${headingFont}`) } catch { /* best-effort */ }
    }

    // ── Pass 1: measure text on a scratch context so we know exactly how
    // many lines the title/message wrap to BEFORE deciding where anything
    // else (QR panel, footer, canvas height) goes. Font metrics come from
    // the browser, not canvas-specific state, so measuring on a throwaway
    // context gives the same wrapping we'll actually draw below. ──
    const measureCanvas = document.createElement("canvas")
    const mctx = measureCanvas.getContext("2d")
    if (!mctx) return null

    mctx.font = `600 64px ${headingFont}`
    const nameLines = wrapLines(mctx, opts.eventName, W - 160, 2)

    mctx.font = "400 32px system-ui, -apple-system, sans-serif"
    const msgLines = opts.welcomeMessage ? wrapLines(mctx, opts.welcomeMessage, W - 220, 3) : []

    // ── Layout: every Y coordinate below is derived from the actual end of
    // whatever was drawn before it, so longer content pushes later elements
    // down instead of being overdrawn by them. ──
    const titleLineH = 74
    const msgLineH = 42

    const eyebrowY = bandH + 70
    const titleStartY = eyebrowY + 80
    let cursorY = titleStartY + (nameLines.length - 1) * titleLineH // baseline of the LAST title line

    let dateY: number | null = null
    if (opts.eventDate) {
      cursorY += 60
      dateY = cursorY
    }
    const msgStartY = cursorY + 55
    const msgEndY = msgLines.length > 0 ? msgStartY + (msgLines.length - 1) * msgLineH : cursorY

    const panelSize = 440
    const panelGap = 80
    const panelY = msgEndY + panelGap
    const panelX = (W - panelSize) / 2

    const captionY = panelY + panelSize + 50
    const codeY = opts.joinCode ? captionY + 42 : captionY
    const footerY = codeY + 60
    const H = Math.round(footerY + 46)

    // ── Pass 2: build the real canvas at the height we just computed and
    // draw everything using the coordinates above. ──
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

    // Cover photo band, faded into the background color — only drawn when
    // there's a real photo, and using an opaque-color-to-opaque-color fade
    // (matching alpha-0 and alpha-1 stops to the SAME rgb) instead of fading
    // from rgba(0,0,0,0): interpolating from transparent BLACK to an opaque
    // light color produces a muddy gray band in the middle of the gradient,
    // because canvas gradients interpolate the RGB channels independently of
    // alpha — that band was rendering right across the event title.
    if (hasCover) {
      const cover = await loadImage(opts.coverImageUrl!, "anonymous")
      if (cover) {
        const scale = Math.max(W / cover.width, bandH / cover.height)
        const dw = cover.width * scale
        const dh = cover.height * scale
        ctx.drawImage(cover, (W - dw) / 2, (bandH - dh) / 2, dw, dh)
      }
      const [r, g, b] = hexToRgb(palette.bgTo)
      const fade = ctx.createLinearGradient(0, bandH - 260, 0, bandH)
      fade.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
      fade.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`)
      ctx.fillStyle = fade
      ctx.fillRect(0, bandH - 260, W, 260)
    }

    // Eyebrow
    ctx.textAlign = "center"
    ctx.fillStyle = palette.accent
    ctx.font = "700 28px system-ui, -apple-system, sans-serif"
    ctx.fillText("Y O U ' R E   I N V I T E D", W / 2, eyebrowY)

    // Event name (heading font, wrapped up to 2 lines)
    ctx.fillStyle = palette.title
    ctx.font = `600 64px ${headingFont}`
    let y = titleStartY
    for (const line of nameLines) {
      ctx.fillText(line, W / 2, y)
      y += titleLineH
    }

    // Date
    if (dateY !== null && opts.eventDate) {
      const formatted = new Date(opts.eventDate).toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
      ctx.fillStyle = palette.accent
      ctx.font = "600 30px system-ui, -apple-system, sans-serif"
      ctx.fillText(formatted, W / 2, dateY)
    }

    // Welcome message
    ctx.fillStyle = palette.subtext
    ctx.font = "400 32px system-ui, -apple-system, sans-serif"
    let my = msgStartY
    for (const line of msgLines) {
      ctx.fillText(line, W / 2, my)
      my += msgLineH
    }

    // QR panel
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
    ctx.fillText("Scan to upload photos", W / 2, captionY)

    // No-scan fallback: the event's short join code, for anyone typing it in
    // manually (e.g. off a printed card) instead of scanning.
    if (opts.joinCode) {
      ctx.fillStyle = palette.accent
      ctx.font = "700 30px system-ui, -apple-system, sans-serif"
      ctx.fillText(`Or enter code: ${opts.joinCode}`, W / 2, codeY)
    }

    // Footer: fallback link text + brand
    ctx.fillStyle = palette.subtext
    ctx.font = "400 22px system-ui, -apple-system, sans-serif"
    ctx.fillText(opts.inviteUrl.replace(/^https?:\/\//, ""), W / 2, footerY)

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
