import { z } from "zod"
import { defineRoute, fail } from "@/lib/api/handler"

const addonCheckoutSchema = z.object({
  boost_type: z.enum(["guest", "shots"]),
  boost_value: z.number().min(1),
})

// Disabled. This standalone flow had no `event_id` anywhere in its schema —
// it could only ever grant a boost account-wide via
// `users.preferences.guest_boost/shots_boost`. That bucket was exactly the
// source of a cross-event leak fixed across the payment system: a boost
// bought for one event permanently inflated the guest/shot limits of every
// OTHER event the same host owned, because nothing ever reset it per event.
// Enforcement (photos/upload/route.ts, events/public-info/route.ts) now
// reads boosts from the specific event's own `settings.guests_boost` /
// `settings.shots_boost` instead, and no longer looks at
// `users.preferences` at all — so left live, this route would still take a
// real payment but grant nothing anywhere a host could see it. There is
// also no UI caller anywhere in the app (the Billing page and the event
// wizard both use the event-scoped /api/payments/checkout + verify flow).
// It's disabled rather than reworked to be event-scoped, since that would
// require new UI (letting a host pick which event to top up) that doesn't
// exist today.
export const POST = defineRoute({
  method: "POST",
  body: addonCheckoutSchema,
  requireAuth: true,
  handler: async () => {
    return fail(
      "GONE",
      "Standalone add-on top-ups are no longer available. Boosts are purchased per-event from the event's checkout flow.",
      410,
    )
  },
}).POST
