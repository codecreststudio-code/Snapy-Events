-- 0028_snapsy_memories.sql
--
-- Backend for the "Snapsy Memories" feature set — pure Next.js + Supabase,
-- no ffmpeg/AI services added. Adds two new tables (event_stories,
-- event_collages) and three SQL functions (guest awards, event summary
-- stats, weighted highlight scoring). Reuses the existing `slideshows`
-- table (already has photo_ids/transition/interval_seconds/show_brand —
-- see 0001_init.sql) rather than creating a new one, and reuses the
-- existing Recap Video pipeline (fluent-ffmpeg, already working after the
-- memory-safety fix in face.ts's sibling code path) as the "Highlight
-- Movie" feature rather than duplicating it, per the decision to prioritize
-- cross-device render quality over a browser-only MediaRecorder approach.
--
-- Idempotent: safe to re-run (IF NOT EXISTS / CREATE OR REPLACE / DROP
-- POLICY IF EXISTS throughout), matching every prior migration in this repo.

-- =============================================================================
-- Memory Stories — "X years ago" anniversary reminders (0028: table)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.event_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  milestone_days INTEGER NOT NULL,
  title TEXT NOT NULL,
  cover_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One story per milestone per event — the daily cron is safe to re-run
  -- without ever double-creating the same anniversary.
  UNIQUE(event_id, milestone_days)
);

CREATE INDEX IF NOT EXISTS idx_event_stories_event ON public.event_stories(event_id, created_at DESC);

ALTER TABLE public.event_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_select" ON public.event_stories;
CREATE POLICY "stories_select" ON public.event_stories FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_stories.event_id
    AND (public.is_platform_admin() OR e.host_id = auth.uid() OR e.status = 'published'))
);

DROP POLICY IF EXISTS "stories_write" ON public.event_stories;
CREATE POLICY "stories_write" ON public.event_stories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_stories.event_id AND e.host_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_stories.event_id AND e.host_id = auth.uid())
);

-- =============================================================================
-- Auto Collages — Canvas/sharp-composited photo grids
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.event_collages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  layout TEXT NOT NULL, -- grid-2, grid-4, grid-9, polaroid
  photo_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  storage_path TEXT NOT NULL,
  image_url TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_collages_event ON public.event_collages(event_id, created_at DESC);

ALTER TABLE public.event_collages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collages_select" ON public.event_collages;
CREATE POLICY "collages_select" ON public.event_collages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_collages.event_id
    AND (public.is_platform_admin() OR e.host_id = auth.uid() OR e.status = 'published'))
);

DROP POLICY IF EXISTS "collages_write" ON public.event_collages;
CREATE POLICY "collages_write" ON public.event_collages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_collages.event_id AND e.host_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_collages.event_id AND e.host_id = auth.uid())
);

