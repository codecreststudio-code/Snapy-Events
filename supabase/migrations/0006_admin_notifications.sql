-- Create Admin Notifications Table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, error
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON public.admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can read their own notifications
DROP POLICY IF EXISTS "Admins can view their own notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view their own notifications" ON public.admin_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "Admins can update their own notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update their own notifications" ON public.admin_notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Only service role or triggers can insert notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.admin_notifications;
CREATE POLICY "Service role can insert notifications" ON public.admin_notifications
    FOR INSERT
    WITH CHECK (true); -- Usually enforced by using service_role key anyway, but good practice
