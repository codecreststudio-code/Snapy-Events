-- 0034_lock_down_email_rls.sql
--
-- Security audit finding: email_templates and email_logs both had overly
-- permissive RLS policies from 0010_email_system.sql —
--   email_templates_select ... USING (true)   -- any anon/authenticated caller
--                                               -- could read every template's
--                                               -- raw HTML via the public
--                                               -- anon key + PostgREST.
--   email_logs_insert      ... WITH CHECK (true) -- any anon/authenticated
--                                               -- caller could insert
--                                               -- arbitrary fake log rows.
--
-- Neither is needed: every code path that reads email_templates or writes
-- email_logs goes through adminDb()/createServiceClient() (service-role,
-- bypasses RLS entirely) — see src/lib/integrations/resend.ts,
-- src/app/api/admin/emails/route.ts, src/app/api/emails/webhook/route.ts.
-- email_templates already has a separate admin-only "FOR ALL" policy
-- (email_templates_all, gated on public.is_platform_admin()) that already
-- covers legitimate SELECT access for the admin panel, so dropping the
-- public SELECT policy removes zero functionality. email_logs already has
-- an admin-only SELECT policy (email_logs_select) and simply has no INSERT
-- policy after this — INSERT is only ever done via service-role, which
-- bypasses RLS regardless of policy, so this is also a pure tightening
-- with no functional impact.

DROP POLICY IF EXISTS "email_templates_select" ON public.email_templates;
DROP POLICY IF EXISTS "email_logs_insert" ON public.email_logs;
