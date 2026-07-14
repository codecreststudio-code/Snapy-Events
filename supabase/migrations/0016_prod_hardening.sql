-- 0016_prod_hardening.sql
-- Production hardening: strip wildcard permissions from non-admin users,
-- add hot-path indexes lost when 0007 dropped organization_id columns,
-- add explicit unique guards already implied by init constraints.
-- Every statement is idempotent (IF NOT EXISTS / DO...EXCEPTION / WHERE guard).

-- =============================================================================
-- 1. STRIP WILDCARD PERMISSIONS FROM NON-ADMIN USERS
-- =============================================================================
-- users.permissions is JSONB (array). A '*' element grants all permissions.
-- Non-admin users must never hold it. We strip only the '*' element and
-- preserve any other permission values.
-- DO NOT touch rows where is_admin = true.
UPDATE public.users
SET permissions = COALESCE(
  (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(permissions) AS elem
    WHERE elem::text <> '"*"'
  ),
  '[]'::jsonb
)
WHERE is_admin = false
  AND permissions @> '["*"]'::jsonb;

-- =============================================================================
-- 2. UNIQUE PARTIAL INDEX ON transactions(razorpay_payment_id)
-- =============================================================================
-- The column already has a UNIQUE constraint from 0001_init (inline UNIQUE),
-- but an explicit named partial index is the idempotency-safe form and lets
-- the verify route do .eq("razorpay_payment_id",...) for idempotency safely
-- even when razorpay_payment_id is NULL on failed/pending rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_razorpay_payment_uniq
  ON public.transactions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- =============================================================================
-- 3. HOT-PATH USER_ID INDEXES MISSING AFTER 0007 DROPPED ORGANIZATION_ID
-- =============================================================================
-- 0007 dropped organization_id from all these tables, implicitly dropping the
-- org-based indexes. user_id was added in 0007 but never indexed. Every
-- RLS policy for these tables filters on user_id = auth.uid(), causing full
-- sequential scans without these indexes.

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user
  ON public.invoices(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user
  ON public.transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_watermarks_user
  ON public.watermarks(user_id);

CREATE INDEX IF NOT EXISTS idx_custom_domains_user
  ON public.custom_domains(user_id);

CREATE INDEX IF NOT EXISTS idx_download_bundles_user
  ON public.download_bundles(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user
  ON public.ai_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user
  ON public.notification_queue(user_id);

-- =============================================================================
-- 4. UNIQUE CONSTRAINT ON webhook_events(source, external_id) — IDEMPOTENT
-- =============================================================================
-- 0001_init.sql already creates this as uniq_webhook_external. This is a
-- no-op guard for databases initialised via schema.sql instead of migrations.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_webhook_external
  ON public.webhook_events(source, external_id)
  WHERE external_id IS NOT NULL;

-- =============================================================================
-- 5. FK CONSTRAINT: faces.cluster_id → face_clusters(id)
-- =============================================================================
-- faces.cluster_id has an index but no FK constraint, allowing orphaned UUIDs.
DO $$ BEGIN
  ALTER TABLE public.faces
    ADD CONSTRAINT fk_faces_cluster_id
    FOREIGN KEY (cluster_id) REFERENCES public.face_clusters(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- VERIFICATION QUERIES (run manually)
-- =============================================================================
-- SELECT count(*) FROM public.users WHERE is_admin = false AND permissions @> '["*"]'::jsonb;
-- SELECT indexname FROM pg_indexes WHERE tablename = 'subscriptions' AND indexname = 'idx_subscriptions_user';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'transactions' AND indexname = 'idx_transactions_razorpay_payment_uniq';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'webhook_events' AND indexname = 'uniq_webhook_external';
-- SELECT conname FROM pg_constraint WHERE conname = 'fk_faces_cluster_id';
