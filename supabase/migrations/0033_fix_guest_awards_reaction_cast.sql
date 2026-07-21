-- 0033_fix_guest_awards_reaction_cast.sql
--
-- Same class of bug as 0032: get_guest_awards declares reaction_total as
-- BIGINT, but `SUM(value::int)` from jsonb_each_text is itself bigint, and
-- Postgres's SUM() over a bigint input returns NUMERIC (widened to avoid
-- overflow) rather than BIGINT — so the RETURN QUERY's inferred row type
-- never matched the declared RETURNS TABLE, throwing 42804 on every call.
-- Explicit ::bigint cast, same fix pattern as 0032.

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
    )), 0)::bigint AS reaction_total,
    COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM p.created_at) IN (23, 0, 1, 2, 3, 4)) AS night_owl_uploads,
    MIN(p.created_at) AS first_upload_at,
    MAX(p.created_at) AS last_upload_at
  FROM public.photos p
  WHERE p.event_id = p_event_id
  GROUP BY COALESCE(p.uploader_name, 'Anonymous Guest')
  ORDER BY (COUNT(*)) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_guest_awards(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
