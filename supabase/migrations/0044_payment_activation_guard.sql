-- 0044_payment_activation_guard.sql
--
-- Database-level backstop for the event payment-bypass fix. The application
-- layer (see /api/events POST, /api/payments/verify, /api/payments/
-- checkout-free, the Razorpay webhook, the dashboard/[slug] page gate, the
-- public event/[slug] page gate, and logGuestAccess in actions/guest.ts) now
-- creates a paid-plan event as `status = 'draft'` with
-- `settings.payment_status = 'pending_payment'`, and only flips it to
-- `published` / `payment_status: 'paid'|'free'` from a Supabase
-- service-role client, once a Razorpay payment has actually been verified
-- (or the plan genuinely prices at ₹0).
--
-- That application-layer fix closes the reported bug (closing the payment
-- tab / hitting Back left a fully live, fully functional event). But
-- `events_update` RLS (0002_rls_policies.sql) is `FOR UPDATE USING (host_id
-- = auth.uid())` with no column restriction — by design, since hosts need
-- to freely edit their own event's name/cover/settings/etc. That same
-- permissiveness means a host who calls the Supabase REST API directly
-- with their own session (bypassing this app's UI and API routes entirely
-- — trivial for anyone who opens devtools, since the Supabase URL and anon
-- key are public in the client bundle) could otherwise set
-- `status: 'published'` and `settings.payment_status: 'paid'` on their own
-- draft event with a single direct write, with no payment ever occurring.
--
-- This trigger closes that specific gap: only a service-role request (i.e.
-- this app's own server-side payment-confirmation code, never a
-- browser-held user session) may move an event out of a pending-payment
-- draft, or mark it as paid/free. Everything else hosts legitimately do —
-- editing name, cover, dates, settings, archiving/restoring an already-live
-- event — is untouched, because the guard only engages while
-- settings.payment_status is still "pending_payment".

CREATE OR REPLACE FUNCTION public.guard_event_payment_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service boolean;
  old_payment_status text;
  new_payment_status text;
BEGIN
  is_service := (auth.role() IS NOT DISTINCT FROM 'service_role');
  IF is_service THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Never allow a direct client-side write to claim "already paid" at
    -- creation time. Free-tier creation (status='published',
    -- payment_status='free') still works exactly as before — only the
    -- "paid" claim is blocked, since that should only ever be written by a
    -- verified Razorpay confirmation.
    new_payment_status := NEW.settings ->> 'payment_status';
    IF new_payment_status = 'paid' THEN
      NEW.settings := jsonb_set(COALESCE(NEW.settings, '{}'::jsonb), '{payment_status}', to_jsonb('pending_payment'::text));
      NEW.status := 'draft';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: block the specific pending_payment -> published/paid|free
  -- transition from any non-service-role caller. Anything else (a host
  -- editing their own already-active event, changing unrelated fields on a
  -- still-pending draft, etc.) is left completely alone.
  old_payment_status := OLD.settings ->> 'payment_status';
  new_payment_status := NEW.settings ->> 'payment_status';

  IF old_payment_status = 'pending_payment' THEN
    IF OLD.status = 'draft' AND NEW.status <> 'draft' THEN
      NEW.status := OLD.status;
    END IF;
    IF new_payment_status IN ('paid', 'free') THEN
      NEW.settings := jsonb_set(COALESCE(NEW.settings, '{}'::jsonb), '{payment_status}', to_jsonb(old_payment_status));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_event_payment_activation_ins ON public.events;
CREATE TRIGGER trg_guard_event_payment_activation_ins
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_payment_activation();

DROP TRIGGER IF EXISTS trg_guard_event_payment_activation_upd ON public.events;
CREATE TRIGGER trg_guard_event_payment_activation_upd
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_payment_activation();
