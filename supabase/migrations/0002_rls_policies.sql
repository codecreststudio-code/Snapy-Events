-- 0002_rls_policies.sql
-- Row-level security for every multi-tenant table. Service role bypasses
-- RLS automatically; end users hit the policies below.
--
-- Strategy:
--  - `organizations` — anyone in the same org can read; only owners can update/delete
--  - `users` — users can read their own row + org-mates; admins can update
--  - All other tenant tables — read/write only when organization_id matches the
--    caller's org, with role-based write restrictions

-- Helper: read current user --------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.users WHERE id = auth.uid()),
    'viewer'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.same_org(target_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT target_org = public.current_org_id()
$$;

-- Enable RLS on all tables ---------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_wall_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slideshows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_bundles ENABLE ROW LEVEL SECURITY;

-- organizations --------------------------------------------------------------
DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select" ON public.organizations FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.same_org(id)
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.organization_id = organizations.id
        AND e.status = 'published'
        AND COALESCE((e.settings->>'is_public')::boolean, true)
    )
  );

DROP POLICY IF EXISTS "org_insert" ON public.organizations;
CREATE POLICY "org_insert" ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations FOR UPDATE
  USING (public.is_platform_admin() OR (public.same_org(id) AND public.current_user_role() IN ('owner', 'admin')));

DROP POLICY IF EXISTS "org_delete" ON public.organizations;
CREATE POLICY "org_delete" ON public.organizations FOR DELETE
  USING (public.current_user_role() = 'owner' AND public.same_org(id));

-- users ----------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (
    public.is_platform_admin()
    OR id = auth.uid()
    OR public.same_org(organization_id)
  );

DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users FOR UPDATE
  USING (id = auth.uid() OR (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin')));

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- organization_invitations ---------------------------------------------------
DROP POLICY IF EXISTS "inv_select" ON public.organization_invitations;
CREATE POLICY "inv_select" ON public.organization_invitations FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "inv_manage" ON public.organization_invitations;
CREATE POLICY "inv_manage" ON public.organization_invitations FOR ALL
  USING (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin'))
  WITH CHECK (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin'));

-- events ---------------------------------------------------------------------
DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.same_org(organization_id)
    OR (status = 'published' AND COALESCE((settings->>'is_public')::boolean, true))
  );

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events FOR INSERT
  WITH CHECK (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin', 'member'));

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events FOR UPDATE
  USING (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin', 'member'));

DROP POLICY IF EXISTS "events_delete" ON public.events;
CREATE POLICY "events_delete" ON public.events FOR DELETE
  USING (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin'));

-- galleries ------------------------------------------------------------------
DROP POLICY IF EXISTS "galleries_select" ON public.galleries;
CREATE POLICY "galleries_select" ON public.galleries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = galleries.event_id
        AND (
          public.is_platform_admin()
          OR public.same_org(e.organization_id)
          OR (e.status = 'published' AND (galleries.is_public OR COALESCE((e.settings->>'is_public')::boolean, true)))
        )
    )
  );

DROP POLICY IF EXISTS "galleries_write" ON public.galleries;
CREATE POLICY "galleries_write" ON public.galleries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = galleries.event_id
        AND public.same_org(e.organization_id)
        AND public.current_user_role() IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = galleries.event_id
        AND public.same_org(e.organization_id)
        AND public.current_user_role() IN ('owner', 'admin', 'member')
    )
  );

-- photos ---------------------------------------------------------------------
DROP POLICY IF EXISTS "photos_select" ON public.photos;
CREATE POLICY "photos_select" ON public.photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = photos.event_id
        AND (
          public.is_platform_admin()
          OR public.same_org(e.organization_id)
          OR (e.status = 'published' AND (photos.is_approved OR COALESCE((e.settings->>'auto_approve_photos')::boolean, false)))
        )
    )
  );

DROP POLICY IF EXISTS "photos_write" ON public.photos;
CREATE POLICY "photos_write" ON public.photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = photos.event_id
        AND public.same_org(e.organization_id)
        AND public.current_user_role() IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = photos.event_id
        AND public.same_org(e.organization_id)
    )
  );

-- qr_codes -------------------------------------------------------------------
DROP POLICY IF EXISTS "qr_select" ON public.qr_codes;
CREATE POLICY "qr_select" ON public.qr_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = qr_codes.event_id
        AND (public.is_platform_admin() OR public.same_org(e.organization_id) OR e.status = 'published')
    )
  );

