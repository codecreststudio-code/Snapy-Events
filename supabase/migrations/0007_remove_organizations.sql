-- 0007_remove_organizations.sql
-- Removes the Organizations multi-tenant architecture and transitions to a single-user model.

-- 1. Add user_id to tables that previously relied solely on organization_id
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.coupon_redemptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.watermarks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.storage_usage ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Data Migration: Try to infer ownership from organization_id before dropping it
-- This assigns the new user_id based on the "owner" of the organization it belonged to.
DO $$ 
BEGIN
  -- Subscriptions
  UPDATE public.subscriptions s 
  SET user_id = (SELECT id FROM public.users u WHERE u.organization_id = s.organization_id ORDER BY is_admin DESC, created_at ASC LIMIT 1) 
  WHERE user_id IS NULL;

  -- Invoices
  UPDATE public.invoices s 
  SET user_id = (SELECT id FROM public.users u WHERE u.organization_id = s.organization_id ORDER BY is_admin DESC, created_at ASC LIMIT 1) 
  WHERE user_id IS NULL;

  -- Transactions
  UPDATE public.transactions s 
  SET user_id = (SELECT id FROM public.users u WHERE u.organization_id = s.organization_id ORDER BY is_admin DESC, created_at ASC LIMIT 1) 
  WHERE user_id IS NULL;

  -- Events (ensure host_id is set)
  UPDATE public.events e 
  SET host_id = (SELECT id FROM public.users u WHERE u.organization_id = e.organization_id ORDER BY is_admin DESC, created_at ASC LIMIT 1) 
  WHERE host_id IS NULL;
EXCEPTION
  WHEN OTHERS THEN 
    -- Ignore errors if tables are empty or users don't exist
    NULL;
END $$;

-- 3. Drop all dependent RLS Policies BEFORE dropping the columns
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "org_select" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "org_insert" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "org_update" ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS "org_delete" ON public.organizations';
  END IF;
END $$;

DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_invitations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "inv_select" ON public.organization_invitations';
    EXECUTE 'DROP POLICY IF EXISTS "inv_manage" ON public.organization_invitations';
  END IF;
END $$;

DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;

DROP POLICY IF EXISTS "galleries_select" ON public.galleries;
DROP POLICY IF EXISTS "galleries_write" ON public.galleries;

DROP POLICY IF EXISTS "photos_select" ON public.photos;
DROP POLICY IF EXISTS "photos_write" ON public.photos;

DROP POLICY IF EXISTS "qr_select" ON public.qr_codes;
DROP POLICY IF EXISTS "qr_write" ON public.qr_codes;
DROP POLICY IF EXISTS "qr_scans_select" ON public.qr_scans;

DROP POLICY IF EXISTS "photo_access_self" ON public.photo_access;

DROP POLICY IF EXISTS "subs_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subs_manage" ON public.subscriptions;

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;

DROP POLICY IF EXISTS "transactions_select" ON public.transactions;

DROP POLICY IF EXISTS "cr_select" ON public.coupon_redemptions;

DROP POLICY IF EXISTS "referrals_select" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert" ON public.referrals;

DROP POLICY IF EXISTS "faces_select" ON public.faces;
DROP POLICY IF EXISTS "faces_write" ON public.faces;

DROP POLICY IF EXISTS "fc_select" ON public.face_clusters;
DROP POLICY IF EXISTS "fc_write" ON public.face_clusters;

DROP POLICY IF EXISTS "fsl_select" ON public.face_search_logs;

DROP POLICY IF EXISTS "lw_select" ON public.live_wall_items;
DROP POLICY IF EXISTS "lw_write" ON public.live_wall_items;

DROP POLICY IF EXISTS "ss_select" ON public.slideshows;
DROP POLICY IF EXISTS "ss_write" ON public.slideshows;

DROP POLICY IF EXISTS "wm_select" ON public.watermarks;
DROP POLICY IF EXISTS "wm_write" ON public.watermarks;

DROP POLICY IF EXISTS "cd_select" ON public.custom_domains;
DROP POLICY IF EXISTS "cd_write" ON public.custom_domains;

DROP POLICY IF EXISTS "ae_select" ON public.analytics_events;
DROP POLICY IF EXISTS "al_select" ON public.audit_logs;
DROP POLICY IF EXISTS "su_select" ON public.storage_usage;

DROP POLICY IF EXISTS "st_select" ON public.support_tickets;
DROP POLICY IF EXISTS "stm_select" ON public.support_ticket_messages;

DROP POLICY IF EXISTS "aiu_select" ON public.ai_usage;
DROP POLICY IF EXISTS "nq_select" ON public.notification_queue;
DROP POLICY IF EXISTS "db_select" ON public.download_bundles;
DROP POLICY IF EXISTS "db_write" ON public.download_bundles;

-- 4. Drop organization_id columns and related tables
ALTER TABLE public.events DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.coupon_redemptions DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.face_search_logs DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.watermarks DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.custom_domains DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.analytics_events DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.storage_usage DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.ai_usage DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.notification_queue DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.download_bundles DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.referrals DROP COLUMN IF EXISTS referrer_org_id CASCADE;
ALTER TABLE public.referrals DROP COLUMN IF EXISTS referred_org_id CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS organization_id CASCADE;

