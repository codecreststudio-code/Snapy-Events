-- 0026_fix_face_clusters_representative_fk.sql
-- public.face_clusters.representative_face_id was defined in 0001_init.sql
-- as `REFERENCES public.face_clusters(id)` — a copy/paste self-reference
-- bug. It should reference public.faces(id): a cluster's "representative
-- face" is a row in the `faces` table (the face used as the cluster's
-- cover/thumbnail), never another cluster.
--
-- This was never caught earlier because nothing in the app ever wrote to
-- face_clusters at all (the clustering step didn't exist yet — see
-- src/lib/integrations/face.ts's detectAndStoreFaces). Now that clustering
-- writes representative_face_id = a real faces.id, the old FK would reject
-- every insert with a foreign-key violation.

ALTER TABLE public.face_clusters
  DROP CONSTRAINT IF EXISTS face_clusters_representative_face_id_fkey;

ALTER TABLE public.face_clusters
  ADD CONSTRAINT face_clusters_representative_face_id_fkey
  FOREIGN KEY (representative_face_id) REFERENCES public.faces(id) ON DELETE SET NULL;
