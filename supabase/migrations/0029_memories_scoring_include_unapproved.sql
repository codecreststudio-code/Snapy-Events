-- 0029_memories_scoring_include_unapproved.sql
--
-- Same bug as 0027 (which fixed get_top_reacted_photos /
-- get_timeline_sampled_photos), reintroduced by 0028: get_scored_highlight_photos
-- and get_scored_highlight_videos filtered `AND p.is_approved = true`.
-- Approval is a guest-facing moderation concept that most events never touch
-- (no manual approval step in the normal flow), so this filter made Auto
-- Collage and Slideshow return "no photos available" (409) on virtually every
-- event, including fully-populated ones — exactly the failure mode 0027
-- already fixed for Recap Video. Both callers (collage/route.ts,
-- slideshow/route.ts) already verify the caller owns the event before these
-- RPCs are ever invoked, so dropping the filter here is safe for the same
-- reason it was safe in 0027.

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
  WHERE p.event_id = p_event_id AND p.mime_type ILIKE 'video/%'
  ORDER BY score DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_scored_highlight_photos(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_scored_highlight_videos(UUID, INT) TO service_role;
