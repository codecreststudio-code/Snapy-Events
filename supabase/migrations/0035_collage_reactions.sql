-- 0035_collage_reactions.sql
--
-- Adds emoji reactions to generated Auto Collage images, mirroring the
-- existing photo reaction pattern (0024_photo_reactions.sql's
-- increment_photo_reaction atomic RPC) so the new in-app collage viewer
-- (MemoryViewer, host dashboard) can let the host react to their own
-- generated collages the same way guests react to individual photos.
--
-- Collages are host-only/private (event_collages has no guest-facing write
-- path), so the concurrency story here is much lower-risk than the public
-- photo-reaction endpoint — but the atomic RPC is used anyway for
-- consistency with the rest of the codebase's reaction-handling pattern and
-- because it costs nothing extra to write correctly.

ALTER TABLE public.event_collages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.increment_collage_reaction(p_collage_id UUID, p_emoji TEXT)
RETURNS JSONB AS $$
DECLARE
  updated JSONB;
BEGIN
  UPDATE public.event_collages
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    ARRAY['reactions'],
    COALESCE(metadata->'reactions', '{}'::jsonb) ||
      jsonb_build_object(p_emoji, COALESCE((metadata->'reactions'->>p_emoji)::int, 0) + 1)
  )
  WHERE id = p_collage_id
  RETURNING metadata->'reactions' INTO updated;

  RETURN COALESCE(updated, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.increment_collage_reaction(UUID, TEXT) TO service_role;
