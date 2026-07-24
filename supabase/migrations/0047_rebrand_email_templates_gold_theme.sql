-- 0047_rebrand_email_templates_gold_theme.sql
-- Re-designs all system email templates with Snapsy's signature dark & luxury gold brand aesthetic (#c9a96e / #141210).

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, variables, is_system)
VALUES
  (
    'welcome',
    'Welcome Email',
    'Welcome to Snapsy, {{host_name}}!',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">✨ Welcome to Snapsy Events!</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello {{host_name}}, thank you for creating an account. We''re thrilled to help you capture and share unforgettable memories at your events.</p>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:15px;font-weight:700;color:#1c1a17;margin:0 0 6px;">🚀 Get Started</p>
        <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">Create your first event, generate a custom QR code, and start collecting photos from your guests in minutes.</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">📸&nbsp;&nbsp;Instant QR code galleries</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;Real-time guest photo uploads</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🤖&nbsp;&nbsp;AI-powered face search</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🔒&nbsp;&nbsp;Private and secure by default</div>
      </div>
      <div style="text-align:center;margin:8px 0 24px;">
        <a href="{{dashboard_url}}" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">Create Your First Event →</a>
      </div>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#64748b;line-height:1.5;">Need help getting started? Reach us anytime at {{support_email}}.</div>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{dashboard_url}}" style="color:#b89252;">{{dashboard_url}}</a></p>',
    'Welcome to Snapsy! Hello {{host_name}}, thank you for signing up. Go to {{dashboard_url}} to get started.',
    ARRAY['host_name', 'host_email', 'dashboard_url', 'support_email'],
    true
  ),
  (
    'verification',
    'Email Verification',
    'Verify your Snapsy Email Address',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">✅ Verify Your Email Address</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello, please confirm your email address to activate your Snapsy account.</p>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:15px;font-weight:700;color:#1c1a17;margin:0 0 6px;">🔐 One More Step</p>
        <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">Click the button below to verify your email and unlock full access to your account.</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">🔒&nbsp;&nbsp;Encrypted verification process</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;One-time secure link</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🛡️&nbsp;&nbsp;Link expires automatically</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">📷&nbsp;&nbsp;Your account stays protected</div>
      </div>
      <div style="text-align:center;margin:8px 0 24px;">
        <a href="{{verification_url}}" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">Verify Email →</a>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#b91c1c;line-height:1.5;">If you didn''t create a Snapsy account, you can safely ignore this email.</div>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{verification_url}}" style="color:#b89252;">{{verification_url}}</a></p>',
    'Verify your email: please click this link to verify your account: {{verification_url}}',
    ARRAY['verification_url'],
    true
  ),
  (
    'password_reset',
    'Password Reset Request',
    'Reset your Snapsy Password',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">🔑 Reset Your Password</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">We received a request to reset the password for your Snapsy account.</p>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:15px;font-weight:700;color:#1c1a17;margin:0 0 6px;">⚡ Create a New Password</p>
        <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">Click the button below to securely create a new password and regain access to your account.</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">🔒&nbsp;&nbsp;Encrypted password reset process</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;One-time secure reset link</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🛡️&nbsp;&nbsp;Link expires automatically</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">📷&nbsp;&nbsp;Your event data remains protected</div>
      </div>
      <div style="text-align:center;margin:8px 0 24px;">
        <a href="{{reset_url}}" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">Reset Password →</a>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#b91c1c;line-height:1.5;">If you didn''t request a password reset, you can safely ignore this email. Your account password will remain unchanged.</div>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{reset_url}}" style="color:#b89252;">{{reset_url}}</a></p>',
    'Reset your password: click this link to set a new password: {{reset_url}}',
    ARRAY['reset_url'],
    true
  ),
  (
    'payment_receipt',
    'Payment Receipt & Subscription',
    'Payment Receipt for Invoice {{invoice_number}}',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">💳 Payment Successful</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello {{host_name}}, thank you for your purchase! We''ve successfully processed your payment.</p>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:15px;font-weight:700;color:#1c1a17;margin:0 0 10px;">🧾 Invoice Summary</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="border-bottom:1px solid #f3e8d2;"><td style="padding:6px 0;color:#64748b;">Invoice Number:</td><td style="padding:6px 0;font-weight:700;text-align:right;color:#1c1a17;">{{invoice_number}}</td></tr>
          <tr style="border-bottom:1px solid #f3e8d2;"><td style="padding:6px 0;color:#64748b;">Plan Description:</td><td style="padding:6px 0;font-weight:700;text-align:right;color:#1c1a17;">{{plan_name}}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Amount Paid:</td><td style="padding:6px 0;font-weight:700;text-align:right;color:#16a34a;">₹{{payment_amount}}</td></tr>
        </table>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">🔒&nbsp;&nbsp;Secure payment processing</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">📄&nbsp;&nbsp;Invoice saved to your account</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;Instant access unlocked</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">💬&nbsp;&nbsp;Support available anytime</div>
      </div>
      <div style="text-align:center;margin:8px 0 24px;">
        <a href="{{dashboard_url}}" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">Go to Dashboard →</a>
      </div>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{dashboard_url}}" style="color:#b89252;">{{dashboard_url}}</a></p>',
    'Payment successful: thank you for your payment of ₹{{payment_amount}} for {{plan_name}}. Invoice: {{invoice_number}}.',
    ARRAY['host_name', 'invoice_number', 'plan_name', 'payment_amount', 'dashboard_url'],
    true
  ),
  (
    'event_created',
    'Event Published',
    'Your Event "{{event_name}}" is Now Live!',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">📸 Your Event is Live!</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello {{host_name}}, congratulations! Your event <strong>{{event_name}}</strong> has been published and is ready for guests.</p>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:15px;font-weight:700;color:#1c1a17;margin:0 0 6px;">🎉 Share the Moment</p>
        <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">Share your gallery link or QR code with guests so they can start uploading instantly.</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">📱&nbsp;&nbsp;No app required for guests</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;Real-time photo uploads</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🤖&nbsp;&nbsp;AI face search enabled</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🔒&nbsp;&nbsp;Private, host-controlled gallery</div>
      </div>
      <div style="text-align:center;margin:8px 0 24px;">
        <a href="{{event_link}}" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">View Public Gallery →</a>
      </div>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{event_link}}" style="color:#b89252;">{{event_link}}</a></p>',
    'Event published: hello {{host_name}}, your event {{event_name}} is now live. Share link: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'guest_invitation',
    'Guest Invitation',
    'You are invited to join "{{event_name}}"',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">🎊 You''re Invited!</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello, <strong>{{host_name}}</strong> has invited you to capture and share moments for <strong>{{event_name}}</strong>.</p>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:15px;font-weight:700;color:#1c1a17;margin:0 0 6px;">📷 Join the Gallery</p>
        <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">Scan the QR code or click below to upload your photos and videos directly to the live event gallery.</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">📱&nbsp;&nbsp;No app download needed</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;Upload directly from your phone</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🖼️&nbsp;&nbsp;Photos organized automatically</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🔒&nbsp;&nbsp;Your privacy is protected</div>
      </div>
      <div style="text-align:center;margin:8px 0 24px;">
        <a href="{{event_link}}" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">Join Live Event & Upload →</a>
      </div>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{event_link}}" style="color:#b89252;">{{event_link}}</a></p>',
    'Invitation: hello, you are invited by {{host_name}} to join {{event_name}}. Click here to join: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'support_ticket',
    'Support Ticket Update',
    'Support Ticket Update: #{{ticket_id}}',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">🎫 Support Ticket #{{ticket_id}}</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello {{host_name}}, your support ticket has been updated.</p>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:12px;padding:18px 20px;margin:0 0 20px;">
        <p style="font-size:15px;font-weight:700;color:#1c1a17;margin:0 0 6px;">📋 Status: {{ticket_status}}</p>
        <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;font-style:italic;">"{{ticket_message}}"</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">✅&nbsp;&nbsp;Ticket tracked and logged</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">👤&nbsp;&nbsp;Our team has been notified</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">💬&nbsp;&nbsp;Reply anytime by replying to this email</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;Priority handling when needed</div>
      </div>
      <div style="text-align:center;margin:8px 0 24px;">
        <a href="{{dashboard_url}}/settings" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">View Support Tickets →</a>
      </div>
      <p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{dashboard_url}}/settings" style="color:#b89252;">{{dashboard_url}}/settings</a></p>',
    'Support ticket #{{ticket_id}} updated: status is {{ticket_status}}. Message: {{ticket_message}}.',
    ARRAY['host_name', 'ticket_id', 'ticket_status', 'ticket_message', 'dashboard_url'],
    true
  ),
  (
    'newsletter',
    'Newsletter Broadcast',
    '✨ {{newsletter_title}} — Snapsy Events',
    '<h2 style="font-size:22px;font-weight:800;color:#1c1a17;margin:0 0 12px;">📰 {{newsletter_title}}</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Hello {{subscriber_name}}, welcome to this edition of the Snapsy Events newsletter!</p>
      <div style="background:#fcf9f2;border:1px solid #f3e8d2;border-radius:12px;padding:20px 22px;margin:0 0 22px;">
        <p style="font-size:14px;color:#2c2824;line-height:1.6;margin:0;white-space:pre-wrap;">{{newsletter_content}}</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:6px 0;font-size:13px;color:#374151;">📸&nbsp;&nbsp;Discover new live event features</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">⚡&nbsp;&nbsp;High-speed real-time photo sharing</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🤖&nbsp;&nbsp;AI Face Search & Smart Memories</div>
        <div style="padding:6px 0;font-size:13px;color:#374151;">🎉&nbsp;&nbsp;Exclusive tips for event hosts & guests</div>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{cta_url}}" style="background:linear-gradient(135deg,#c9a96e,#a88442);color:#0d0c0a;text-decoration:none;padding:14px 34px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 14px rgba(201,169,110,0.35);">{{cta_text}} →</a>
      </div>
      <div style="background:#fdfcf9;border:1px solid #f3e8d2;border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#64748b;line-height:1.5;">You are receiving this email because you subscribed to Snapsy Events. If you wish to unsubscribe, click <a href="{{unsubscribe_url}}" style="color:#b89252;text-decoration:underline;">here</a>.</div>',
    '{{newsletter_title}}\n\nHello {{subscriber_name}},\n\n{{newsletter_content}}\n\nRead more at {{cta_url}}',
    ARRAY['subscriber_name', 'newsletter_title', 'newsletter_content', 'cta_text', 'cta_url', 'unsubscribe_url'],
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
