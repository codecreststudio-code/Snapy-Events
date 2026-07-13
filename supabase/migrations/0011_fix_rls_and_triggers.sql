-- 0011_fix_rls_and_triggers.sql
-- Fixes RLS bugs, dead policies, broken triggers, missing RLS enable, and
-- over-permissive storage policies identified in the database audit.

-- =============================================================================
-- 1. DROP DEAD POLICIES referencing dropped same_org() function
-- =============================================================================
-- These policies from 0002 reference public.same_org(uuid) which was dropped
-- in 0007. Any INSERT/UPDATE on support_tickets or support_ticket_messages
-- via RLS would crash with "function same_org does not exist".
DROP POLICY IF EXISTS "st_write" ON public.support_tickets;
DROP POLICY IF EXISTS "stm_write" ON public.support_ticket_messages;

-- Recreate st_write sans same_org: users can write their own tickets
DROP POLICY IF EXISTS "st_write_fixed" ON public.support_tickets;
CREATE POLICY "st_write_fixed" ON public.support_tickets FOR ALL
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid());

-- Recreate stm_write: users can write to their own ticket threads
DROP POLICY IF EXISTS "stm_write_fixed" ON public.support_ticket_messages;
CREATE POLICY "stm_write_fixed" ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (t.user_id = auth.uid() OR public.is_platform_admin())
    )
  );

-- =============================================================================
-- 2. DROP ORPHANED fsl_insert from 0002 (never recreated in 0007)
-- =============================================================================
-- 0007 recreates fsl_select but never drops fsl_insert from 0002.
-- Both coexist. fsl_insert allows any authenticated user to insert rows.
DROP POLICY IF EXISTS "fsl_insert" ON public.face_search_logs;

-- Recreate with proper user_id check
DROP POLICY IF EXISTS "fsl_insert_fixed" ON public.face_search_logs;
CREATE POLICY "fsl_insert_fixed" ON public.face_search_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 3. FIX blog_posts trigger (references nonexistent function)
-- =============================================================================
-- 0005 line 187 creates trigger calling `update_updated_at_column()` which
-- does not exist. The actual function is `touch_updated_at()` from 0003.
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;

DO $$ BEGIN
  CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 4. ENABLE RLS ON 0008 TABLES (missing ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
-- =============================================================================
-- features, plan_features, addons, automation_rules, addon_purchases were
-- created in 0008 with policies defined but RLS never enabled.
ALTER TABLE IF EXISTS public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.addon_purchases ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RESTRICT admin_notifications INSERT
-- =============================================================================
-- 0006 defines INSERT WITH CHECK (true) for admin_notifications, allowing any
-- authenticated user to insert notifications for any user. Service role should
-- be used instead (it bypasses RLS).
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.admin_notifications;

-- =============================================================================
-- 6. HARDEN STORAGE POLICIES — prevent unauthorized mutations
-- =============================================================================
-- Existing policies only check bucket_id + auth.uid() IS NOT NULL for INSERT.
-- All storage operations in the app use service_role (bypasses RLS), so the
-- primary risk is direct Supabase Storage API access. We add explicit UPDATE
-- and DELETE deny policies, and keep INSERT as basic auth checks since the
-- path format varies (orgId can be "anon", eventId UUID, etc.).

-- Add UPDATE/DELETE deny policies on storage objects (service_role only)
DROP POLICY IF EXISTS "storage_update_deny" ON storage.objects;
CREATE POLICY "storage_update_deny" ON storage.objects FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "storage_delete_deny" ON storage.objects;
CREATE POLICY "storage_delete_deny" ON storage.objects FOR DELETE TO authenticated
  USING (false);

-- =============================================================================
-- 7. ADD COMPOSITE INDEX for gallery photo queries
-- =============================================================================
-- Common query pattern: photos for an event, filtered by approval, sorted by date
CREATE INDEX IF NOT EXISTS idx_photos_event_approved_created
  ON public.photos(event_id, is_approved, created_at DESC);

-- =============================================================================
-- VERIFICATION QUERIES (not executed, for audit reference)
-- =============================================================================
-- Run these manually to verify:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'support_tickets';
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'touch_updated_at');
-- SELECT relname FROM pg_class JOIN pg_namespace ON relnamespace = pg_namespace.oid WHERE nspname = 'public' AND relname IN ('features','plan_features','addons','automation_rules','addon_purchases') AND relrowsecurity = true;
