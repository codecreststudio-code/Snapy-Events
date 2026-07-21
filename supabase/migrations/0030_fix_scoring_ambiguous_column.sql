-- 0030_fix_scoring_ambiguous_column.sql
--
-- get_scored_highlight_photos' `bounds` CTE referenced `created_at`
-- unqualified (MIN(created_at)/MAX(created_at)). Since the function's
-- RETURNS TABLE(..., created_at TIMESTAMPTZ, ...) declares a PL/pgSQL
-- variable of that same name, every unqualified reference is ambiguous
-- between the table column and the function's own output variable —
-- Postgres throws 42702 on every call. This has been broken since 0028
-- was first written (CREATE FUNCTION doesn't validate the query body at
-- creation time, only at first execution, which is why it "applied"
-- successfully but failed on every actual invocation). Fully qualifying
-- the CTE's columns with a table alias resolves the ambiguity.

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
    SELECT MIN(ph.created_at) AS min_at, MAX(ph.created_at) AS max_at
    FROM public.photos ph WHERE ph.event_id = p_event_id AND ph.mime_type ILIKE 'image/%'
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

GRANT EXECUTE ON FUNCTION public.get_scored_highlight_photos(UUID, INT) TO service_role;

NOTIFY pgrst, 'reload schema';
