-- 0039_notification_infrastructure.sql
--
-- Phase B push-notification infrastructure: per-user device registrations
-- (FCM tokens), per-user notification category preferences, and the actual
-- in-app Notification Center records. This is UNRELATED to
-- public.admin_notifications (0006_admin_notifications.sql), which stays
-- exactly as-is and is not touched here — that table is platform-admin-only
-- ("your event's payment failed", etc. surfaced to Snapsy admins); these new
-- tables are host/guest-facing notifications ("Jane just uploaded 3 photos",
-- "Your AI story is ready").

-- 1. notification_devices — one row per registered push token -----------
CREATE TABLE IF NOT EXISTS public.notification_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_token TEXT NOT NULL,
  device_type TEXT NOT NULL, -- mobile, desktop, mobile-pwa, desktop-pwa (client-supplied, not constrained)
  browser TEXT, -- chrome/firefox/safari/edge/opera
  platform TEXT, -- android/ios/windows/macos/linux
  notification_permission TEXT NOT NULL DEFAULT 'granted',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_devices_token_unique UNIQUE (notification_token)
);

CREATE INDEX IF NOT EXISTS idx_notification_devices_user_id ON public.notification_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_devices_token ON public.notification_devices(notification_token);

ALTER TABLE public.notification_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own devices" ON public.notification_devices;
CREATE POLICY "Users can view their own devices" ON public.notification_devices
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can register their own devices" ON public.notification_devices;
CREATE POLICY "Users can register their own devices" ON public.notification_devices
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own devices" ON public.notification_devices;
CREATE POLICY "Users can update their own devices" ON public.notification_devices
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own devices" ON public.notification_devices;
CREATE POLICY "Users can delete their own devices" ON public.notification_devices
    FOR DELETE
    USING (auth.uid() = user_id);

-- 2. notification_preferences — one row per user, flexible category map --
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{"comments": true, "likes": true, "uploads": true, "reminders": true, "marketing": false, "ai_stories": true, "highlights": true, "announcements": true, "new_guest": true, "milestones": true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. notifications — Notification Center records --------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- new_guest_joined, media_uploaded, comment_received, ai_story_ready, etc. (app-level list grows, not constrained here)
  title TEXT NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb, -- deep-link payload, e.g. {"url": "/dashboard/events/abc", "event_id": "..."}
  read_at TIMESTAMPTZ, -- null = unread
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- Notifications are always created server-side (trigger code / API routes
-- using the service-role client), never directly by a user — same pattern
-- as admin_notifications' insert policy in 0006_admin_notifications.sql.
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- Realtime — Notification Center subscribes to this table for live updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
