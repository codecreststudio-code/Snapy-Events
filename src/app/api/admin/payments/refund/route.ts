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
      .select("id, razorpay_payment_id, amount, status, organization_id")
      .eq("id", transactionId)
      .single()

    if (txErr || !tx) return fail("NOT_FOUND", "Transaction not found", 404)
    if (tx.status === "refunded") return fail("CONFLICT", "This transaction has already been refunded", 409)
    if (tx.status !== "success") return fail("CONFLICT", "Only successful transactions can be refunded", 409)
    if (!tx.razorpay_payment_id) return fail("CONFLICT", "No Razorpay payment ID found for this transaction", 409)

    // 2. Trigger real Razorpay refund
    if (!isRazorpayConfigured()) {
      // Dev/test mode: just update DB without calling Razorpay
      const { error: updateErr } = await sb
        .from("transactions")
        .update({ status: "refunded" })
        .eq("id", transactionId)

      if (updateErr) return fail("DB_ERROR", updateErr.message, 500)
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

      if (updateErr) return fail("DB_ERROR", updateErr.message, 500)

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
