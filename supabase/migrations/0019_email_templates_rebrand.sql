-- 0019_email_templates_rebrand.sql
-- The 7 system email templates (seeded in 0010_email_system.sql) used a
-- tan/brown palette (#a58263) that only ever belonged to the event-creation
-- wizard's own step UI, not the site's actual brand — the real marketing
-- site (src/app/page.tsx) and every CTA on it use a violet-600 -> fuchsia-500
-- gradient throughout. This re-seeds the same 7 templates with that palette,
-- a cleaner layout, and clearer copy. All {{variable}} placeholders are kept
-- byte-for-byte identical to what src/lib/integrations/resend.ts and the
-- callers in src/app/api/** already pass in, so no code changes are needed
-- alongside this migration — only the visual design changes.
--
-- Safe to re-run: uses the same ON CONFLICT (id) DO UPDATE pattern as the
-- original seed, so it just overwrites these 7 rows in place.

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, variables, is_system)
VALUES
  (
    'welcome',
    'Welcome Email',
    'Welcome to Snapsy, {{host_name}}!',
    '<h2 style="color:#7c3aed;text-align:center;margin-top:0;">Welcome to Snapsy!</h2>
      <p>Hello {{host_name}},</p>
      <p>Thank you for creating an account with Snapsy. We''re thrilled to help you capture and share memories at your events.</p>
      <p style="background-color:#f7f5fb;border:1px solid #ede9fe;border-radius:8px;padding:12px 16px;font-size:14px;">Your account email: <strong>{{host_email}}</strong></p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{dashboard_url}}" style="background:linear-gradient(to right,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:bold;display:inline-block;">Create Your First Event</a>
      </div>
      <hr style="border:none;border-top:1px solid #ede9fe;margin:20px 0;" />
      <p style="font-size:12px;color:#64748b;text-align:center;">If you have any questions, reply directly to this email or reach us at {{support_email}}.</p>',
    'Welcome to Snapsy! Hello {{host_name}}, thank you for signing up. Go to {{dashboard_url}} to get started.',
    ARRAY['host_name', 'host_email', 'dashboard_url', 'support_email'],
    true
  ),
  (
    'verification',
    'Email Verification',
    'Verify your Snapsy Email Address',
    '<h2 style="color:#7c3aed;text-align:center;margin-top:0;">Verify Your Email Address</h2>
      <p>Hello,</p>
      <p>Please click the button below to verify your email address and activate your Snapsy account:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{verification_url}}" style="background:linear-gradient(to right,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:bold;display:inline-block;">Verify Email</a>
      </div>
      <p style="font-size:12px;color:#64748b;">This link will expire shortly. If you did not sign up for this account, you can safely ignore this email.</p>',
    'Verify your email: please click this link to verify your account: {{verification_url}}',
    ARRAY['verification_url'],
    true
  ),
  (
    'password_reset',
    'Password Reset Request',
    'Reset your Snapsy Password',
    '<h2 style="color:#e11d48;text-align:center;margin-top:0;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to set a new one:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{reset_url}}" style="background-color:#e11d48;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:bold;display:inline-block;">Reset Password</a>
      </div>
      <p style="font-size:12px;color:#64748b;">If you did not request a password reset, please ignore this email or contact support immediately.</p>',
    'Reset your password: click this link to set a new password: {{reset_url}}',
    ARRAY['reset_url'],
    true
  ),
  (
    'payment_receipt',
    'Payment Receipt & Subscription',
    'Payment Receipt for Invoice {{invoice_number}}',
    '<h2 style="color:#7c3aed;text-align:center;margin-top:0;">Payment Successful</h2>
      <p>Hello {{host_name}},</p>
      <p>Thank you for your purchase! We''ve successfully processed your payment.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr style="border-bottom:1px solid #ede9fe;"><td style="padding:8px 0;color:#64748b;">Invoice Number:</td><td style="padding:8px 0;font-weight:bold;text-align:right;">{{invoice_number}}</td></tr>
        <tr style="border-bottom:1px solid #ede9fe;"><td style="padding:8px 0;color:#64748b;">Plan Description:</td><td style="padding:8px 0;font-weight:bold;text-align:right;">{{plan_name}}</td></tr>
        <tr style="border-bottom:1px solid #ede9fe;"><td style="padding:8px 0;color:#64748b;">Amount Paid:</td><td style="padding:8px 0;font-weight:bold;text-align:right;color:#16a34a;">₹{{payment_amount}}</td></tr>
      </table>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{dashboard_url}}" style="background:linear-gradient(to right,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:bold;display:inline-block;">Go to Dashboard</a>
      </div>',
    'Payment successful: thank you for your payment of ₹{{payment_amount}} for {{plan_name}}. Invoice: {{invoice_number}}.',
    ARRAY['host_name', 'invoice_number', 'plan_name', 'payment_amount', 'dashboard_url'],
    true
  ),
  (
    'event_created',
    'Event Published',
    'Your Event "{{event_name}}" is Now Live!',
    '<h2 style="color:#7c3aed;text-align:center;margin-top:0;">Event Published!</h2>
      <p>Hello {{host_name}},</p>
      <p>Congratulations! Your event <strong>{{event_name}}</strong> has been successfully published and is now live.</p>
      <p>You can start collecting guest uploads right away. Share the QR code or link below with your guests:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{event_link}}" style="background:linear-gradient(to right,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:bold;display:inline-block;">View Public Gallery</a>
      </div>',
    'Event published: hello {{host_name}}, your event {{event_name}} is now live. Share link: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'guest_invitation',
    'Guest Invitation',
    'You are invited to join "{{event_name}}"',
    '<h2 style="color:#7c3aed;text-align:center;margin-top:0;">You''re Invited!</h2>
      <p>Hello,</p>
      <p><strong>{{host_name}}</strong> has invited you to capture and share moments for the event: <strong>{{event_name}}</strong>.</p>
      <p>Click the button below to join the event, scan the QR code, and upload your photos and videos directly to the live gallery:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{{event_link}}" style="background:linear-gradient(to right,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:bold;display:inline-block;">Join Live Event & Upload</a>
      </div>
      <p style="font-size:12px;color:#64748b;text-align:center;">Thank you for helping us preserve these beautiful memories!</p>',
    'Invitation: hello, you are invited by {{host_name}} to join {{event_name}}. Click here to join: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'support_ticket',
    'Support Ticket Update',
    'Support Ticket Update: #{{ticket_id}}',
    '<h2 style="color:#7c3aed;margin-top:0;">Support Ticket #{{ticket_id}}</h2>
      <p>Hello {{host_name}},</p>
      <p>Your support ticket has been updated with the following status: <strong>{{ticket_status}}</strong>.</p>
      <div style="background-color:#f7f5fb;border:1px solid #ede9fe;padding:15px;border-radius:8px;margin:15px 0;font-style:italic;">
        "{{ticket_message}}"
      </div>
      <p><a href="{{dashboard_url}}/settings" style="color:#7c3aed;font-weight:bold;text-decoration:none;">View Support Tickets in Settings →</a></p>',
    'Support ticket #{{ticket_id}} updated: status is {{ticket_status}}. Message: {{ticket_message}}.',
    ARRAY['host_name', 'ticket_id', 'ticket_status', 'ticket_message', 'dashboard_url'],
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  variables = EXCLUDED.variables,
  is_system = EXCLUDED.is_system,
  updated_at = now();
