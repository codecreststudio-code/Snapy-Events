-- Atomic helpers for guest engagement (emoji reactions + text/voice-note
-- comments) stored in photos.metadata JSONB, called via the service-role
-- client from POST /api/photos/[id]/react. A plain read-merge-write from the
-- API route would race under concurrent guests reacting to the same photo
-- at once (last write wins, silently dropping another guest's reaction or
-- comment) — these functions do the read+merge+write as a single atomic
-- UPDATE statement instead.
--
-- Note: this endpoint previously didn't exist at all — the guest gallery UI
-- (src/app/event/[slug]/g/[gallerySlug]/gallery-view.tsx) called
-- POST /api/photos/[id]/react already, but the route returned 404, so every
-- reaction/comment was purely a local optimistic UI update that vanished on
-- refresh and was never actually saved.

CREATE OR REPLACE FUNCTION public.increment_photo_reaction(p_photo_id UUID, p_emoji TEXT)
RETURNS JSONB AS $$
DECLARE
  updated JSONB;
BEGIN
  UPDATE public.photos
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{reactions}',
    COALESCE(metadata->'reactions', '{}'::jsonb) ||
      jsonb_build_object(p_emoji, COALESCE((metadata->'reactions'->>p_emoji)::int, 0) + 1)
  )
  WHERE id = p_photo_id
  RETURNING metadata->'reactions' INTO updated;

  RETURN updated;
END;
$$ LANGUAGE plpgsql;

-- Prepends a comment (text or voice-note reply) to metadata.comments, capped
-- at the 200 most recent so a single photo can't accumulate an unbounded
-- array over the life of a long-running event.
CREATE OR REPLACE FUNCTION public.add_photo_comment(p_photo_id UUID, p_comment JSONB)
RETURNS JSONB AS $$
DECLARE
  updated JSONB;
BEGIN
  UPDATE public.photos
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{comments}',
    (
      SELECT COALESCE(jsonb_agg(c), '[]'::jsonb)
      FROM (
        SELECT c FROM jsonb_array_elements(
          jsonb_build_array(p_comment) || COALESCE(metadata->'comments', '[]'::jsonb)
        ) c
        LIMIT 200
      ) capped
    )
  )
  WHERE id = p_photo_id
  RETURNING metadata->'comments' INTO updated;

  RETURN updated;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.increment_photo_reaction(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_photo_comment(UUID, JSONB) TO service_role;
