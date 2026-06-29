import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/supabase/admin"
import { logger } from "@/lib/logger"

// Resend webhooks are sent with a signature header.
// See: https://resend.com/docs/dashboard/webhooks/introduction
export async function POST(request: NextRequest) {
  const body = await request.json()
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
