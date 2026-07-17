-- Server-side query support for the recap-video feature
-- (src/lib/integrations/recap-video.ts, src/app/api/events/[id]/recap/generate/route.ts).
--
-- Highlight selection for the auto-composed recap needs two photo sets:
--   1. The most-reacted photos (reactions live in photos.metadata->'reactions',
--      an object like {heart: 3, fire: 5} — see 0024_photo_reactions.sql).
--      There is no column to sort on, so the sum has to be computed in SQL.
--   2. A handful of photos evenly spread across the event's timeline, so
--      quiet-but-sweet moments aren't excluded just because they got zero
--      reactions.
-- Both are implemented as SQL functions (not fetched-then-sliced in the
-- route) so a large event (thousands of photos) never has its full photo set
-- pulled into the serverless function just to compute a top-N/sampled-N list.
--
-- A third function precomputes the recap's stats panel (guest/photo/video/
-- voice-note/message counts) as a single round trip, mirroring the
-- client-side computation in src/app/dashboard/events/[slug]/page.tsx
-- (~lines 660-768) which groups photos by mime_type prefix and counts
-- distinct uploader_name values.

-- 1. Top photos by summed reaction count -------------------------------------
CREATE OR REPLACE FUNCTION public.get_top_reacted_photos(p_event_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  storage_path TEXT,
  thumbnail_path TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ,
  reaction_total BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.storage_path,
    p.thumbnail_path,
    p.mime_type,
    p.created_at,
    COALESCE((
      SELECT SUM(value::int) FROM jsonb_each_text(COALESCE(p.metadata->'reactions', '{}'::jsonb))
    ), 0) AS reaction_total
  FROM public.photos p
  WHERE p.event_id = p_event_id
    AND p.is_approved = true
    AND p.mime_type ILIKE 'image/%'
  ORDER BY reaction_total DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Photos evenly time-sampled across the event's timeline -----------------
-- Buckets approved photos into p_sample_count equal-sized time slices (via
-- NTILE) and returns the earliest photo from each bucket, giving an even
-- spread from event start to end without ever loading the whole table into
-- application memory.
CREATE OR REPLACE FUNCTION public.get_timeline_sampled_photos(p_event_id UUID, p_sample_count INT DEFAULT 8)
RETURNS TABLE(
  id UUID,
  storage_path TEXT,
  thumbnail_path TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH ordered AS (
    SELECT
      p.id,
      p.storage_path,
      p.thumbnail_path,
      p.mime_type,
      p.created_at,
      NTILE(GREATEST(p_sample_count, 1)) OVER (ORDER BY p.created_at ASC) AS bucket
    FROM public.photos p
    WHERE p.event_id = p_event_id
      AND p.is_approved = true
      AND p.mime_type ILIKE 'image/%'
  )
  SELECT DISTINCT ON (o.bucket) o.id, o.storage_path, o.thumbnail_path, o.mime_type, o.created_at
  FROM ordered o
  ORDER BY o.bucket, o.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Recap stats panel (guests/photos/videos/voice notes/messages) ----------
CREATE OR REPLACE FUNCTION public.get_event_recap_stats(p_event_id UUID)
RETURNS TABLE(
  guests BIGINT,
  photos BIGINT,
  videos BIGINT,
  voice_notes BIGINT,
  messages BIGINT
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
    (SELECT COUNT(*) FROM public.live_wall_items lw
       WHERE lw.event_id = p_event_id AND lw.message IS NOT NULL) AS messages;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_top_reacted_photos(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_timeline_sampled_photos(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_recap_stats(UUID) TO service_role;
