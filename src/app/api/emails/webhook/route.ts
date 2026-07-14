import { type NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { adminDb } from "@/lib/supabase/admin"
import { logger } from "@/lib/logger"

// Resend delivers webhooks via Svix. The signing secret is `whsec_<base64>`.
// Signed content is `${svix-id}.${svix-timestamp}.${rawBody}`; the header holds
// space-separated `v1,<base64sig>` entries.
function verifySvix(secret: string, id: string, ts: string, rawBody: string, header: string): boolean {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64")
  const expBuf = Buffer.from(expected, "utf8")
  for (const part of header.split(" ")) {
    const sig = part.split(",")[1]
    if (!sig) continue
    const sigBuf = Buffer.from(sig, "utf8")
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) return true
  }
  return false
}

// Resend webhooks are sent with a signature header.
// See: https://resend.com/docs/dashboard/webhooks/introduction
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    logger.error("RESEND_WEBHOOK_SECRET not set; rejecting webhook")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }
  const raw = await request.text()
  const svixId = request.headers.get("svix-id") ?? ""
  const svixTs = request.headers.get("svix-timestamp") ?? ""
  const svixSig = request.headers.get("svix-signature") ?? ""
  if (!svixId || !svixTs || !svixSig || !verifySvix(secret, svixId, svixTs, raw, svixSig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let body: { type?: string; data?: { email_id?: string } }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { type, data } = body

  logger.info("Resend webhook received", { type, email_id: data?.email_id })

  try {
    const sb = await adminDb()

    switch (type) {
      case "email.sent":
      case "email.delivered":
        await sb
          .from("email_logs")
          .update({ status: "sent" })
          .eq("resend_id", data?.email_id)
        break

      case "email.opened":
        await sb
          .from("email_logs")
          .update({ opened_at: new Date().toISOString() })
          .eq("resend_id", data?.email_id)
        break

      case "email.clicked":
        await sb
          .from("email_logs")
          .update({ clicked_at: new Date().toISOString() })
          .eq("resend_id", data?.email_id)
        break

      case "email.bounced":
      case "email.complained":
        await sb
          .from("email_logs")
          .update({
            status: "failed",
            error_message: type === "email.bounced" ? "Email bounced" : "Spam complaint received",
          })
          .eq("resend_id", data?.email_id)
        break

      default:
        logger.info("Unhandled Resend webhook type", { type })
    }
  } catch (err) {
    logger.error("Failed to process Resend webhook", { error: String(err), type })
  }

  return NextResponse.json({ received: true })
}
