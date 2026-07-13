-- 0012_fix_storage_usage_trigger.sql
-- Drops the broken storage_usage trigger that references the dropped
-- organization_id column, crashing every photo INSERT/UPDATE/DELETE.
-- The route handler already manages storage_usage explicitly via
-- user_id (see src/app/api/photos/upload/route.ts lines 314-338).

-- =============================================================================
-- 1. DROP the broken trigger on public.photos
-- =============================================================================
-- Created in 0003, this trigger calls update_storage_usage() which queries
-- events.organization_id and inserts into storage_usage(organization_id, ...).
-- Both columns were dropped in 0007_remove_organizations.sql.
DROP TRIGGER IF EXISTS trg_storage_usage ON public.photos;

-- =============================================================================
-- 2. DROP the broken function
-- =============================================================================
DROP FUNCTION IF EXISTS public.update_storage_usage();

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run these manually to verify:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_storage_usage' AND tgrelid = 'public.photos'::regclass;
-- SELECT proname FROM pg_proc WHERE proname = 'update_storage_usage';
