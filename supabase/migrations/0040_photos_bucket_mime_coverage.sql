-- Defensive re-assertion of the `photos` storage bucket's allowed MIME types
-- and size limit. Prompted by an audit of the guest upload pipeline after
-- reports of video/voice-note uploads failing (see the "[object Object]"
-- error-message bug fixed in src/app/event/[slug]/upload/page.tsx the same
-- session — that was the confirmed root cause of the garbled error text, but
-- while auditing the storage layer end-to-end this migration closes a
-- secondary, real gap: the bucket's allowlist (0015_ensure_photos_bucket_
-- public.sql, later size-bumped by 0022_photos_bucket_100mb.sql) is missing
-- a couple of MIME strings that mobile browsers/recorders can legitimately
-- report:
--   - video/x-m4v  — the .m4v container some older iPhones/iTunes-exported
--     clips use; distinct from video/quicktime (.mov) and video/mp4, which
--     were already allowed.
--   - audio/x-m4a  — some Android/Chrome versions report this instead of
--     the already-allowed audio/m4a for the same .m4a voice-note container.
--   - audio/mp3    — a nonstandard but occasionally-seen alternative to the
--     correct audio/mpeg for .mp3 files.
-- All previously-allowed types are kept; this is additive only.
UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100MB, matches MAX_FILE_SIZES.VIDEO (src/lib/constants)
  allowed_mime_types = ARRAY[
    'image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif',
    'video/mp4','video/quicktime','video/webm','video/x-msvideo','video/3gpp','video/x-m4v',
    'audio/mpeg','audio/mp3','audio/mp4','audio/wav','audio/webm','audio/ogg','audio/m4a','audio/x-m4a','audio/aac'
  ]
WHERE id = 'photos';
