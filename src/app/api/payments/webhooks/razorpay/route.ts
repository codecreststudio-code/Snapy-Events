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
  const evt = JSON.parse(body) as { event: string; payload: any }
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
            plan_id?: string
            guest_boost?: string
            shots_boost?: string
          }
        }
        
        if (p.notes?.user_id) {
          // First, create transaction record for this payment
          await supabase.from("transactions").insert({
            user_id: p.notes.user_id,
            razorpay_payment_id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: "success",
            payment_method: "razorpay",
            gateway_response: evt,
          })

          // If this is a subscription payment, update/create subscription
          if (p.notes.plan_id) {
            const { data: existingSub } = await supabase
              .from("subscriptions")
              .select("id")
              .eq("user_id", p.notes.user_id)
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
                  user_id: p.notes.user_id,
                  plan_id: p.notes.plan_id,
                  status: "active",
                  razorpay_subscription_id: p.subscription_id || null,
                  current_period_start: new Date().toISOString(),
                  current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
                })
            }

            // Update user boosts in preferences
            const { data: userProfile } = await supabase
              .from("users")
              .select("preferences")
              .eq("id", p.notes.user_id)
              .single()

            const currentPrefs = (userProfile?.preferences as Record<string, any>) || {}
            const newPrefs = {
              ...currentPrefs,
              guest_boost: (currentPrefs.guest_boost || 0) + (p.notes.guest_boost ? parseInt(p.notes.guest_boost) : 0),
              shots_boost: (currentPrefs.shots_boost || 0) + (p.notes.shots_boost ? parseInt(p.notes.shots_boost) : 0),
            }

            await supabase
              .from("users")
              .update({ preferences: newPrefs })
              .eq("id", p.notes.user_id)
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
        
        if (p.notes?.user_id) {
          // Create transaction record for failed payment
          await supabase.from("transactions").insert({
            user_id: p.notes.user_id,
            razorpay_payment_id: p.id,
            status: "failed",
            error_code: p.error_code,
            error_description: p.error_description,
            gateway_response: evt,
            amount: evt.payload.payment.amount || 0,
            currency: evt.payload.payment.currency || "INR",
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
