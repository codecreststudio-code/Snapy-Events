-- Snapsy Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Organizations (Multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'standard', 'premium')),
  feature_flags JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan ON organizations(plan);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  event_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  venue TEXT,
  timezone TEXT DEFAULT 'UTC',
  cover_image_url TEXT,
  settings JSONB DEFAULT '{
    "is_public": true,
    "password_protected": false,
    "password": null,
    "allow_guest_uploads": true,
    "auto_approve_photos": false,
    "enable_countdown": false,
    "countdown_date": null
  }',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'archived')),
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_events_organization ON events(organization_id);
CREATE INDEX idx_events_host ON events(host_id);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_event_date ON events(event_date);

-- Galleries
CREATE TABLE galleries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  reveal_at TIMESTAMPTZ,
  reveal_enabled BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{
    "allow_uploads": true,
    "allow_downloads": false,
    "show_exif": false,
    "enable_lightbox": true
  }',
  photo_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, slug)
);

CREATE INDEX idx_galleries_event ON galleries(event_id);
CREATE INDEX idx_galleries_slug ON galleries(slug);
CREATE INDEX idx_galleries_public ON galleries(is_public);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE NOT NULL,
  uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size INT,
  width INT,
  height INT,
  metadata JSONB DEFAULT '{}',
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  face_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_gallery ON photos(gallery_id);
CREATE INDEX idx_photos_event ON photos(event_id);
CREATE INDEX idx_photos_uploader ON photos(uploader_id);
CREATE INDEX idx_photos_approved ON photos(is_approved);
CREATE INDEX idx_photos_featured ON photos(is_featured);
CREATE INDEX idx_photos_created ON photos(created_at DESC);

-- QR Codes
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  redirect_url TEXT,
  scan_count INT DEFAULT 0,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_codes_event ON qr_codes(event_id);
CREATE INDEX idx_qr_codes_gallery ON qr_codes(gallery_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_codes_active ON qr_codes(is_active);

-- Photo Access (Guest sessions)
CREATE TABLE photo_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  guest_name TEXT,
  guest_email TEXT,
  permissions JSONB DEFAULT '[]',
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_photo_access_event ON photo_access(event_id);
CREATE INDEX idx_photo_access_gallery ON photo_access(gallery_id);
CREATE INDEX idx_photo_access_token ON photo_access(session_token);

-- ============================================
-- PAYMENTS (Phase 2)
-- ============================================

-- Plans
CREATE TABLE plans (
  id TEXT PRIMARY KEY CHECK (id IN ('free', 'starter', 'standard', 'premium')),
  name TEXT NOT NULL,
  description TEXT,
  price_inr INT NOT NULL,
  price_usd INT NOT NULL,
  billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  features JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  razorpay_subscription_id TEXT UNIQUE,
  razorpay_customer_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'ended')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_razorpay ON subscriptions(razorpay_subscription_id);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  razorpay_invoice_id TEXT UNIQUE,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'sent', 'paid', 'failed', 'refunded', 'cancelled')),
  currency TEXT DEFAULT 'INR',
  subtotal INT NOT NULL,
  tax INT DEFAULT 0,
  total INT NOT NULL,
  paid_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ
);

CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  amount INT NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  payment_method TEXT,
  gateway_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_organization ON transactions(organization_id);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_razorpay ON transactions(razorpay_payment_id);

-- Coupons
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INT NOT NULL,
  min_subscription_months INT DEFAULT 1,
  max_uses INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);

-- Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  referred_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_credited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_org_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_org_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ============================================
-- AI FACE SEARCH (Phase 3)
-- ============================================

-- Faces
CREATE TABLE faces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  bounding_box JSONB NOT NULL,
  confidence FLOAT NOT NULL,
  embedding_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_faces_photo ON faces(photo_id);
CREATE INDEX idx_faces_confidence ON faces(confidence);

-- Face Search Logs
CREATE TABLE face_search_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('upload', 'gallery')),
  query_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  results JSONB NOT NULL DEFAULT '[]',
  search_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_face_search_user ON face_search_logs(user_id);
CREATE INDEX idx_face_search_type ON face_search_logs(search_type);
CREATE INDEX idx_face_search_created ON face_search_logs(created_at DESC);

-- ============================================
-- ANALYTICS & AUDIT (Phase 5)
-- ============================================

-- Analytics Events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_organization ON analytics_events(organization_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Storage Usage
CREATE TABLE storage_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_bytes BIGINT DEFAULT 0,
  photo_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storage_organization ON storage_usage(organization_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their organization"
  ON organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Policies for users
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'owner'));

-- Policies for events
CREATE POLICY "Users can view events in their organization"
  ON events FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Members can create events in their organization"
  ON events FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member')));

CREATE POLICY "Users can update events in their organization"
  ON events FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member')));

CREATE POLICY "Admins can delete events in their organization"
  ON events FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Public events policy
CREATE POLICY "Anyone can view published public events"
  ON events FOR SELECT
  USING (status = 'published' AND settings->>'is_public' = 'true');

-- Policies for galleries
CREATE POLICY "Users can view galleries in their events"
  ON galleries FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Members can create galleries"
  ON galleries FOR INSERT
  WITH CHECK (event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member'))));

CREATE POLICY "Users can update galleries in their events"
  ON galleries FOR UPDATE
  USING (event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Admins can delete galleries"
  ON galleries FOR DELETE
  USING (event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))));

