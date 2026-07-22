import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { verifyRazorpaySignature } from "@/lib/integrations/razorpay"
import { logger } from "@/lib/logger"
import { sendEmail } from "@/lib/integrations/resend"

export async function POST(request: NextRequest) {
  const sig = request.headers.get("x-razorpay-signature") ?? ""
  let body: string
  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }
  if (!(await verifyRazorpaySignature({ body, signature: sig }))) {
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 })
  }
  let evt: { event: string; payload: any }
  try {
    evt = JSON.parse(body) as { event: string; payload: any }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 })
  }
  const supabase = await createServiceClient()
  await supabase.from("webhook_events").insert({
    source: "razorpay",
    event_type: evt.event,
    external_id: (evt.payload?.payment as { id?: string } | undefined)?.id ?? 
                 (evt.payload?.subscription as { id?: string } | undefined)?.id,
    payload: evt,
  })
  try {
    switch (evt.event) {
      case "payment.captured": {
        const p = evt.payload.payment as {
          id: string
          amount: number
          currency: string
          subscription_id?: string
          notes?: {
            user_id?: string
            event_id?: string
            plan_id?: string
            guest_boost?: string
            shots_boost?: string
          }
        }
        
        const userId = p.notes?.user_id
        if (userId) {
          // Idempotency: the browser's own /api/payments/verify or
          // /api/payments/addon-verify call usually beats this webhook to
          // recording the payment. Without this check, a payment confirmed
          // both ways would apply its guest/shots boost twice — this table
          // has a unique constraint on razorpay_payment_id, so re-inserting
          // silently failed before, but nothing stopped the boost increment
          // further down from running a second time anyway.
          const { data: existingTxn } = await supabase
            .from("transactions")
            .select("id")
            .eq("razorpay_payment_id", p.id)
            .maybeSingle()
          if (existingTxn) {
            break
          }

          const { data: userRow } = await supabase
            .from("users")
            .select("id, email, full_name, preferences")
            .eq("id", userId)
            .maybeSingle()

          // First, create transaction record for this payment. event_id +
          // the boost deltas are stored here so an admin refund can find
          // and reverse exactly what this payment granted — see the
          // identical field usage + fuller explanation in
          // src/app/api/payments/verify/route.ts.
          await supabase.from("transactions").insert({
            user_id: userId,
            razorpay_payment_id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: "success",
            payment_method: "razorpay",
            gateway_response: evt,
            event_id: p.notes?.event_id ?? null,
            guests_boost_delta: p.notes?.guest_boost ? parseInt(p.notes.guest_boost) : 0,
            shots_boost_delta: p.notes?.shots_boost ? parseInt(p.notes.shots_boost) : 0,
          })

          // If this is a subscription payment, update/create subscription
          if (p.notes?.plan_id) {
            const { data: existingSub } = await supabase
              .from("subscriptions")
              .select("id")
              .eq("user_id", userId)
              .in("status", ["active", "past_due"])
              .limit(1)
              .maybeSingle()

            if (existingSub) {
              await supabase
                .from("subscriptions")
                .update({
                  plan_id: p.notes.plan_id,
                  status: "active",
                  razorpay_subscription_id: p.subscription_id || null,
                  current_period_start: new Date().toISOString(),
                  current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
                })
                .eq("id", existingSub.id)
            } else {
              await supabase
                .from("subscriptions")
                .insert({
                  user_id: userId,
                  plan_id: p.notes.plan_id,
                  status: "active",
                  razorpay_subscription_id: p.subscription_id || null,
                  current_period_start: new Date().toISOString(),
                  current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
                })
            }

            // Guest/shot boosts are written onto the specific event's own
            // settings below, not onto `users.preferences` — an
            // account-wide bucket this webhook used to increment
            // unconditionally, with no per-event reset, causing a boost
            // bought for one event to permanently inflate every other event
            // the host ever created. See the identical fix + fuller
            // explanation in src/app/api/payments/verify/route.ts.

            // Mark the specific event this payment was for as paid — mirrors
            // the same write in /api/payments/verify. This webhook is a
            // background confirmation that may arrive before or after the
            // browser's own /verify call; the idempotency check above (via
            // the transactions table) means only one of the two paths
            // actually reaches this block per payment.
            if (p.notes?.event_id) {
              const { data: eventRow } = await supabase
                .from("events")
                .select("id, host_id, settings")
                .eq("id", p.notes.event_id)
                .maybeSingle()
              if (eventRow && eventRow.host_id === userId) {
                const currentSettings = (eventRow.settings as Record<string, any>) || {}
                await supabase
                  .from("events")
                  .update({
                    settings: {
                      ...currentSettings,
                      payment_status: "paid",
                      plan_tier: p.notes.plan_id,
                      paid_amount_inr: p.amount / 100,
                      razorpay_payment_id: p.id,
                      paid_at: new Date().toISOString(),
                      // Event-scoped boost amounts — see the removed
                      // account-wide preferences increment above.
                      guests_boost: (currentSettings.guests_boost || 0) + (p.notes.guest_boost ? parseInt(p.notes.guest_boost) : 0),
                      shots_boost: (currentSettings.shots_boost || 0) + (p.notes.shots_boost ? parseInt(p.notes.shots_boost) : 0),
                    },
                  })
                  .eq("id", p.notes.event_id)
              }
            }

            // Fetch user email for receipt
            if (userRow?.email) {
              const invoiceNumber = `INV-${p.id.slice(-8).toUpperCase()}`
              void sendEmail({
                to: userRow.email,
                templateId: "payment_receipt",
                variables: {
                  host_name: userRow.full_name || userRow.email,
                  invoice_number: invoiceNumber,
                  plan_name: p.notes.plan_id || "Subscription",
                  payment_amount: ((p.amount || 0) / 100).toFixed(2),
                  dashboard_url: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app",
                },
                tags: [{ name: "type", value: "payment-receipt" }],
              })
            }
          }
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
        const p = evt.payload.payment as { 
          id: string
          error_code?: string
          error_description?: string
          notes?: { user_id?: string }
        }
        
        const userId = p.notes?.user_id
        if (userId) {
          await supabase.from("transactions").insert({
            user_id: userId,
            razorpay_payment_id: p.id,
            status: "failed",
            error_code: p.error_code,
            error_description: p.error_description,
            gateway_response: evt,
            amount: evt.payload.payment?.amount || 0,
            currency: evt.payload.payment?.currency || "INR",
          })
        }
        break
      }
    }
  } catch (e) {
    logger.error("razorpay webhook handler error", { error: String(e) })
  }
  return NextResponse.json({ received: true })
}
