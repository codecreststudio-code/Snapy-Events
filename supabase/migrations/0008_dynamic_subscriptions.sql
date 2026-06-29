-- 0008_dynamic_subscriptions.sql
-- Refactors the plans schema for full dynamic control, adds features, addons, and automations.

-- 1. Convert plan_id enum to TEXT
-- First, drop dependent foreign keys
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;

-- Now alter the column types
ALTER TABLE public.plans ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.subscriptions ALTER COLUMN plan_id TYPE TEXT USING plan_id::text;
ALTER TABLE public.coupons ALTER COLUMN applicable_plans TYPE TEXT[] USING applicable_plans::text[];

-- Re-add the foreign key constraint
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);

DROP TYPE IF EXISTS plan_id CASCADE;

-- 2. Add new fields to plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS theme_color TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS best_value BOOLEAN NOT NULL DEFAULT false;

-- 3. Create Features table
CREATE TABLE IF NOT EXISTS public.features (
  id TEXT PRIMARY KEY, -- slug (e.g., 'ai_face_search', 'watermarks')
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'boolean', -- boolean, quota, string
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_beta BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Plan Features (Mapping)
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  value JSONB NOT NULL DEFAULT 'true'::jsonb, -- e.g. true for boolean, 500 for quota
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_id)
);

-- 5. Create Addons Table
CREATE TABLE IF NOT EXISTS public.addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_inr INTEGER NOT NULL,
  price_usd INTEGER NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'one_time', -- one_time, monthly, yearly, lifetime
  compatible_plans TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- e.g. 'subscription_cancelled', 'trial_expired'
  action_type TEXT NOT NULL, -- e.g. 'downgrade_plan', 'send_email'
  target_plan TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Add Advanced Restrictions to Coupons
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount_amount INTEGER;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_order_value INTEGER;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS stackable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS first_purchase_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS excluded_plans TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS specific_users UUID[] NOT NULL DEFAULT '{}'::uuid[];

-- 8. Add Addons to Subscriptions/Invoices (for tracking)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS active_addons UUID[] NOT NULL DEFAULT '{}'::uuid[];

-- 9. Create Addon Purchases Table (for tracking one-time or recurring add-on buys)
CREATE TABLE IF NOT EXISTS public.addon_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, refunded
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_addon_purchases_user ON public.addon_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_addon_purchases_sub ON public.addon_purchases(subscription_id);

-- RLS Policies for new tables
DROP POLICY IF EXISTS "features_select" ON public.features;
CREATE POLICY "features_select" ON public.features FOR SELECT USING (true);

DROP POLICY IF EXISTS "features_write" ON public.features;
CREATE POLICY "features_write" ON public.features FOR ALL USING (public.is_platform_admin());

DROP POLICY IF EXISTS "plan_features_select" ON public.plan_features;
CREATE POLICY "plan_features_select" ON public.plan_features FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_features_write" ON public.plan_features;
CREATE POLICY "plan_features_write" ON public.plan_features FOR ALL USING (public.is_platform_admin());

DROP POLICY IF EXISTS "addons_select" ON public.addons;
CREATE POLICY "addons_select" ON public.addons FOR SELECT USING (true);

DROP POLICY IF EXISTS "addons_write" ON public.addons;
CREATE POLICY "addons_write" ON public.addons FOR ALL USING (public.is_platform_admin());

DROP POLICY IF EXISTS "automation_rules_select" ON public.automation_rules;
CREATE POLICY "automation_rules_select" ON public.automation_rules FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS "automation_rules_write" ON public.automation_rules;
CREATE POLICY "automation_rules_write" ON public.automation_rules FOR ALL USING (public.is_platform_admin());

DROP POLICY IF EXISTS "addon_purchases_select" ON public.addon_purchases;
CREATE POLICY "addon_purchases_select" ON public.addon_purchases FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "addon_purchases_write" ON public.addon_purchases;
CREATE POLICY "addon_purchases_write" ON public.addon_purchases FOR ALL USING (public.is_platform_admin());