DROP POLICY IF EXISTS "qr_write" ON public.qr_codes;
CREATE POLICY "qr_write" ON public.qr_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = qr_codes.event_id
        AND public.same_org(e.organization_id)
        AND public.current_user_role() IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = qr_codes.event_id
        AND public.same_org(e.organization_id)
    )
  );

DROP POLICY IF EXISTS "qr_scans_insert" ON public.qr_scans;
CREATE POLICY "qr_scans_insert" ON public.qr_scans FOR INSERT
  WITH CHECK (true); -- public can record a scan

DROP POLICY IF EXISTS "qr_scans_select" ON public.qr_scans;
CREATE POLICY "qr_scans_select" ON public.qr_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = qr_scans.event_id
        AND (public.is_platform_admin() OR public.same_org(e.organization_id))
    )
  );

-- photo_access ---------------------------------------------------------------
DROP POLICY IF EXISTS "photo_access_self" ON public.photo_access;
CREATE POLICY "photo_access_self" ON public.photo_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = photo_access.event_id
        AND (public.same_org(e.organization_id) OR public.is_platform_admin())
    )
  )
  WITH CHECK (true);

-- plans (public read) --------------------------------------------------------
DROP POLICY IF EXISTS "plans_public" ON public.plans;
CREATE POLICY "plans_public" ON public.plans FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "plans_admin" ON public.plans;
CREATE POLICY "plans_admin" ON public.plans FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- subscriptions --------------------------------------------------------------
DROP POLICY IF EXISTS "subs_select" ON public.subscriptions;
CREATE POLICY "subs_select" ON public.subscriptions FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "subs_manage" ON public.subscriptions;
CREATE POLICY "subs_manage" ON public.subscriptions FOR ALL
  USING (public.same_org(organization_id) AND public.current_user_role() IN ('owner'))
  WITH CHECK (public.same_org(organization_id) AND public.current_user_role() IN ('owner'));

-- invoices -------------------------------------------------------------------
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- transactions ---------------------------------------------------------------
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- coupons (public validate) --------------------------------------------------
DROP POLICY IF EXISTS "coupons_public" ON public.coupons;
CREATE POLICY "coupons_public" ON public.coupons FOR SELECT
  USING (is_active AND (valid_until IS NULL OR valid_until > now()));

DROP POLICY IF EXISTS "coupons_admin" ON public.coupons;
CREATE POLICY "coupons_admin" ON public.coupons FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- coupon_redemptions ---------------------------------------------------------
DROP POLICY IF EXISTS "cr_select" ON public.coupon_redemptions;
CREATE POLICY "cr_select" ON public.coupon_redemptions FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- referrals ------------------------------------------------------------------
DROP POLICY IF EXISTS "referrals_select" ON public.referrals;
CREATE POLICY "referrals_select" ON public.referrals FOR SELECT
  USING (public.same_org(referrer_org_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "referrals_insert" ON public.referrals;
CREATE POLICY "referrals_insert" ON public.referrals FOR INSERT
  WITH CHECK (public.same_org(referrer_org_id));

-- faces ----------------------------------------------------------------------
DROP POLICY IF EXISTS "faces_select" ON public.faces;
CREATE POLICY "faces_select" ON public.faces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = faces.event_id
        AND (public.same_org(e.organization_id) OR public.is_platform_admin() OR e.status = 'published')
    )
  );

DROP POLICY IF EXISTS "faces_write" ON public.faces;
CREATE POLICY "faces_write" ON public.faces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = faces.event_id
        AND public.same_org(e.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = faces.event_id
        AND public.same_org(e.organization_id)
    )
  );

-- face_clusters --------------------------------------------------------------
DROP POLICY IF EXISTS "fc_select" ON public.face_clusters;
CREATE POLICY "fc_select" ON public.face_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = face_clusters.event_id
        AND (public.same_org(e.organization_id) OR public.is_platform_admin())
    )
  );

DROP POLICY IF EXISTS "fc_write" ON public.face_clusters;
CREATE POLICY "fc_write" ON public.face_clusters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = face_clusters.event_id
        AND public.same_org(e.organization_id)
    )
  );

-- face_search_logs -----------------------------------------------------------
DROP POLICY IF EXISTS "fsl_select" ON public.face_search_logs;
CREATE POLICY "fsl_select" ON public.face_search_logs FOR SELECT
  USING (user_id = auth.uid() OR public.is_platform_admin() OR public.same_org(organization_id));

