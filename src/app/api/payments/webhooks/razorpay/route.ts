import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { verifyRazorpaySignature } from "@/lib/integrations/razorpay"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const sig = request.headers.get("x-razorpay-signature") ?? ""
  const body = await request.text()
  if (!(await verifyRazorpaySignature({ body, signature: sig }))) {
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 })
  }
  const evt = JSON.parse(body) as { event: string; payload: { payment?: { entity: unknown }; subscription?: { entity: unknown } } }
  const supabase = await createServiceClient()
  await supabase.from("webhook_events").insert({
    source: "razorpay",
    event_type: evt.event,
    external_id: (evt.payload?.payment as { id?: string } | undefined)?.id,
    payload: evt,
  })
  try {
    switch (evt.event) {
      case "payment.captured": {
        const p = evt.payload.payment as { id: string; amount: number; currency: string; notes?: { organization_id?: string; plan_id?: string } }
        if (p.notes?.organization_id && p.notes?.plan_id) {
          const sub = await supabase
            .from("subscriptions")
            .upsert(
              {
                organization_id: p.notes.organization_id,
                plan_id: p.notes.plan_id,
                status: "active",
                razorpay_subscription_id: p.id,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
              },
              { onConflict: "organization_id" },
            )
            .select()
            .single()
          await supabase.from("transactions").insert({
            organization_id: p.notes.organization_id,
            subscription_id: sub.data?.id,
            razorpay_payment_id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: "success",
            payment_method: "razorpay",
            gateway_response: evt,
          })
          await supabase.from("organizations").update({ plan: p.notes.plan_id }).eq("id", p.notes.organization_id)
        }
        break
      }
      case "subscription.cancelled":
      case "subscription.halted": {
        const s = evt.payload.subscription as { id: string }
        await supabase.from("subscriptions").update({ status: "cancelled" }).eq("razorpay_subscription_id", s.id)
        break
      }
      case "payment.failed": {
        const p = evt.payload.payment as { id: string; error_code?: string; error_description?: string }
        await supabase.from("transactions").update({ status: "failed", error_code: p.error_code, error_description: p.error_description }).eq("razorpay_payment_id", p.id)
        break
      }
    }
  } catch (e) {
    logger.error("razorpay webhook handler error", { error: String(e) })
  }
  return NextResponse.json({ received: true })
}
