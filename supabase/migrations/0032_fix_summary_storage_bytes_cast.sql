-- 0032_fix_summary_storage_bytes_cast.sql
--
-- get_event_summary_stats declares storage_bytes as BIGINT, but
-- `SUM(ph.file_size)` returns NUMERIC on this schema (photos.file_size isn't
-- an integer/bigint column), so Postgres throws 42804 "structure of query
-- does not match function result type" on every call. Explicit ::bigint
-- cast, same pattern already used for total_reactions/total_comments in the
-- same function.

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
    (SELECT COALESCE(SUM(ph.file_size), 0)::bigint FROM public.photos ph WHERE ph.event_id = p_event_id) AS storage_bytes,
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

GRANT EXECUTE ON FUNCTION public.get_event_summary_stats(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