DROP POLICY IF EXISTS "fsl_insert" ON public.face_search_logs;
CREATE POLICY "fsl_insert" ON public.face_search_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- live_wall_items ------------------------------------------------------------
DROP POLICY IF EXISTS "lw_select" ON public.live_wall_items;
CREATE POLICY "lw_select" ON public.live_wall_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = live_wall_items.event_id
        AND (public.same_org(e.organization_id) OR e.status = 'published')
    )
  );

DROP POLICY IF EXISTS "lw_write" ON public.live_wall_items;
CREATE POLICY "lw_write" ON public.live_wall_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = live_wall_items.event_id
        AND public.same_org(e.organization_id)
    )
  );

-- slideshows -----------------------------------------------------------------
DROP POLICY IF EXISTS "ss_select" ON public.slideshows;
CREATE POLICY "ss_select" ON public.slideshows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = slideshows.event_id
        AND (public.same_org(e.organization_id) OR e.status = 'published')
    )
  );

DROP POLICY IF EXISTS "ss_write" ON public.slideshows;
CREATE POLICY "ss_write" ON public.slideshows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = slideshows.event_id
        AND public.same_org(e.organization_id)
    )
  );

-- watermarks -----------------------------------------------------------------
DROP POLICY IF EXISTS "wm_select" ON public.watermarks;
CREATE POLICY "wm_select" ON public.watermarks FOR SELECT USING (public.same_org(organization_id));

DROP POLICY IF EXISTS "wm_write" ON public.watermarks;
CREATE POLICY "wm_write" ON public.watermarks FOR ALL
  USING (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin', 'member'))
  WITH CHECK (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin', 'member'));

-- custom_domains -------------------------------------------------------------
DROP POLICY IF EXISTS "cd_select" ON public.custom_domains;
CREATE POLICY "cd_select" ON public.custom_domains FOR SELECT USING (public.same_org(organization_id));

DROP POLICY IF EXISTS "cd_write" ON public.custom_domains;
CREATE POLICY "cd_write" ON public.custom_domains FOR ALL
  USING (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin'))
  WITH CHECK (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin'));

-- analytics_events -----------------------------------------------------------
DROP POLICY IF EXISTS "ae_select" ON public.analytics_events;
CREATE POLICY "ae_select" ON public.analytics_events FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- audit_logs -----------------------------------------------------------------
DROP POLICY IF EXISTS "al_select" ON public.audit_logs;
CREATE POLICY "al_select" ON public.audit_logs FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- storage_usage --------------------------------------------------------------
DROP POLICY IF EXISTS "su_select" ON public.storage_usage;
CREATE POLICY "su_select" ON public.storage_usage FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- support_tickets ------------------------------------------------------------
DROP POLICY IF EXISTS "st_select" ON public.support_tickets;
CREATE POLICY "st_select" ON public.support_tickets FOR SELECT
  USING (user_id = auth.uid() OR public.same_org(organization_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "st_write" ON public.support_tickets;
CREATE POLICY "st_write" ON public.support_tickets FOR ALL
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "stm_select" ON public.support_ticket_messages;
CREATE POLICY "stm_select" ON public.support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (t.user_id = auth.uid() OR public.is_platform_admin() OR public.same_org(t.organization_id))
    )
  );

DROP POLICY IF EXISTS "stm_write" ON public.support_ticket_messages;
CREATE POLICY "stm_write" ON public.support_ticket_messages FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

-- ai_usage -------------------------------------------------------------------
DROP POLICY IF EXISTS "aiu_select" ON public.ai_usage;
CREATE POLICY "aiu_select" ON public.ai_usage FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- platform_settings (admin only) --------------------------------------------
DROP POLICY IF EXISTS "ps_admin" ON public.platform_settings;
CREATE POLICY "ps_admin" ON public.platform_settings FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- notification_queue ---------------------------------------------------------
DROP POLICY IF EXISTS "nq_select" ON public.notification_queue;
CREATE POLICY "nq_select" ON public.notification_queue FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

-- webhook_events (admin only) -----------------------------------------------
DROP POLICY IF EXISTS "we_admin" ON public.webhook_events;
CREATE POLICY "we_admin" ON public.webhook_events FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- download_bundles -----------------------------------------------------------
DROP POLICY IF EXISTS "db_select" ON public.download_bundles;
CREATE POLICY "db_select" ON public.download_bundles FOR SELECT
  USING (public.same_org(organization_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "db_write" ON public.download_bundles;
CREATE POLICY "db_write" ON public.download_bundles FOR ALL
  USING (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin', 'member'))
  WITH CHECK (public.same_org(organization_id) AND public.current_user_role() IN ('owner', 'admin', 'member'));
