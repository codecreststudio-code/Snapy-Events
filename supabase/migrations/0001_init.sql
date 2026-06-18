-- Snapsy — initial database schema
-- Idempotent: safe to re-run on an existing database. Uses `IF NOT EXISTS`
-- where possible and `DROP ... IF EXISTS` for policies/triggers so upgrades
-- are safe.
--
-- Run order: 000_extensions → 0001_init → 0002_rls_policies → 0003_functions
-- Then seed plans: 0004_seed_plans.sql

-- =============================================================================
-- 000_extensions.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- 0001_init.sql — tables, enums, indexes
-- =============================================================================

-- Enums ----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_id AS ENUM ('free', 'starter', 'standard', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('created', 'sent', 'paid', 'failed', 'refunded', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'rewarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE face_search_type AS ENUM ('upload', 'gallery', 'selfie');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Organizations (tenants) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan plan_id NOT NULL DEFAULT 'free',
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_domain TEXT UNIQUE,
  stripe_customer_id TEXT,
  razorpay_customer_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);

-- Users (profile) — joins to auth.users --------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'member',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_admin BOOLEAN NOT NULL DEFAULT false, -- platform admin
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = true;

-- Organization invitations -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.organization_invitations(email);

-- Events --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  host_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  event_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  venue TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  cover_image_url TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "is_public": true,
    "password_protected": false,
    "allow_guest_uploads": true,
    "auto_approve_photos": false,
    "enable_countdown": false
  }'::jsonb,
  status event_status NOT NULL DEFAULT 'draft',
  view_count INTEGER NOT NULL DEFAULT 0,
  upload_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_events_org ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_host ON public.events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);

-- Galleries -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galleries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  reveal_at TIMESTAMPTZ,
  reveal_enabled BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "allow_uploads": true,
    "allow_downloads": false,
    "show_exif": false,
    "enable_lightbox": true
  }'::jsonb,
  photo_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_galleries_event ON public.galleries(event_id);

-- Photos --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  uploader_email TEXT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  preview_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  exif JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_watermarked BOOLEAN NOT NULL DEFAULT false,
  face_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, ready, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_gallery ON public.photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_photos_event ON public.photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploader ON public.photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_photos_approved ON public.photos(is_approved);
CREATE INDEX IF NOT EXISTS idx_photos_created ON public.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_featured ON public.photos(is_featured) WHERE is_featured = true;

-- QR Codes ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  gallery_id UUID REFERENCES public.galleries(id) ON DELETE SET NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  redirect_url TEXT,
  scan_count INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_event ON public.qr_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON public.qr_codes(is_active) WHERE is_active = true;

-- QR Scans (analytics) ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  referrer TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr ON public.qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_event ON public.qr_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_at ON public.qr_scans(scanned_at DESC);

-- Photo access (guest sessions) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.photo_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  gallery_id UUID REFERENCES public.galleries(id) ON DELETE SET NULL,
  session_token TEXT UNIQUE NOT NULL,
  guest_name TEXT,
  guest_email TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_photo_access_event ON public.photo_access(event_id);
CREATE INDEX IF NOT EXISTS idx_photo_access_token ON public.photo_access(session_token);

-- Plans ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id plan_id PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_inr INTEGER NOT NULL,
  price_usd INTEGER NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  razorpay_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id plan_id NOT NULL REFERENCES public.plans(id),
  razorpay_subscription_id TEXT UNIQUE,
  razorpay_customer_id TEXT,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Invoices ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_invoice_id TEXT UNIQUE,
  invoice_number TEXT NOT NULL UNIQUE,
  status invoice_status NOT NULL DEFAULT 'created',
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal INTEGER NOT NULL,
  tax INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  paid_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Transactions --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status transaction_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  gateway_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_description TEXT,
  refund_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_org ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON public.transactions(invoice_id);

-- Coupons -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  description TEXT,
  discount_type coupon_discount_type NOT NULL,
  discount_value INTEGER NOT NULL,
  min_subscription_months INTEGER NOT NULL DEFAULT 1,
  applicable_plans plan_id[] NOT NULL DEFAULT ARRAY[]::plan_id[],
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;

-- Coupon redemptions --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_org ON public.coupon_redemptions(organization_id);

-- Referrals -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  referred_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  status referral_status NOT NULL DEFAULT 'pending',
  reward_credited BOOLEAN NOT NULL DEFAULT false,
  reward_credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_org_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

-- Faces ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  bounding_box JSONB NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  embedding_path TEXT,
  embedding_model TEXT,
  quality_score DOUBLE PRECISION,
  cluster_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faces_photo ON public.faces(photo_id);
CREATE INDEX IF NOT EXISTS idx_faces_event ON public.faces(event_id);
CREATE INDEX IF NOT EXISTS idx_faces_cluster ON public.faces(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faces_confidence ON public.faces(confidence DESC);

-- Face clusters (unique persons) --------------------------------------------
CREATE TABLE IF NOT EXISTS public.face_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label TEXT,
  representative_face_id UUID REFERENCES public.face_clusters(id) ON DELETE SET NULL,
  face_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_face_clusters_event ON public.face_clusters(event_id);

-- Face search logs ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.face_search_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  search_type face_search_type NOT NULL,
  query_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
  query_image_hash TEXT,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_count INTEGER NOT NULL DEFAULT 0,
  search_duration_ms INTEGER,
  threshold_used DOUBLE PRECISION,
  cost_estimate_usd DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_face_search_logs_user ON public.face_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_face_search_logs_event ON public.face_search_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_face_search_logs_created ON public.face_search_logs(created_at DESC);

-- Live photo wall state (per-event ephemeral cache) ------------------------
CREATE TABLE IF NOT EXISTS public.live_wall_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  message TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  pinned BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_wall_event ON public.live_wall_items(event_id, created_at DESC);

-- Slideshow state -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.slideshows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  transition TEXT NOT NULL DEFAULT 'fade',
  interval_seconds INTEGER NOT NULL DEFAULT 5,
  show_brand BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slideshows_event ON public.slideshows(event_id);

-- Watermark templates -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watermarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text', -- text, image
  content TEXT,
  image_url TEXT,
  position TEXT NOT NULL DEFAULT 'bottom-right',
  opacity DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  scale DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watermarks_org ON public.watermarks(organization_id);

-- Custom domain mappings ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, verifying, active, failed
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  ssl_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_domains_org ON public.custom_domains(organization_id);

-- Analytics events ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_org_type ON public.analytics_events(organization_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.analytics_events(user_id);

-- Audit logs ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_action ON public.audit_logs(organization_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_logs(resource_type, resource_id);

-- Storage usage -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  photo_count INTEGER NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Support tickets -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, pending, resolved, closed
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  category TEXT,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(organization_id, status);

-- Support ticket messages ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_staff_reply BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

-- AI usage ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL, -- detect, embed, search, generate
  units INTEGER NOT NULL DEFAULT 1,
  cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON public.ai_usage(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON public.ai_usage(model, created_at DESC);

-- Platform settings ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email/notification queue --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL, -- email, whatsapp, push
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_org ON public.notification_queue(organization_id);

-- Webhook events log --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL, -- razorpay, resend, whatsapp, etc.
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_source ON public.webhook_events(source, processed);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_webhook_external ON public.webhook_events(source, external_id)
  WHERE external_id IS NOT NULL;

-- Download bundles ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.download_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  photo_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, building, ready, failed
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_download_bundles_event ON public.download_bundles(event_id);
