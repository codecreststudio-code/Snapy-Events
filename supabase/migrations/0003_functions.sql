-- 0003_functions.sql
-- Stored procedures / triggers: signup → organization, photo count rollups,
-- storage usage tracking, updated_at maintenance, and storage bucket setup.

-- updated_at trigger function ------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_org_touch BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_users_touch BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_events_touch BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_galleries_touch BEFORE UPDATE ON public.galleries
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_photos_touch BEFORE UPDATE ON public.photos
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_subs_touch BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tx_touch BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_cd_touch BEFORE UPDATE ON public.custom_domains
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_fc_touch BEFORE UPDATE ON public.face_clusters
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_st_touch BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Photo count rollups -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bump_gallery_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.galleries SET photo_count = photo_count + 1 WHERE id = NEW.gallery_id;
    UPDATE public.events SET upload_count = upload_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.galleries SET photo_count = GREATEST(0, photo_count - 1) WHERE id = OLD.gallery_id;
    UPDATE public.events SET upload_count = GREATEST(0, upload_count - 1) WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER trg_photo_count AFTER INSERT OR DELETE ON public.photos
    FOR EACH ROW EXECUTE FUNCTION public.bump_gallery_count();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage usage tracking ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_org uuid;
  v_total bigint;
  v_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT organization_id INTO v_org FROM public.events WHERE id = OLD.event_id;
  ELSE
    SELECT organization_id INTO v_org FROM public.events WHERE id = NEW.event_id;
  END IF;

  IF v_org IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(file_size), 0), COUNT(*)
    INTO v_total, v_count
    FROM public.photos
   WHERE event_id IN (SELECT id FROM public.events WHERE organization_id = v_org);

  INSERT INTO public.storage_usage (organization_id, total_bytes, photo_count, updated_at)
    VALUES (v_org, v_total, v_count, now())
    ON CONFLICT (organization_id)
    DO UPDATE SET total_bytes = EXCLUDED.total_bytes,
                  photo_count = EXCLUDED.photo_count,
                  updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER trg_storage_usage AFTER INSERT OR UPDATE OR DELETE ON public.photos
    FOR EACH ROW EXECUTE FUNCTION public.update_storage_usage();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Signup → create profile + organization ------------------------------------
-- Trigger: when a new user signs up, the client may also create the org. The
-- `handle_new_user` function just creates the users row if it does not exist;
-- the application is responsible for creating the organization in the same
-- transaction via a server action.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Increment view counters ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_event_view(event_uuid uuid)
RETURNS void AS $$
  UPDATE public.events SET view_count = view_count + 1 WHERE id = event_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- QR scan counter ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_qr_scan(qr_uuid uuid, scan_ip inet, scan_ua text, scan_country text, scan_city text, scan_device text, scan_referrer text)
RETURNS void AS $$
  UPDATE public.qr_codes SET scan_count = scan_count + 1 WHERE id = qr_uuid;
  INSERT INTO public.qr_scans (qr_code_id, ip_address, user_agent, country, city, device_type, referrer)
    VALUES (qr_uuid, scan_ip, scan_ua, scan_country, scan_city, scan_device, scan_referrer);
$$ LANGUAGE sql SECURITY DEFINER;

-- Storage buckets (idempotent) ----------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('event-covers', 'event-covers', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
    ('gallery-covers', 'gallery-covers', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
    ('photos', 'photos', false, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']),
    ('photos-public', 'photos-public', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']),
    ('faces', 'faces', false, 10485760, ARRAY['application/octet-stream']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
    ('qr-codes', 'qr-codes', true, 1048576, ARRAY['image/png','image/svg+xml'])
  ON CONFLICT (id) DO NOTHING;

-- Org helpers for RLS-aware storage paths ------------------------------------
-- Path convention: <bucket>/<organization_id>/<event_id>/<file>
-- Storage policies are intentionally permissive (object-level) since the
-- public bucket is served via signed URLs from the application layer.

DROP POLICY IF EXISTS "org_event_covers_write" ON storage.objects;
CREATE POLICY "org_event_covers_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_event_covers_read" ON storage.objects;
CREATE POLICY "org_event_covers_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "org_photos_write" ON storage.objects;
CREATE POLICY "org_photos_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('photos','photos-public') AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_photos_read" ON storage.objects;
CREATE POLICY "org_photos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('photos','photos-public'));

DROP POLICY IF EXISTS "faces_write" ON storage.objects;
CREATE POLICY "faces_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'faces' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "faces_read" ON storage.objects;
CREATE POLICY "faces_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'faces');

DROP POLICY IF EXISTS "avatars_write" ON storage.objects;
CREATE POLICY "avatars_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "qr_write" ON storage.objects;
CREATE POLICY "qr_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qr-codes' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "qr_read" ON storage.objects;
CREATE POLICY "qr_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'qr-codes');
