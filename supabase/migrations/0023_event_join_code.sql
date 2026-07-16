-- Short, memorable per-event code guests can type in to join instead of
-- scanning a QR or pasting a long slug URL (e.g. "K7XQ9M"). Distinct from
-- qr_codes.code, which is a per-QR-object concept a host can create many
-- of (table tents, posters, etc.) — this is the one canonical code for the
-- event itself, surfaced on the dashboard next to the QR and usable from a
-- "Have a code? Join an event" box on the public site.

ALTER TABLE events ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Partial unique index (not a plain UNIQUE constraint) so this migration
-- can run before every existing row has a code backfilled below.
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_join_code ON events(join_code) WHERE join_code IS NOT NULL;

-- Random 6-character code from an unambiguous charset — no 0/O/1/I — so it
-- reads cleanly off a printed invitation card or said out loud at a venue.
CREATE OR REPLACE FUNCTION public.generate_join_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Auto-assigns a unique join_code to every new event, retrying on the rare
-- collision. Runs regardless of which code path inserts the row (the event
-- wizard's direct client-side insert today, or any server route later) so
-- nothing has to remember to set it explicitly.
CREATE OR REPLACE FUNCTION public.set_event_join_code() RETURNS TRIGGER AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.join_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    candidate := public.generate_join_code();
    attempts := attempts + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.events WHERE join_code = candidate);
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate a unique join code after % attempts', attempts;
    END IF;
  END LOOP;

  NEW.join_code := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_event_join_code ON events;
CREATE TRIGGER trg_set_event_join_code
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_join_code();

-- Backfill every event created before this migration.
DO $$
DECLARE
  r RECORD;
  candidate TEXT;
BEGIN
  FOR r IN SELECT id FROM events WHERE join_code IS NULL LOOP
    LOOP
      candidate := public.generate_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM events WHERE join_code = candidate);
    END LOOP;
    UPDATE events SET join_code = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE events ALTER COLUMN join_code SET NOT NULL;

-- Lets a host regenerate their event's code (e.g. if it leaked, or they
-- want to cut off further joins from anyone who has the old one).
-- SECURITY DEFINER so the global uniqueness check can see every event
-- regardless of RLS visibility — but it manually re-checks host ownership
-- before writing anything, re-implementing (not bypassing) the
-- events_update RLS policy's rule inside the function body.
CREATE OR REPLACE FUNCTION public.regenerate_event_join_code(p_event_id UUID)
RETURNS TEXT AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
  owner_id UUID;
BEGIN
  SELECT host_id INTO owner_id FROM public.events WHERE id = p_event_id;
  IF owner_id IS NULL OR owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to regenerate this event''s join code';
  END IF;

  LOOP
    candidate := public.generate_join_code();
    attempts := attempts + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.events WHERE join_code = candidate);
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate a unique join code after % attempts', attempts;
    END IF;
  END LOOP;

  UPDATE public.events SET join_code = candidate WHERE id = p_event_id;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.regenerate_event_join_code(UUID) TO authenticated;
