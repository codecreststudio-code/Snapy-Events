-- 0018_audit_logs_user_fk.sql
-- audit_logs.user_id has always been a bare UUID column with no foreign key
-- to public.users. The admin Audit Logs page (src/app/admin/audit-logs/page.tsx)
-- queries `user:users(email)` — a PostgREST embed that requires an actual FK
-- relationship to exist in the schema. Without one, PostgREST returns
-- "Could not find a relationship between 'audit_logs' and 'users'" and the
-- page silently fails to load any logs.
--
-- Added as NOT VALID so this doesn't fail the migration if any legacy rows
-- reference a user_id that no longer exists in public.users (e.g. a deleted
-- account) — new rows are still checked, and PostgREST can embed regardless
-- of validation status. Run `VALIDATE CONSTRAINT` later once data is clean
-- if you want the historical rows checked too.

-- Guarded with an existence check (Postgres has no `ADD CONSTRAINT IF NOT
-- EXISTS`) so this migration is safe to re-run against an environment where
-- it already applied — e.g. Supabase's preview-branch CI check, which failed
-- with "constraint already exists" (SQLSTATE 42710) the first time this ran
-- unconditionally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
