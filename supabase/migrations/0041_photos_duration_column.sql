-- Adds a nullable `duration` column (seconds) to the `photos` table.
--
-- Follow-up to the media-upload audit in this same session: the guest
-- upload page already computed video/voice-note duration client-side via
-- getMediaDuration() in src/app/event/[slug]/upload/page.tsx, but only to
-- validate against the host's configured video/voice duration limits — the
-- value was then discarded, since the table had nowhere to put it.
--
-- This is purely additive: a new nullable column with no default, on an
-- existing table. Existing rows get NULL (unknown duration, which is
-- correct — they predate this column and their real duration was never
-- captured). No existing column, constraint, or row is touched, and no
-- code path that doesn't explicitly set `duration` is affected — the
-- INSERT in src/app/api/photos/upload/route.ts is the only writer, and it
-- was updated in the same change to pass `null` explicitly for photos and
-- for any video/audio upload where the client didn't supply a value.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS duration numeric;

COMMENT ON COLUMN photos.duration IS 'Video/voice-note length in seconds, computed client-side at upload time. NULL for photos and for uploads where duration could not be determined.';
