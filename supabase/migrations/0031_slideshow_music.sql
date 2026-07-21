-- 0031_slideshow_music.sql
--
-- Adds an optional background-music track selector to the existing
-- `slideshows` table. No new audio-hosting infra — tracks are static files
-- shipped in the Next.js app itself (public/audio/slideshow/*.mp3), so this
-- column just stores which catalog track (by slug) the host picked;
-- NULL/omitted means silent, same as today's behavior.

ALTER TABLE public.slideshows
  ADD COLUMN IF NOT EXISTS music_track TEXT;
