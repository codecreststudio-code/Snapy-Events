import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { isRazorpayConfigured } from "@/lib/integrations/razorpay"
import Razorpay from "razorpay"
import { serverEnv } from "@/lib/env"

const refundBodySchema = z.object({
  transactionId: z.string().uuid(),
  amount: z.number().int().positive().optional(), // partial refund in paise; omit for full refund
  reason: z.string().optional().default("requested_by_customer"),
})

export const POST = defineRoute({
  method: "POST",
  body: refundBodySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { transactionId, amount, reason } = body

    // 1. Fetch the transaction
    const { data: tx, error: txErr } = await sb
      .from("transactions")
      .select("id, razorpay_payment_id, amount, status, user_id, event_id, guests_boost_delta, shots_boost_delta")
      .eq("id", transactionId)
      .single()

    if (txErr || !tx) return fail("NOT_FOUND", "Transaction not found", 404)
    if (tx.status === "refunded") return fail("CONFLICT", "This transaction has already been refunded", 409)
    if (tx.status !== "success") return fail("CONFLICT", "Only successful transactions can be refunded", 409)
    if (!tx.razorpay_payment_id) return fail("CONFLICT", "No Razorpay payment ID found for this transaction", 409)

    // Reverses what this specific transaction granted its event: refunding
    // used to only ever flip transactions.status, leaving the event's own
    // settings — guest_count_plan (the field feature-gate.ts and
    // photos/upload/route.ts actually key entitlements off, not
    // payment_status) and any guests_boost/shots_boost this payment added —
    // fully paid and boosted forever, refund or not. Only reverses THIS
    // transaction's own boost contribution (guests_boost_delta/
    // shots_boost_delta, recorded at purchase time), not the event's whole
    // boost total, so a refund on one of several purchases doesn't wipe out
    // boosts a different, still-valid payment added.
    // Only a full refund reverses entitlements — a partial refund (amount <
    // the original charge) means the host is keeping most of what they paid
    // for, so the event shouldn't be knocked back down to the free tier.
    const isFullRefund = !amount || amount >= tx.amount
    // Rebind as a fresh, non-null const so the nested closure below doesn't
    // need to re-narrow `tx` across a function boundary (TS doesn't carry
    // the `if (!tx) return` narrowing above into nested function
    // declarations, even though `tx` itself is never reassigned).
    const txData = tx

    async function reverseEventEntitlements() {
      if (!txData.event_id || !isFullRefund) return
      const { data: eventRow } = await sb
        .from("events")
        .select("id, settings")
        .eq("id", txData.event_id)
        .maybeSingle()
      if (!eventRow) return
      const currentSettings = (eventRow.settings as Record<string, any>) || {}
      await sb
        .from("events")
        .update({
          settings: {
            ...currentSettings,
            payment_status: "refunded",
            guest_count_plan: "free",
            plan_tier: "free",
            guests_boost: Math.max(0, (currentSettings.guests_boost || 0) - (txData.guests_boost_delta || 0)),
            shots_boost: Math.max(0, (currentSettings.shots_boost || 0) - (txData.shots_boost_delta || 0)),
          },
        })
        .eq("id", txData.event_id)
    }

    // 2. Trigger real Razorpay refund
    if (!isRazorpayConfigured()) {
      // Dev/test mode: just update DB without calling Razorpay
      const { error: updateErr } = await sb
        .from("transactions")
        .update({ status: "refunded" })
        .eq("id", transactionId)

      if (updateErr) return fail("DB_ERROR", "Failed to process refund", 500)
      await reverseEventEntitlements()
      return ok({ success: true, mode: "simulation", message: "Razorpay not configured — DB-only refund recorded." })
    }

    try {
      const razorpay = new Razorpay({
        key_id: serverEnv.RAZORPAY_KEY_ID!,
        key_secret: serverEnv.RAZORPAY_KEY_SECRET!,
      })

      const refundPayload: any = {
        speed: "normal",
        notes: { reason: reason ?? "admin_initiated_refund" },
      }
      if (amount) refundPayload.amount = amount

      const refund = await razorpay.payments.refund(tx.razorpay_payment_id, refundPayload)

      // 3. Update transaction status in DB
      const { error: updateErr } = await sb
        .from("transactions")
        .update({
          status: "refunded",
          gateway_response: refund,
        })
        .eq("id", transactionId)

      if (updateErr) return fail("DB_ERROR", "Failed to update transaction status", 500)

      await reverseEventEntitlements()

      return ok({
        success: true,
        refund_id: refund.id,
        amount_refunded: refund.amount,
        status: refund.status,
      })
    } catch (err: any) {
      const msg = err?.error?.description || err?.description || err?.message || JSON.stringify(err)
      return fail("PAYMENT_ERROR", `Razorpay refund failed: ${msg}`, 500)
    }
  },
}).POST
