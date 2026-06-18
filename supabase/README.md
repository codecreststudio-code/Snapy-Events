# Snapsy Database Setup

This directory contains the production-grade PostgreSQL schema for the
Snapsy SaaS platform. Run in order via the Supabase SQL editor, the
`supabase` CLI, or any Postgres migration tool.

## Files

| File | Purpose |
|------|---------|
| `migrations/0001_init.sql` | All tables, enums, indexes |
| `migrations/0002_rls_policies.sql` | Row-level security on every table |
| `migrations/0003_functions.sql` | Triggers, helper functions, storage buckets |
| `migrations/0004_seed_plans.sql` | Default plan rows |

## Apply via Supabase CLI

```bash
supabase db reset        # wipes and re-runs all migrations
supabase db push         # applies new migrations to a linked project
```

## Apply via psql

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0002_rls_policies.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0003_functions.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0004_seed_plans.sql
```

## Multi-tenant model

Every business record carries `organization_id`. RLS policies restrict
each authenticated user to the rows owned by their organization. Platform
admins (rows with `is_admin = true` in `public.users`) bypass RLS for
support and moderation tasks.

## Storage buckets

Seven buckets are created in `0003_functions.sql`:

| Bucket | Public | Use |
|--------|--------|-----|
| `event-covers` | yes | event cover images |
| `gallery-covers` | yes | gallery cover images |
| `photos` | no | private event photos (signed URLs only) |
| `photos-public` | yes | public gallery photos |
| `faces` | no | face embeddings (binary) |
| `avatars` | yes | user avatars |
| `qr-codes` | yes | generated QR code images |

## Helper SQL functions

- `current_user_id()`, `current_user_role()`, `current_org_id()`,
  `is_platform_admin()`, `same_org(uuid)` — RLS helpers
- `increment_event_view(uuid)` — view counter
- `increment_qr_scan(...)` — scan counter + log
- `bump_gallery_count()` — photo count rollup trigger
- `update_storage_usage()` — storage usage rollup trigger
- `touch_updated_at()` — generic `updated_at` trigger function
- `handle_new_user()` — auto-create profile row on `auth.users` insert