-- =============================================================================
-- Guest Awards — pure SQL aggregation, no AI
-- =============================================================================
-- night_owl_uploads is an approximate signal (UTC hour buckets — this repo's
-- photos table has no per-upload timezone, only the event's own `timezone`
-- column, and joining/converting per-row for a purely-for-fun award isn't
-- worth the added query cost). Good enough for "who uploads at 2am", not
-- meant to be a precise stat.
CREATE OR REPLACE FUNCTION public.get_guest_awards(p_event_id UUID)
RETURNS TABLE(
  guest_name TEXT,
  photo_count BIGINT,
  video_count BIGINT,
  voice_note_count BIGINT,
  reaction_total BIGINT,
  night_owl_uploads BIGINT,
  first_upload_at TIMESTAMPTZ,
  last_upload_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.uploader_name, 'Anonymous Guest') AS guest_name,
    COUNT(*) FILTER (WHERE p.mime_type IS NULL OR (p.mime_type NOT ILIKE 'video/%' AND p.mime_type NOT ILIKE 'audio/%')) AS photo_count,
    COUNT(*) FILTER (WHERE p.mime_type ILIKE 'video/%') AS video_count,
    COUNT(*) FILTER (WHERE p.mime_type ILIKE 'audio/%') AS voice_note_count,
    COALESCE(SUM((
      SELECT SUM(value::int) FROM jsonb_each_text(COALESCE(p.metadata->'reactions', '{}'::jsonb))
    )), 0) AS reaction_total,
    COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM p.created_at) IN (23, 0, 1, 2, 3, 4)) AS night_owl_uploads,
    MIN(p.created_at) AS first_upload_at,
    MAX(p.created_at) AS last_upload_at
  FROM public.photos p
  WHERE p.event_id = p_event_id
  GROUP BY COALESCE(p.uploader_name, 'Anonymous Guest')
  ORDER BY (COUNT(*)) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Event Summary — one aggregated call for the dashboard + PDF export
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_event_summary_stats(p_event_id UUID)
RETURNS TABLE(
  guests BIGINT,
  photos BIGINT,
  videos BIGINT,
  voice_notes BIGINT,
  total_reactions BIGINT,
  total_comments BIGINT,
  storage_bytes BIGINT,
  most_active_uploader TEXT,
  peak_upload_hour INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT COALESCE(ph.uploader_name, 'Anonymous Guest'))
       FROM public.photos ph WHERE ph.event_id = p_event_id) AS guests,
    (SELECT COUNT(*) FROM public.photos ph
       WHERE ph.event_id = p_event_id
         AND (ph.mime_type IS NULL OR (ph.mime_type NOT ILIKE 'video/%' AND ph.mime_type NOT ILIKE 'audio/%'))) AS photos,
    (SELECT COUNT(*) FROM public.photos ph
       WHERE ph.event_id = p_event_id AND ph.mime_type ILIKE 'video/%') AS videos,
    (SELECT COUNT(*) FROM public.photos ph
       WHERE ph.event_id = p_event_id AND ph.mime_type ILIKE 'audio/%') AS voice_notes,
    (SELECT COALESCE(SUM(react_sum), 0)::bigint FROM (
       SELECT (SELECT SUM(value::int) FROM jsonb_each_text(COALESCE(ph.metadata->'reactions', '{}'::jsonb))) AS react_sum
       FROM public.photos ph WHERE ph.event_id = p_event_id
     ) r) AS total_reactions,
    (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(ph.metadata->'comments', '[]'::jsonb))), 0)::bigint
       FROM public.photos ph WHERE ph.event_id = p_event_id) AS total_comments,
    (SELECT COALESCE(SUM(ph.file_size), 0) FROM public.photos ph WHERE ph.event_id = p_event_id) AS storage_bytes,
    (SELECT COALESCE(ph.uploader_name, 'Anonymous Guest') FROM public.photos ph
       WHERE ph.event_id = p_event_id
       GROUP BY COALESCE(ph.uploader_name, 'Anonymous Guest')
       ORDER BY COUNT(*) DESC LIMIT 1) AS most_active_uploader,
    (SELECT EXTRACT(HOUR FROM ph.created_at)::int FROM public.photos ph
       WHERE ph.event_id = p_event_id
       GROUP BY EXTRACT(HOUR FROM ph.created_at)
       ORDER BY COUNT(*) DESC LIMIT 1) AS peak_upload_hour;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Weighted highlight scoring — used by Auto Collage, Slideshow, and (merged
-- additively alongside the existing get_top_reacted_photos/
-- get_timeline_sampled_photos in recap-video.ts) the Highlight Movie.
-- score = reactions*5 + comments*4 + host_favorite(is_featured)*10 + recency*1
-- (recency normalized 0-1 across the event's own timeline).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_scored_highlight_photos(p_event_id UUID, p_limit INT DEFAULT 30)
RETURNS TABLE(
  id UUID,
  storage_path TEXT,
  thumbnail_path TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ,
  score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH bounds AS (
    SELECT MIN(created_at) AS min_at, MAX(created_at) AS max_at
    FROM public.photos WHERE event_id = p_event_id AND mime_type ILIKE 'image/%'
  )
  SELECT
    p.id,
    p.storage_path,
    p.thumbnail_path,
    p.mime_type,
    p.created_at,
    (
      COALESCE((SELECT SUM(value::int) FROM jsonb_each_text(COALESCE(p.metadata->'reactions', '{}'::jsonb))), 0) * 5
      + COALESCE(jsonb_array_length(COALESCE(p.metadata->'comments', '[]'::jsonb)), 0) * 4
      + CASE WHEN p.is_featured THEN 10 ELSE 0 END
      + (
          CASE WHEN b.max_at > b.min_at
            THEN EXTRACT(EPOCH FROM (p.created_at - b.min_at)) / NULLIF(EXTRACT(EPOCH FROM (b.max_at - b.min_at)), 0)
            ELSE 0.5
          END
        ) * 1
    )::numeric AS score
  FROM public.photos p, bounds b
  WHERE p.event_id = p_event_id
    AND p.mime_type ILIKE 'image/%'
    AND p.is_approved = true
  ORDER BY score DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_scored_highlight_videos(p_event_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE(
  id UUID,
  storage_path TEXT,
  thumbnail_path TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ,
  score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.storage_path,
    p.thumbnail_path,
    p.mime_type,
    p.created_at,
    (
      COALESCE((SELECT SUM(value::int) FROM jsonb_each_text(COALESCE(p.metadata->'reactions', '{}'::jsonb))), 0) * 5
      + COALESCE(jsonb_array_length(COALESCE(p.metadata->'comments', '[]'::jsonb)), 0) * 4
      + CASE WHEN p.is_featured THEN 10 ELSE 0 END
    )::numeric AS score
  FROM public.photos p
  WHERE p.event_id = p_event_id AND p.mime_type ILIKE 'video/%' AND p.is_approved = true
  ORDER BY score DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_guest_awards(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_summary_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_scored_highlight_photos(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_scored_highlight_videos(UUID, INT) TO service_role;
