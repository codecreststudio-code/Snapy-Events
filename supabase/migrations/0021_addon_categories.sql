-- 0021_addon_categories.sql
-- Adds a proper `category` + numeric `value` column to `addons`, replacing
-- the fragile name-substring classification that GET /api/payments/addons
-- used to rely on (a shot-boost add-on named "Shots Boost (+10 Shots/Guest)"
-- contains the word "guest" too, which previously misclassified every shot
-- boost as a guest boost). Categories are now explicit and admin-set via a
-- dropdown instead of guessed from free text.
--
-- Also extends admin's write access to pricing that was previously
-- hardcoded and NOT editable anywhere: the event-wizard's per-guest photo
-- limit upsell tiers, and the Videos / Voice Notes unlock add-ons (see the
-- "What can your guests contribute?" wizard step).

ALTER TABLE public.addons
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS value INTEGER;

-- Backfill category + value for existing guest/shot boost rows from their
-- names, using the same (corrected) shot-before-guest precedence.
UPDATE public.addons
SET
  category = CASE
    WHEN lower(name) LIKE '%shot%' THEN 'shot_boost'
    WHEN lower(name) LIKE '%guest%' THEN 'guest_boost'
    ELSE category
  END,
  value = COALESCE(value, (regexp_match(name, '\+(\d+)'))[1]::INTEGER)
WHERE category IS NULL;

-- Guarded (matches the DO/EXCEPTION idiom already used in
-- 0016_prod_hardening.sql) so this is safe to re-run against an environment
-- where it already applied — bare `ADD CONSTRAINT` failed with "already
-- exists" (SQLSTATE 42710 / duplicate_object) on Supabase's preview-branch
-- CI check.
DO $$ BEGIN
  ALTER TABLE public.addons
    ADD CONSTRAINT addons_category_check CHECK (
      category IS NULL OR category IN (
        'guest_boost', 'shot_boost', 'photo_limit_boost', 'video_addon', 'voice_addon'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_addons_category ON public.addons(category);

-- Seed the previously-hardcoded photo-limit / video / voice pricing as real,
-- admin-editable rows (only if nothing with that category exists yet, so
-- this is safe to re-run and won't duplicate rows an admin already edited).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.addons WHERE category = 'photo_limit_boost') THEN
    INSERT INTO public.addons (name, description, price_inr, price_usd, billing_type, compatible_plans, is_active, category, value)
    VALUES
      ('Photo Limit Boost (+10/Guest)', 'Raise the per-guest photo cap to 10', 99, 2, 'one_time', '{starter,standard,premium}', true, 'photo_limit_boost', 10),
      ('Photo Limit Boost (+25/Guest)', 'Raise the per-guest photo cap to 25', 179, 3, 'one_time', '{starter,standard,premium}', true, 'photo_limit_boost', 25),
      ('Photo Limit Boost (+50/Guest)', 'Raise the per-guest photo cap to 50', 249, 4, 'one_time', '{starter,standard,premium}', true, 'photo_limit_boost', 50),
      ('Photo Limit Boost (Unlimited/Guest)', 'Unlimited photos per guest', 599, 8, 'one_time', '{starter,standard,premium}', true, 'photo_limit_boost', -1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.addons WHERE category = 'video_addon') THEN
    INSERT INTO public.addons (name, description, price_inr, price_usd, billing_type, compatible_plans, is_active, category, value)
    VALUES ('Video Uploads Unlock', 'Enables guest video uploads for events on plans that don''t already include it', 599, 8, 'one_time', '{starter}', true, 'video_addon', 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.addons WHERE category = 'voice_addon') THEN
    INSERT INTO public.addons (name, description, price_inr, price_usd, billing_type, compatible_plans, is_active, category, value)
    VALUES ('Voice Notes Unlock', 'Enables guest voice notes for events on plans that don''t already include it', 399, 5, 'one_time', '{starter,standard}', true, 'voice_addon', 1);
  END IF;
END $$;
