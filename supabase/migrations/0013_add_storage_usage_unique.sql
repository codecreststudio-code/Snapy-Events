-- 0013_add_storage_usage_unique.sql
-- Adds UNIQUE(user_id) to storage_usage to fix UPSERT race condition,
-- and drops the stale organization_id index.

-- =============================================================================
-- 1. Clean up stale index referencing dropped column
-- =============================================================================
DROP INDEX IF EXISTS idx_audit_org_action;

-- =============================================================================
-- 2. Add UNIQUE constraint on user_id for safe upsert
-- =============================================================================
-- First clean up any duplicates (keep the most recent row per user_id)
DELETE FROM public.storage_usage a
USING (
  SELECT user_id, max(updated_at) as max_updated
  FROM public.storage_usage
  GROUP BY user_id
) b
WHERE a.user_id = b.user_id
  AND a.updated_at < b.max_updated;

-- Add unique constraint
ALTER TABLE public.storage_usage
  DROP CONSTRAINT IF EXISTS storage_usage_user_id_key,
  ADD CONSTRAINT storage_usage_user_id_key UNIQUE (user_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT conname FROM pg_constraint WHERE conname = 'storage_usage_user_id_key';
