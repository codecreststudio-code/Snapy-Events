-- 0037_ai_quality_signals.sql
--
-- Backs the "AI organize your memories" toggles in the event-creation wizard
-- (Step 8) that were previously cosmetic — they saved a boolean to
-- events.settings.ai_features but nothing ever read it back. This migration
-- adds the columns needed to make Smart Duplicate Detection and Best Shot
-- Selection real, computed server-side (in src/lib/integrations/image-quality.ts)
-- from the actual uploaded image bytes rather than any external ML service.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS phash TEXT,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.photos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blur_score REAL,
  ADD COLUMN IF NOT EXISTS brightness_score REAL,
  ADD COLUMN IF NOT EXISTS smile_score REAL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Used to find near-duplicate candidates within a gallery quickly (we still
-- compute the actual Hamming distance in application code — Postgres has no
-- bit-distance operator over a plain TEXT hex column — but this at least lets
-- us cheaply pull "recent photos in this gallery that already have a hash"
-- instead of scanning the whole table).
CREATE INDEX IF NOT EXISTS idx_photos_gallery_phash ON public.photos(gallery_id) WHERE phash IS NOT NULL;

-- Powers the guest gallery grid filtering out is_duplicate=true photos by
-- default when an event has Smart Duplicate Detection enabled.
CREATE INDEX IF NOT EXISTS idx_photos_gallery_duplicate ON public.photos(gallery_id, is_duplicate);

-- Powers tag-chip filtering in the gallery for Auto Categorization.
CREATE INDEX IF NOT EXISTS idx_photos_tags ON public.photos USING GIN(tags);
