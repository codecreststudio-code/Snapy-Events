-- 0036_event_movies.sql
--
-- "Movie" — a real, downloadable/shareable 9:16 video generated entirely in
-- the host's browser (canvas Ken Burns/crossfade + MediaRecorder, mixed with
-- a chosen background music track — see src/lib/movie/movie-renderer.ts) and
-- uploaded pre-rendered. Deliberately NOT server-side ffmpeg: this codebase
-- already tried that once (the old "Recap Video" feature, removed — see
-- src/lib/integrations/recap-video.ts's removal note) and it never rendered
-- reliably on Vercel serverless (native ffmpeg binary + font rendering
-- issues, no queue/worker infra to escape the request's own timeout budget).
-- Rendering client-side sidesteps all of that — the server here only ever
-- stores a file the browser already finished encoding, exactly like
-- event_collages already does for composited images.
--
-- Table shape deliberately mirrors event_collages (0028_snapsy_memories.sql)
-- for consistency: same metadata->reactions pattern, same RLS policy shape.

CREATE TABLE IF NOT EXISTS public.event_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  video_url TEXT,
  mime_type TEXT NOT NULL DEFAULT 'video/webm',
  duration_seconds INTEGER,
  music_track TEXT,
  width INTEGER,
  height INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_movies_event ON public.event_movies(event_id, created_at DESC);

ALTER TABLE public.event_movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movies_select" ON public.event_movies;
CREATE POLICY "movies_select" ON public.event_movies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_movies.event_id
    AND (public.is_platform_admin() OR e.host_id = auth.uid() OR e.status = 'published'))
);

CREATE OR REPLACE FUNCTION public.increment_movie_reaction(p_movie_id UUID, p_emoji TEXT)
RETURNS JSONB AS $$
DECLARE
  updated JSONB;
BEGIN
  UPDATE public.event_movies
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    ARRAY['reactions'],
    COALESCE(metadata->'reactions', '{}'::jsonb) ||
      jsonb_build_object(p_emoji, COALESCE((metadata->'reactions'->>p_emoji)::int, 0) + 1)
  )
  WHERE id = p_movie_id
  RETURNING metadata->'reactions' INTO updated;

  RETURN COALESCE(updated, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.increment_movie_reaction(UUID, TEXT) TO service_role;