DROP TABLE IF EXISTS public.organization_invitations CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Drop obsolete functions
DROP FUNCTION IF EXISTS public.current_org_id();
DROP FUNCTION IF EXISTS public.same_org(uuid);

-- 5. Recreate RLS Policies centered around `user_id` and `host_id`

-- Users
CREATE POLICY "users_select" ON public.users FOR SELECT USING (public.is_platform_admin() OR id = auth.uid());
CREATE POLICY "users_update_self" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Events (uses host_id)
CREATE POLICY "events_select" ON public.events FOR SELECT USING (public.is_platform_admin() OR host_id = auth.uid() OR (status = 'published' AND COALESCE((settings->>'is_public')::boolean, true)));
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (host_id = auth.uid());
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (host_id = auth.uid());
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (host_id = auth.uid());

-- Galleries (checks event host)
CREATE POLICY "galleries_select" ON public.galleries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = galleries.event_id AND (public.is_platform_admin() OR e.host_id = auth.uid() OR (e.status = 'published' AND (galleries.is_public OR COALESCE((e.settings->>'is_public')::boolean, true)))))
);
CREATE POLICY "galleries_write" ON public.galleries FOR ALL USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = galleries.event_id AND e.host_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = galleries.event_id AND e.host_id = auth.uid()));

-- Photos
CREATE POLICY "photos_select" ON public.photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = photos.event_id AND (public.is_platform_admin() OR e.host_id = auth.uid() OR (e.status = 'published' AND (photos.is_approved OR COALESCE((e.settings->>'auto_approve_photos')::boolean, false)))))
);
CREATE POLICY "photos_write" ON public.photos FOR ALL USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = photos.event_id AND e.host_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = photos.event_id AND e.host_id = auth.uid()));

-- QR Codes
CREATE POLICY "qr_select" ON public.qr_codes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = qr_codes.event_id AND (public.is_platform_admin() OR e.host_id = auth.uid() OR e.status = 'published'))
);
CREATE POLICY "qr_write" ON public.qr_codes FOR ALL USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = qr_codes.event_id AND e.host_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = qr_codes.event_id AND e.host_id = auth.uid()));

CREATE POLICY "qr_scans_select" ON public.qr_scans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = qr_scans.event_id AND (public.is_platform_admin() OR e.host_id = auth.uid()))
);

-- Photo access
CREATE POLICY "photo_access_self" ON public.photo_access FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = photo_access.event_id AND (e.host_id = auth.uid() OR public.is_platform_admin()))
) WITH CHECK (true);

-- Billing & Subscriptions
CREATE POLICY "subs_select" ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "subs_manage" ON public.subscriptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "cr_select" ON public.coupon_redemptions FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());

-- Referrals
CREATE POLICY "referrals_select" ON public.referrals FOR SELECT USING (referrer_user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "referrals_insert" ON public.referrals FOR INSERT WITH CHECK (referrer_user_id = auth.uid());

-- Faces
CREATE POLICY "faces_select" ON public.faces FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = faces.event_id AND (e.host_id = auth.uid() OR public.is_platform_admin() OR e.status = 'published'))
);
CREATE POLICY "faces_write" ON public.faces FOR ALL USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = faces.event_id AND e.host_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = faces.event_id AND e.host_id = auth.uid()));

CREATE POLICY "fc_select" ON public.face_clusters FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = face_clusters.event_id AND (e.host_id = auth.uid() OR public.is_platform_admin()))
);
CREATE POLICY "fc_write" ON public.face_clusters FOR ALL USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = face_clusters.event_id AND e.host_id = auth.uid()));

CREATE POLICY "fsl_select" ON public.face_search_logs FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());

-- Others
CREATE POLICY "lw_select" ON public.live_wall_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = live_wall_items.event_id AND (e.host_id = auth.uid() OR e.status = 'published')));
CREATE POLICY "lw_write" ON public.live_wall_items FOR ALL USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = live_wall_items.event_id AND e.host_id = auth.uid()));

CREATE POLICY "ss_select" ON public.slideshows FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = slideshows.event_id AND (e.host_id = auth.uid() OR e.status = 'published')));
CREATE POLICY "ss_write" ON public.slideshows FOR ALL USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = slideshows.event_id AND e.host_id = auth.uid()));

CREATE POLICY "wm_select" ON public.watermarks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "wm_write" ON public.watermarks FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "cd_select" ON public.custom_domains FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cd_write" ON public.custom_domains FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ae_select" ON public.analytics_events FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "al_select" ON public.audit_logs FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "su_select" ON public.storage_usage FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "st_select" ON public.support_tickets FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "stm_select" ON public.support_ticket_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_ticket_messages.ticket_id AND (t.user_id = auth.uid() OR public.is_platform_admin()))
);

CREATE POLICY "aiu_select" ON public.ai_usage FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "nq_select" ON public.notification_queue FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "db_select" ON public.download_bundles FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "db_write" ON public.download_bundles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
