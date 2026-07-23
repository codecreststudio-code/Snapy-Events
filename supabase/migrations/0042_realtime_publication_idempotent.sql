-- Guards the `notifications` realtime-publication registration added in
-- 0039_notification_infrastructure.sql.
--
-- That migration is otherwise fully idempotent (CREATE TABLE IF NOT EXISTS,
-- DROP POLICY IF EXISTS before every CREATE POLICY) except for its very
-- last statement:
--
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
--
-- Postgres has no "ADD TABLE IF NOT EXISTS" form for ALTER PUBLICATION, so
-- if that statement (or the whole migration file) ever runs a second time
-- against a database where it already succeeded once, it throws
-- "relation notifications is already member of publication
-- supabase_realtime" (42710) — which is exactly the error flooding the
-- production logs. This migration is a no-op if the table is already
-- published, and adds it if (for some reason, e.g. a database restored
-- from a snapshot predating this) it isn't — safe to run any number of
-- times, on any environment.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
