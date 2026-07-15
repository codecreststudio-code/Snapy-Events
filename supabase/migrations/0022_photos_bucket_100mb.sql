-- 0022_photos_bucket_100mb.sql
-- 0015_ensure_photos_bucket_public.sql capped the "photos" storage bucket at
-- 50MB, but src/lib/constants/index.ts (MAX_FILE_SIZES.VIDEO) has always
-- allowed guest video uploads up to 100MB. A 20-30s clip at 1080p easily
-- exceeds 50MB, so those uploads were passing the app's own size check and
-- then getting silently rejected by Supabase Storage itself — one likely
-- cause of "recorded a video but it never shows up / won't play" reports.
-- Bump the bucket limit to match the code's real ceiling.

UPDATE storage.buckets
SET file_size_limit = 104857600 -- 100MB, matches MAX_FILE_SIZES.VIDEO
WHERE id = 'photos';
