-- 0027_recap_photos_include_unapproved.sql
--
-- get_top_reacted_photos and get_timeline_sampled_photos (0025) both filtered
-- `AND p.is_approved = true`. Approval is a guest-facing moderation concept —
-- it has nothing to do with whether the HOST can generate a recap of their
-- own event. Since most events never go through a manual approval step
-- (there's no moderation UI in the normal flow), this filter meant
-- selectHighlightPhotos() in recap-video.ts returned an empty array for
-- practically every event, which generateRecapVideo() treats as a hard
-- failure ("No approved photos are available yet to generate a recap
-- video") — the exact 500 hosts were seeing on "Generate Recap", even on
-- fully populated, paid events. recap/generate/route.ts already verifies
-- the caller owns the event before either RPC is ever called, so dropping
-- the approval filter here is safe — every photo on this event is fair
-- game for the host's own recap.

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
    AND p.mime_type ILIKE 'image/%'
  ORDER BY reaction_total DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

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
      AND p.mime_type ILIKE 'image/%'
  )
  SELECT DISTINCT ON (o.bucket) o.id, o.storage_path, o.thumbnail_path, o.mime_type, o.created_at
  FROM ordered o
  ORDER BY o.bucket, o.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_top_reacted_photos(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_timeline_sampled_photos(UUID, INT) TO service_role;
