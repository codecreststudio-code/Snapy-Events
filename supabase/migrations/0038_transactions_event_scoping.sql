-- 0038_transactions_event_scoping.sql
--
-- Fixes: admin refunds (src/app/api/admin/payments/refund/route.ts) only
-- ever flipped transactions.status to 'refunded' — nothing about a refund
-- touched the specific event's entitlements. Since transactions.event_id
-- didn't exist, the refund handler had no way to find which event a payment
-- was even for, let alone reverse what it granted: the event kept its paid
-- guest_count_plan (feature-gate.ts's own comments already establish this,
-- not payment_status, is the field entitlements are actually keyed off of)
-- and any guests_boost/shots_boost the payment added, forever, refund or not.
--
-- Adds the columns needed to reverse a refund's specific effects:
--  - event_id: which event (if any) this payment was for. Nullable — the
--    admin subscription-plan flow and any account-level charge have no
--    single event to attribute to.
--  - guests_boost_delta / shots_boost_delta: exactly how much this specific
--    transaction added to that event's settings.guests_boost/shots_boost,
--    so a refund can subtract the same amount back out rather than guessing
--    or zeroing a value that may include boosts from OTHER transactions on
--    the same event.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guests_boost_delta INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shots_boost_delta INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_transactions_event ON public.transactions(event_id);
