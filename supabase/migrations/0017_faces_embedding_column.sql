-- 0017_faces_embedding_column.sql
-- The AI face search pipeline was wired end-to-end with fake data: the
-- `faces` table only ever stored `embedding_path`/`embedding_model` (a
-- string reference, never actually written to), and the search route
-- fabricated near-identical "candidate" embeddings from the query itself
-- instead of comparing against anything real. Now that face detection
-- produces real 128-d descriptors (src/lib/integrations/face.ts), we need
-- somewhere to actually store them so search can compare against real data.
--
-- No pgvector extension is set up in this project, so this uses a plain
-- FLOAT8[] column with brute-force cosine similarity in application code
-- (src/lib/integrations/face.ts searchByEmbedding). That's fine at
-- event-gallery scale (hundreds to low thousands of faces per event).

ALTER TABLE public.faces
  ADD COLUMN IF NOT EXISTS embedding FLOAT8[];

COMMENT ON COLUMN public.faces.embedding IS
  '128-d face descriptor from face-api.js (face_recognition_model). NULL for rows detected before this column existed.';
