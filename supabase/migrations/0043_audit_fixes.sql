-- 0043_audit_fixes.sql
--
-- Four independent, additive fixes found during a full-app audit. Each is
-- guarded/idempotent so this is safe to run any number of times.

-- =============================================================================
-- 1. notifications INSERT policy was over-permissive (same class of bug as
--    admin_notifications, already fixed for that table in
--    0011_fix_rls_and_triggers.sql section 5).
-- =============================================================================
-- 0039_notification_infrastructure.sql defined:
--   CREATE POLICY "Service role can insert notifications" ON public.notifications
--     FOR INSERT WITH CHECK (true);
-- with no `TO service_role` restriction, so it actually applies to every
-- role including `authenticated` — meaning any logged-in user could insert
-- a notification row for ANY other user_id (spoofed "system" notifications
-- in someone else's Notification Center). Notifications are only ever
-- created server-side via the service-role client (see the comment already
-- in 0039), which bypasses RLS entirely and needs no policy at all — so the
-- fix is simply to remove the policy, exactly like 0011 did for
-- admin_notifications.
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- =============================================================================
-- 2. analytics_events.user_id has no FK — same bug already fixed for
--    audit_logs.user_id in 0018_audit_logs_user_fk.sql.
-- =============================================================================
-- Added as NOT VALID (like 0018) so any legacy rows referencing a deleted
-- user don't block this migration; PostgREST can still embed `user:users(...)`
-- regardless of validation status.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analytics_events_user_id_fkey'
  ) THEN
    ALTER TABLE public.analytics_events
      ADD CONSTRAINT analytics_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- =============================================================================
-- 3. coupons.created_by / platform_settings.updated_by reference users(id)
--    with no ON DELETE clause (defaults to RESTRICT), unlike every other
--    users(id) FK in 0001_init.sql which uses ON DELETE SET NULL. Deleting
--    any user who ever created a coupon or edited a platform setting would
--    fail with a 23503 foreign-key-violation instead of just nulling the
--    reference.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'coupons' AND constraint_name = 'coupons_created_by_fkey'
  ) THEN
    ALTER TABLE public.coupons DROP CONSTRAINT coupons_created_by_fkey;
  END IF;
  ALTER TABLE public.coupons
    ADD CONSTRAINT coupons_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'platform_settings' AND constraint_name = 'platform_settings_updated_by_fkey'
  ) THEN
    ALTER TABLE public.platform_settings DROP CONSTRAINT platform_settings_updated_by_fkey;
  END IF;
  ALTER TABLE public.platform_settings
    ADD CONSTRAINT platform_settings_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
END $$;

-- =============================================================================
-- 4. event_movies has RLS enabled with only a SELECT policy ("movies_select")
--    — no INSERT/UPDATE/DELETE policy at all, unlike its structurally
--    identical siblings event_collages ("collages_write") and event_stories
--    ("stories_write") added in the same 0028_snapsy_memories.sql. Any write
--    path that isn't using the service-role client (e.g.
--    increment_movie_reaction(), which is SECURITY INVOKER, not DEFINER) is
--    silently rejected by RLS with no matching policy to allow it.
-- =============================================================================
DROP POLICY IF EXISTS "movies_write" ON public.event_movies;
CREATE POLICY "movies_write" ON public.event_movies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_movies.event_id AND e.host_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_movies.event_id AND e.host_id = auth.uid())
);
