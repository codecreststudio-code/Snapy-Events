-- Combined pending migrations: 0025_recap_video_highlights.sql + 0026_fix_face_clusters_representative_fk.sql
--
-- Paste this whole file into the Supabase Dashboard -> SQL Editor and run it once.
-- Safe to run more than once if you're not sure whether it already applied:
--   - the three functions below use CREATE OR REPLACE (no error if they already exist)
--   - the constraint fix uses DROP CONSTRAINT IF EXISTS before re-adding it
--
-- 0001-0024 are NOT included here — those were already applied when the app's
-- existing features (events, uploads, reactions) started working, so
-- re-running them isn't necessary. This file only contains what was added
-- most recently and may not have been pushed to the live database yet.

-- ============================================================
-- 0025_recap_video_highlights.sql
-- ============================================================

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

-- ============================================================
-- 0026_fix_face_clusters_representative_fk.sql
-- ============================================================

ALTER TABLE public.face_clusters
  DROP CONSTRAINT IF EXISTS face_clusters_representative_face_id_fkey;

ALTER TABLE public.face_clusters
  ADD CONSTRAINT face_clusters_representative_face_id_fkey
  FOREIGN KEY (representative_face_id) REFERENCES public.faces(id) ON DELETE SET NULL;

-- Done. If this ran without errors, the recap-video RPCs and the
-- face-clustering foreign key are now live on this database.
