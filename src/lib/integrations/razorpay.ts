// src/lib/integrations/razorpay.ts
// Razorpay client + helpers. Lazily imports the SDK so the bundle stays
// small on the public pages.

import "server-only"
import Razorpay from "razorpay"
import { serverEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

let _client: Razorpay | null = null

function client(): Razorpay {
  if (_client) return _client
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim()
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim()

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)")
  }

  _client = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
  return _client
}

export function isRazorpayConfigured(): boolean {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim()
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim()
  return Boolean(keyId && keySecret)
}

export async function createRazorpayCustomer(opts: {
  name: string
  email: string
  contact?: string
  notes?: Record<string, string>
}) {
  return client().customers.create({
    name: opts.name,
    email: opts.email,
    contact: opts.contact,
    notes: opts.notes ?? {},
  })
}

export async function createRazorpayOrder(opts: {
  amount: number // in paise
  currency?: string
  receipt: string
  notes?: Record<string, string>
}) {
  return client().orders.create({
    amount: opts.amount,
    currency: opts.currency ?? "INR",
    receipt: opts.receipt,
    notes: opts.notes,
  })
}

export async function createRazorpaySubscription(opts: {
  planId: string
  customerId: string
  totalCount: number
  notes?: Record<string, string>
  startAt?: number
}) {
  return client().subscriptions.create({
    plan_id: opts.planId,
    customer_notify: 1,
    total_count: opts.totalCount,
    start_at: opts.startAt,
    notes: opts.notes,
    customer_id: opts.customerId,
  } as any)
}

export async function cancelRazorpaySubscription(subscriptionId: string, cancelAtCycleEnd = true) {
  return client().subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  return client().subscriptions.fetch(subscriptionId)
}

export async function fetchRazorpayInvoice(invoiceId: string) {
  return client().invoices.fetch(invoiceId)
}

export async function verifyRazorpaySignature(opts: {
  body: string
  signature: string
  secret?: string
}): Promise<boolean> {
  const crypto = await import("node:crypto")
  const secret = opts.secret ?? serverEnv.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    logger.warn("RAZORPAY_WEBHOOK_SECRET not set; rejecting signature")
    return false
  }
  const expected = crypto.createHmac("sha256", secret).update(opts.body).digest("hex")
  return expected === opts.signature
}

// Map our plan IDs to the Razorpay plan ID stored in `plans.razorpay_plan_id`.
// Plans without a Razorpay plan ID use a `pay-as-you-go` order-based flow.
export function planCurrency(plan: string): { amount: number; currency: "INR" | "USD" } {
  switch (plan) {
    case "starter":
      return { amount: 49900, currency: "INR" }
    case "standard":
      return { amount: 149900, currency: "INR" }
    case "premium":
      return { amount: 399900, currency: "INR" }
    default:
      return { amount: 0, currency: "INR" }
  }
}
