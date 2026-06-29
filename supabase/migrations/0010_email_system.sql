-- 0010_email_system.sql
-- Implements tables and seeds for centralized email templates and logging.

-- 1. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  resend_id TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
DROP POLICY IF EXISTS "email_templates_select" ON public.email_templates;
CREATE POLICY "email_templates_select" ON public.email_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "email_templates_all" ON public.email_templates;
CREATE POLICY "email_templates_all" ON public.email_templates FOR ALL USING (public.is_platform_admin());

DROP POLICY IF EXISTS "email_logs_select" ON public.email_logs;
CREATE POLICY "email_logs_select" ON public.email_logs FOR SELECT USING (public.is_platform_admin());

DROP POLICY IF EXISTS "email_logs_insert" ON public.email_logs;
CREATE POLICY "email_logs_insert" ON public.email_logs FOR INSERT WITH CHECK (true);

-- 3. Seed initial default templates
INSERT INTO public.email_templates (id, name, subject, html_content, text_content, variables, is_system)
VALUES 
  (
    'welcome', 
    'Welcome Email', 
    'Welcome to Snapsy, {{host_name}}!', 
    '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eae5df;border-radius:12px;background-color:#ffffff;">
      <h2 style="color:#a58263;text-align:center;">Welcome to Snapsy!</h2>
      <p>Hello {{host_name}},</p>
      <p>Thank you for creating an account with Snapsy. We are thrilled to help you capture memories at your events.</p>
      <p>Your account email is: <strong>{{host_email}}</strong></p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{dashboard_url}}" style="background-color:#a58263;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Create Your First Event</a>
      </div>
      <hr style="border:none;border-top:1px solid #eae5df;margin:20px 0;" />
      <p style="font-size:12px;color:#7a756e;text-align:center;">If you have any questions, reply directly to this email or reach us at {{support_email}}.</p>
    </div>',
    'Welcome to Snapsy! Hello {{host_name}}, Thank you for signing up. Go to {{dashboard_url}} to get started.',
    ARRAY['host_name', 'host_email', 'dashboard_url', 'support_email'],
    true
  ),
  (
    'verification', 
    'Email Verification', 
    'Verify your Snapsy Email Address', 
    '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eae5df;border-radius:12px;">
      <h2 style="color:#a58263;text-align:center;">Verify Your Email Address</h2>
      <p>Hello,</p>
      <p>Please click the button below to verify your email address and activate your Snapsy account:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{verification_url}}" style="background-color:#a58263;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Verify Email</a>
      </div>
      <p style="font-size:12px;color:#7a756e;">This link will expire shortly. If you did not sign up for this account, you can safely ignore this email.</p>
    </div>',
    'Verify Your Email: Please click this link to verify your account: {{verification_url}}',
    ARRAY['verification_url'],
    true
  ),
  (
    'password_reset', 
    'Password Reset Request', 
    'Reset your Snapsy Password', 
    '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eae5df;border-radius:12px;">
      <h2 style="color:#e11d48;text-align:center;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{reset_url}}" style="background-color:#e11d48;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Reset Password</a>
      </div>
      <p style="font-size:12px;color:#7a756e;">If you did not request a password reset, please ignore this email or contact support immediately.</p>
    </div>',
    'Reset Password: Click this link to set a new password: {{reset_url}}',
    ARRAY['reset_url'],
    true
  ),
  (
    'payment_receipt', 
    'Payment Receipt & Subscription', 
    'Payment Receipt for Invoice {{invoice_number}}', 
    '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eae5df;border-radius:12px;">
      <h2 style="color:#a58263;text-align:center;">Payment Successful</h2>
      <p>Hello {{host_name}},</p>
      <p>Thank you for your purchase! We have successfully processed your payment.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">Invoice Number:</td><td style="padding:8px 0;font-weight:bold;text-align:right;">{{invoice_number}}</td></tr>
        <tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">Plan Description:</td><td style="padding:8px 0;font-weight:bold;text-align:right;">{{plan_name}}</td></tr>
        <tr style="border-bottom:1px solid #eae5df;"><td style="padding:8px 0;color:#7a756e;">Amount Paid:</td><td style="padding:8px 0;font-weight:bold;text-align:right;color:#16a34a;">₹{{payment_amount}}</td></tr>
      </table>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{dashboard_url}}" style="background-color:#a58263;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Go to Dashboard</a>
      </div>
    </div>',
    'Payment successful: Thank you for your payment of ₹{{payment_amount}} for {{plan_name}}. Invoice: {{invoice_number}}.',
    ARRAY['host_name', 'invoice_number', 'plan_name', 'payment_amount', 'dashboard_url'],
    true
  ),
  (
    'event_created', 
    'Event Published', 
    'Your Event "{{event_name}}" is Now Live!', 
    '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eae5df;border-radius:12px;">
      <h2 style="color:#a58263;text-align:center;">Event Published!</h2>
      <p>Hello {{host_name}},</p>
      <p>Congratulations! Your event <strong>{{event_name}}</strong> has been successfully published and is now live.</p>
      <p>You can start collecting guest uploads right away. Share the QR code or link below with your guests:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{event_link}}" style="background-color:#a58263;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">View Public Gallery</a>
      </div>
    </div>',
    'Event published: Hello {{host_name}}, your event {{event_name}} is now live. Share link: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'guest_invitation', 
    'Guest Invitation', 
    'You are invited to join "{{event_name}}"', 
    '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eae5df;border-radius:12px;">
      <h2 style="color:#a58263;text-align:center;">You are Invited!</h2>
      <p>Hello,</p>
      <p><strong>{{host_name}}</strong> has invited you to capture and share moments for the event: <strong>{{event_name}}</strong>.</p>
      <p>Please click the button below to join the event, scan the QR code, and upload your photos/videos directly to the live gallery:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{event_link}}" style="background-color:#a58263;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Join Live Event & Upload</a>
      </div>
      <p style="font-size:12px;color:#7a756e;text-align:center;">Thank you for helping us preserve these beautiful memories!</p>
    </div>',
    'Invitation: Hello, you are invited by {{host_name}} to join {{event_name}}. Click here to join: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'support_ticket', 
    'Support Ticket Update', 
    'Support Ticket Update: #{{ticket_id}}', 
    '<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eae5df;border-radius:12px;">
      <h2 style="color:#a58263;">Support Ticket #{{ticket_id}}</h2>
      <p>Hello {{host_name}},</p>
      <p>Your support ticket has been updated with the following status: <strong>{{ticket_status}}</strong>.</p>
      <div style="background-color:#faf9f6;border:1px solid #eae5df;padding:15px;border-radius:8px;margin:15px 0;font-style:italic;">
        "{{ticket_message}}"
      </div>
      <p><a href="{{dashboard_url}}/settings" style="color:#a58263;font-weight:bold;text-decoration:none;">View Support Tickets in Settings →</a></p>
    </div>',
    'Support Ticket #{{ticket_id}} updated: Status is {{ticket_status}}. Message: {{ticket_message}}.',
    ARRAY['host_name', 'ticket_id', 'ticket_status', 'ticket_message', 'dashboard_url'],
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  variables = EXCLUDED.variables,
  is_system = EXCLUDED.is_system;
