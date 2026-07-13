-- 0014_update_plan_limits_with_feature_keys.sql
-- Adds feature-gate keys to every plan's limits JSONB so the
-- server-side feature gate correctly gates features by plan tier.
-- Idempotent via ON CONFLICT DO UPDATE.

INSERT INTO public.plans (id, name, description, price_inr, price_usd, billing_interval, features, limits, sort_order, is_popular)
VALUES
  ('free', 'Free', 'Get started with one event and 1GB of storage.', 0, 0, 'monthly',
   '["1 event", "1 GB storage", "100 photos", "1 QR code per event", "Basic gallery"]'::jsonb,
   '{"events_limit": 1, "storage_limit_gb": 1, "photo_limit": 100, "qr_codes_per_event": 1, "galleries_per_event": 1, "ai_searches": 0, "custom_branding": false, "priority_support": false, "video_uploads": false, "voice_notes": false, "ai_face_search": false, "live_photo_wall": false, "print_ready_downloads": false, "whatsapp_alerts": false, "custom_reveal": true, "all_filters": false, "guest_reactions": true}'::jsonb,
   0, false),
  ('starter', 'Starter', 'For photographers running a few events per year.', 499, 6, 'monthly',
   '["5 events", "10 GB storage", "5,000 photos", "10 QR codes per event", "Custom gallery URL", "Email support"]'::jsonb,
   '{"events_limit": 5, "storage_limit_gb": 10, "photo_limit": 5000, "qr_codes_per_event": 10, "galleries_per_event": 5, "ai_searches": 50, "custom_branding": false, "priority_support": false, "video_uploads": true, "voice_notes": false, "ai_face_search": true, "live_photo_wall": false, "print_ready_downloads": false, "whatsapp_alerts": false, "custom_reveal": true, "all_filters": true, "guest_reactions": true}'::jsonb,
   1, false),
  ('standard', 'Standard', 'For studios running multiple weddings or events each month.', 1499, 18, 'monthly',
   '["25 events", "100 GB storage", "50,000 photos", "Live photo wall", "Slideshow mode", "Watermarking", "Custom branding", "AI face search (500/mo)"]'::jsonb,
   '{"events_limit": 25, "storage_limit_gb": 100, "photo_limit": 50000, "qr_codes_per_event": 50, "galleries_per_event": 20, "ai_searches": 500, "custom_branding": true, "priority_support": false, "video_uploads": true, "voice_notes": true, "ai_face_search": true, "live_photo_wall": true, "print_ready_downloads": true, "whatsapp_alerts": false, "custom_reveal": true, "all_filters": true, "guest_reactions": true}'::jsonb,
   2, true),
  ('premium', 'Premium', 'For agencies and enterprises at scale.', 3999, 48, 'monthly',
   '["Unlimited events", "1 TB storage", "Unlimited photos", "Unlimited QR codes", "AI face search (unlimited)", "White label", "Custom domain", "Priority support", "Dedicated success manager"]'::jsonb,
   '{"events_limit": -1, "storage_limit_gb": 1000, "photo_limit": -1, "qr_codes_per_event": -1, "galleries_per_event": -1, "ai_searches": -1, "custom_branding": true, "priority_support": true, "video_uploads": true, "voice_notes": true, "ai_face_search": true, "live_photo_wall": true, "print_ready_downloads": true, "whatsapp_alerts": true, "custom_reveal": true, "all_filters": true, "guest_reactions": true}'::jsonb,
   3, false)
ON CONFLICT (id) DO UPDATE
  SET limits = EXCLUDED.limits;