-- Public galleries policy
CREATE POLICY "Anyone can view public galleries"
  ON galleries FOR SELECT
  USING (is_public = true AND event_id IN (SELECT id FROM events WHERE status = 'published'));

-- Policies for photos
CREATE POLICY "Users can view photos in their galleries"
  ON photos FOR SELECT
  USING (gallery_id IN (SELECT id FROM galleries WHERE event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))));

CREATE POLICY "Users can insert photos into their galleries"
  ON photos FOR INSERT
  WITH CHECK (gallery_id IN (SELECT id FROM galleries WHERE event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))));

CREATE POLICY "Users can update photos in their galleries"
  ON photos FOR UPDATE
  USING (gallery_id IN (SELECT id FROM galleries WHERE event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))));

CREATE POLICY "Users can delete photos in their galleries"
  ON photos FOR DELETE
  USING (gallery_id IN (SELECT id FROM galleries WHERE event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))));

-- Public photos policy
CREATE POLICY "Anyone can view approved photos in public galleries"
  ON photos FOR SELECT
  USING (is_approved = true AND gallery_id IN (SELECT id FROM galleries WHERE is_public = true));

-- Policies for qr_codes
CREATE POLICY "Users can manage QR codes in their events"
  ON qr_codes FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

-- Public QR scan tracking
CREATE POLICY "Anyone can scan QR codes"
  ON qr_codes FOR SELECT
  USING (is_active = true);

-- Policies for subscriptions (admin only)
CREATE POLICY "Admins can view subscriptions in their org"
  ON subscriptions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Policies for invoices
CREATE POLICY "Admins can view invoices"
  ON invoices FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Policies for transactions
CREATE POLICY "Admins can view transactions"
  ON transactions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON galleries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update photo count on gallery
CREATE OR REPLACE FUNCTION update_gallery_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE galleries SET photo_count = photo_count + 1 WHERE id = NEW.gallery_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE galleries SET photo_count = photo_count - 1 WHERE id = OLD.gallery_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photo_count
  AFTER INSERT OR DELETE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_gallery_photo_count();

-- Function to increment QR scan count
CREATE OR REPLACE FUNCTION increment_qr_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qr_codes SET scan_count = scan_count + 1 WHERE code = NEW.code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default plans
INSERT INTO plans (id, name, description, price_inr, price_usd, features, limits) VALUES
('free', 'Free', 'Perfect for trying out Snapsy', 0, 0,
  '["1 event", "1 GB storage", "100 photos", "Basic QR codes"]',
  '{"events_limit": 1, "storage_limit_gb": 1, "photo_limit": 100, "qr_codes_per_event": 1, "galleries_per_event": 1, "ai_searches": 0, "custom_branding": false, "priority_support": false}'),
('starter', 'Starter', 'For small events and personal use', 499, 6,
  '["5 events", "10 GB storage", "5,000 photos", "10 QR codes per event", "Email support"]',
  '{"events_limit": 5, "storage_limit_gb": 10, "photo_limit": 5000, "qr_codes_per_event": 10, "galleries_per_event": 5, "ai_searches": 50, "custom_branding": false, "priority_support": false}'),
('standard', 'Standard', 'For growing photographers', 1499, 18,
  '["25 events", "100 GB storage", "50,000 photos", "50 QR codes per event", "Analytics", "AI Face Search", "Custom branding", "Priority support"]',
  '{"events_limit": 25, "storage_limit_gb": 100, "photo_limit": 50000, "qr_codes_per_event": 50, "galleries_per_event": 20, "ai_searches": 500, "custom_branding": true, "priority_support": false}'),
('premium', 'Premium', 'For professional photographers and large events', 3999, 48,
  '["Unlimited events", "1 TB storage", "Unlimited photos", "Unlimited QR codes", "AI Face Search", "Custom branding", "White label", "Priority support", "Dedicated support"]',
  '{"events_limit": -1, "storage_limit_gb": 1000, "photo_limit": -1, "qr_codes_per_event": -1, "galleries_per_event": -1, "ai_searches": -1, "custom_branding": true, "priority_support": true}');

-- ============================================
-- ADDITIONAL TABLES (Synced with Prisma Schema)
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS face_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  face_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_wall_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slideshows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watermarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  ssl_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS download_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  download_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  images_processed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enable for new tables
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_wall_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE slideshows ENABLE ROW LEVEL SECURITY;
ALTER TABLE watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queues ENABLE ROW LEVEL SECURITY;

-- Service role default policies for webhooks and queues
CREATE POLICY "Service role full access on webhook_events" ON webhook_events FOR ALL USING (true);
CREATE POLICY "Service role full access on notification_queues" ON notification_queues FOR ALL USING (true);
CREATE POLICY "Admins can manage custom domains" ON custom_domains FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "Users can view support tickets" ON support_tickets FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- These should be created in Supabase Storage:
--
-- 1. event-covers (public)
-- 2. gallery-covers (public)
-- 3. photos (private)
-- 4. photos-public (public)
-- 5. faces (private)
-- 6. avatars (public)
-- 7. qr-codes (public)