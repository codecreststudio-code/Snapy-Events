-- 2026-07-fix-event-payment-status.sql
--
-- ONE-OFF DATA BACKFILL — not a schema migration, NOT auto-applied like the
-- numbered files in supabase/migrations/. Run this manually, once, via the
-- Supabase SQL editor or `supabase db execute` / psql against production.
--
-- WHY: `calculatePrice()` at checkout had a bug (now fixed — see
-- src/lib/.../checkout pricing logic and task history) where, if a host
-- already had an "active" subscription for a plan tier, a brand-new event
-- created on that same tier checked out at ₹0 instead of full price. This
-- app bills strictly per-event, so that ₹0 checkout was wrong for any event
-- that was a real, intentional paid booking.
--
-- Two production rows were created under this buggy flow and need their
-- payment records corrected now that the bug is fixed, per the account
-- owner's explicit request:
--
--   1. "Syed's Wedding Celebration" (created ~2026-07-15) — a real,
--      intentional paid event. The Billing page showed "PLAN TIER: Starter"
--      as the account's plan around this time, and the Starter tier is
--      ₹499/event (see PLAN_INFO in src/app/dashboard/billing/page.tsx and
--      the `plans` table row where id = 'starter', price_inr = 499 — both
--      confirmed to match at the time this script was written). Backfilled
--      as a paid Starter-tier event.
--
--   2. "Test-Event---v01" (created ~2026-07-16) — clearly a throwaway test
--      event (see the name). Backfilled as the legitimate Free tier rather
--      than "paid", since there's no real purchase behind it.
--
-- All per-event payment config lives inside the events.settings JSONB
-- column alongside other existing keys (guest_count_plan, photo_limit,
-- content_types, etc.) — there are no dedicated payment columns on the
-- `events` table. This script therefore merges only the payment-related
-- keys into `settings` via jsonb_set()/||, exactly like it found them,
-- rather than overwriting the column wholesale.
--
-- Idempotent: re-running this script simply re-sets the same two rows to
-- the same values — it will not duplicate rows, create new events, or
-- corrupt any other settings keys.

-- ---------------------------------------------------------------------
-- STEP 1: Inspect current state before changing anything.
-- ---------------------------------------------------------------------
SELECT id, name, created_at, settings
FROM public.events
WHERE name IN ('Syed''s Wedding Celebration', 'Test-Event---v01');

-- ---------------------------------------------------------------------
-- STEP 2: Backfill "Syed's Wedding Celebration" as a paid Starter event.
-- paid_at reuses the row's own created_at rather than a hardcoded date.
-- ---------------------------------------------------------------------
UPDATE public.events
SET settings = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{payment_status}', '"paid"'::jsonb, true
      ),
      '{plan_tier}', '"starter"'::jsonb, true
    ),
    '{paid_amount_inr}', '499'::jsonb, true
  ),
  '{paid_at}', to_jsonb(created_at), true
)
WHERE name = 'Syed''s Wedding Celebration';

-- ---------------------------------------------------------------------
-- STEP 3: Backfill "Test-Event---v01" as the legitimate Free tier (no
-- charge, since it's a throwaway test event, not a real purchase).
-- ---------------------------------------------------------------------
UPDATE public.events
SET settings = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{payment_status}', '"free"'::jsonb, true
      ),
      '{plan_tier}', '"free"'::jsonb, true
    ),
    '{paid_amount_inr}', '0'::jsonb, true
  ),
  '{paid_at}', to_jsonb(created_at), true
)
WHERE name = 'Test-Event---v01';

-- ---------------------------------------------------------------------
-- STEP 4: Confirm the resulting settings for both rows.
-- ---------------------------------------------------------------------
SELECT id, name, created_at, settings
FROM public.events
WHERE name IN ('Syed''s Wedding Celebration', 'Test-Event---v01');
