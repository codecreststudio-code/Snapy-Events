import { z } from "zod"
import { defineRoute, fail } from "@/lib/api/handler"

const addonVerifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
})

// Disabled — paired with the identical shutdown of /api/payments/addon-checkout.
// See that file for the full explanation: this route only ever incremented
// account-wide `users.preferences.guest_boost/shots_boost`, which was the
// mechanism behind boosts leaking across every event a host owned.
// Enforcement no longer reads that bucket, so this route is retired rather
// than migrated — it also has no live UI caller anywhere in the app.
export const POST = defineRoute({
  method: "POST",
  body: addonVerifySchema,
  requireAuth: true,
  handler: async () => {
    return fail(
      "GONE",
      "Standalone add-on top-ups are no longer available. Boosts are purchased per-event from the event's checkout flow.",
      410,
    )
  },
}).POST
