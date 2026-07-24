-- 0045_restrict_join_code_column.sql
--
-- SECURITY FIX: events.join_code was readable in plaintext by ANYONE via a
-- direct Supabase REST call, completely defeating "Require join code to
-- enter" (settings.require_join_code, built in tasks referenced as #178-181
-- in project history).
--
-- Root cause: `events_select` RLS (0002_rls_policies.sql /
-- 0007_remove_organizations.sql) is a ROW-level policy —
--   USING (is_platform_admin() OR host_id = auth.uid()
--          OR (status = 'published' AND is_public))
-- Once a row is visible under the public branch, ALL of its columns
-- (including join_code) are visible too — Postgres RLS has no concept of
-- "this column only for the owner, that column for everyone" within a
-- single row-visibility policy. Since NEXT_PUBLIC_SUPABASE_URL and the anon
-- key are necessarily public (embedded in the client JS bundle), anyone —
-- no login required — could call
--   GET {SUPABASE_URL}/rest/v1/events?slug=eq.<slug>&select=join_code
-- and read the code directly, bypassing every application-layer check
-- (logGuestAccess, GuestCaptureModal, /api/events/join) entirely.
--
-- Fix: revoke column-level SELECT on join_code from the anon and
-- authenticated roles (service_role, used server-side only, is untouched),
-- and add two SECURITY DEFINER RPCs — mirroring the existing
-- regenerate_event_join_code() pattern from 0023_event_join_code.sql — for
-- the two legitimate places code still needs to reach this value:
--   1. get_event_join_code(event_id)      — host reading their own event's
--      code on the dashboard; re-checks host_id = auth.uid() itself.
--   2. verify_event_join_code(event_id, code) — guest check-in comparing a
--      submitted code; returns only a boolean, the code itself is never
--      sent back over the wire to the Next.js server for this check.
-- Application call sites updated in the same change:
--   src/app/dashboard/events/[slug]/page.tsx (getEvent — explicit column
--     list instead of select("*"), + get_event_join_code RPC)
--   src/app/actions/guest.ts (logGuestAccess — verify_event_join_code RPC
--     instead of a direct column read + JS comparison)
-- /api/events/join/route.ts is unaffected — it already used
-- createServiceClient(), which is unaffected by this revoke.

REVOKE SELECT (join_code) ON public.events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_event_join_code(p_event_id UUID)
RETURNS TEXT AS $$
DECLARE
  owner_id UUID;
  code TEXT;
BEGIN
  SELECT host_id, join_code INTO owner_id, code FROM public.events WHERE id = p_event_id;
  IF owner_id IS NULL OR owner_id <> auth.uid() THEN
    RETURN NULL;
  END IF;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_event_join_code(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_event_join_code(p_event_id UUID, p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored TEXT;
BEGIN
  SELECT join_code INTO stored FROM public.events WHERE id = p_event_id;
  IF stored IS NULL OR p_code IS NULL THEN
    RETURN false;
  END IF;
  RETURN upper(trim(stored)) = upper(trim(p_code));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Callable by anon too — guests checking in are typically NOT authenticated
-- Supabase users (they just hold the HMAC guest-session cookie granted
-- after check-in), so this must be reachable pre-auth, same as the
-- pre-existing /api/events/join public endpoint.
GRANT EXECUTE ON FUNCTION public.verify_event_join_code(UUID, TEXT) TO anon, authenticated;
