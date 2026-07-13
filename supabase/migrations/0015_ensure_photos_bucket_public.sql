-- 0015_ensure_photos_bucket_public.sql
-- Ensures the "photos" storage bucket is public and allows video/audio MIME types.
-- Created as private in 0003_functions.sql; runtime updateBucket() calls may silently
-- fail with insufficient permissions. This migration guarantees public access.

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif',
    'video/mp4','video/quicktime','video/webm','video/x-msvideo','video/3gpp',
    'audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg','audio/m4a','audio/aac'
  ]
WHERE id = 'photos';
