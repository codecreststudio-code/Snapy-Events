-- 0047_rebrand_email_templates_gold_theme.sql
-- Re-designs all system email templates with Snapsy's dark luxury gold aesthetic matching Image 1.

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, variables, is_system)
VALUES
  (
    'verification',
    'Email Verification',
    'Verify your Snapsy Email Address',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="width:52px;vertical-align:top;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(202,138,4,0.1);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:48px;font-size:20px;">✉️</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <h2 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 6px;">Verify Your <span style="color:#eab308;">Email Address</span></h2>
            <p style="font-size:14px;color:#a1a1aa;line-height:1.5;margin:0;">Hello,<br />Please confirm your email address to activate your Snapsy account.</p>
          </td>
        </tr>
      </table>
      <div style="background:#0d0d0f;border:1px solid rgba(234,179,8,0.35);border-radius:12px;padding:16px 20px;margin:0 0 22px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:44px;vertical-align:middle;">
              <div style="width:36px;height:36px;border-radius:50%;background:rgba(202,138,4,0.15);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:36px;font-size:16px;">🔒</div>
            </td>
            <td style="vertical-align:middle;padding-left:8px;">
              <p style="font-size:14px;font-weight:700;color:#eab308;margin:0 0 3px;">One More Step</p>
              <p style="font-size:12px;color:#a1a1aa;line-height:1.4;margin:0;">Click the button below to verify your email and unlock full access to your account.</p>
            </td>
            <td style="width:20px;text-align:right;vertical-align:middle;color:#eab308;font-weight:800;font-size:18px;">›</td>
          </tr>
        </table>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;border-bottom:1px solid #1c1c20;"><span style="color:#eab308;margin-right:10px;">🛡️</span> <strong>Encrypted verification process</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">Your security is our priority.</span></div>
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;border-bottom:1px solid #1c1c20;"><span style="color:#eab308;margin-right:10px;">⚡</span> <strong>One-time secure link</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">The link can be used only once.</span></div>
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;border-bottom:1px solid #1c1c20;"><span style="color:#eab308;margin-right:10px;">🕒</span> <strong>Link expires automatically</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">For your protection, the link will expire.</span></div>
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;"><span style="color:#eab308;margin-right:10px;">🔒</span> <strong>Your account stays protected</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">Safe. Private. Secure.</span></div>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{verification_url}}" style="background:linear-gradient(135deg,#facc15 0%,#ca8a04 100%);color:#000000;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 20px rgba(234,179,8,0.35);">Verify Email &nbsp;→</a>
      </div>
      <div style="background:#181511;border:1px solid rgba(234,179,8,0.2);border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:12px;color:#a1a1aa;line-height:1.5;">⚠️ &nbsp;If you didn''t create a Snapsy account, you can safely <span style="color:#eab308;font-weight:700;">ignore</span> this email.</div>
      <p style="font-size:11px;color:#71717a;line-height:1.5;margin:16px 0 0;word-break:break-all;">If the button above doesn''t work, copy and paste this link into your browser:<br /><a href="{{verification_url}}" style="color:#eab308;text-decoration:underline;">{{verification_url}}</a></p>',
    'Verify your email: please click this link to verify your account: {{verification_url}}',
    ARRAY['verification_url'],
    true
  ),
  (
    'welcome',
    'Welcome Email',
    'Welcome to Snapsy, {{host_name}}!',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="width:52px;vertical-align:top;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(202,138,4,0.1);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:48px;font-size:20px;">🎉</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <h2 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 6px;">Welcome to <span style="color:#eab308;">Snapsy Events</span></h2>
            <p style="font-size:14px;color:#a1a1aa;line-height:1.5;margin:0;">Hello {{host_name}},<br />We are thrilled to help you capture and share unforgettable event memories.</p>
          </td>
        </tr>
      </table>
      <div style="background:#0d0d0f;border:1px solid rgba(234,179,8,0.35);border-radius:12px;padding:16px 20px;margin:0 0 22px;">
        <p style="font-size:14px;font-weight:700;color:#eab308;margin:0 0 4px;">🚀 Get Started in Minutes</p>
        <p style="font-size:12px;color:#a1a1aa;line-height:1.4;margin:0;">Create your first event, print custom QR display posters, and invite guests to upload live photos.</p>
      </div>
      <div style="margin:0 0 24px;">
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;border-bottom:1px solid #1c1c20;"><span style="color:#eab308;margin-right:10px;">📸</span> <strong>Instant QR galleries</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">No app download required.</span></div>
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;border-bottom:1px solid #1c1c20;"><span style="color:#eab308;margin-right:10px;">🤖</span> <strong>AI Face Search</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">Guests find their photos in seconds.</span></div>
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;border-bottom:1px solid #1c1c20;"><span style="color:#eab308;margin-right:10px;">🎬</span> <strong>Event Movies & Collages</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">Automatic memory creation.</span></div>
        <div style="padding:10px 0;font-size:13px;color:#e4e4e7;"><span style="color:#eab308;margin-right:10px;">🔒</span> <strong>Private & Host-controlled</strong> &nbsp;—&nbsp; <span style="color:#a1a1aa;">Full security and privacy.</span></div>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{dashboard_url}}" style="background:linear-gradient(135deg,#facc15 0%,#ca8a04 100%);color:#000000;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 20px rgba(234,179,8,0.35);">Create Your First Event &nbsp;→</a>
      </div>
      <p style="font-size:11px;color:#71717a;line-height:1.5;margin:16px 0 0;word-break:break-all;">Link: <a href="{{dashboard_url}}" style="color:#eab308;text-decoration:underline;">{{dashboard_url}}</a></p>',
    'Welcome to Snapsy! Hello {{host_name}}, thank you for signing up. Go to {{dashboard_url}} to get started.',
    ARRAY['host_name', 'host_email', 'dashboard_url', 'support_email'],
    true
  ),
  (
    'password_reset',
    'Password Reset Request',
    'Reset your Snapsy Password',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="width:52px;vertical-align:top;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(202,138,4,0.1);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:48px;font-size:20px;">🔑</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <h2 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 6px;">Reset Your <span style="color:#eab308;">Password</span></h2>
            <p style="font-size:14px;color:#a1a1aa;line-height:1.5;margin:0;">We received a password reset request for your Snapsy account.</p>
          </td>
        </tr>
      </table>
      <div style="background:#0d0d0f;border:1px solid rgba(234,179,8,0.35);border-radius:12px;padding:16px 20px;margin:0 0 22px;">
        <p style="font-size:14px;font-weight:700;color:#eab308;margin:0 0 4px;">⚡ Secure Password Recovery</p>
        <p style="font-size:12px;color:#a1a1aa;line-height:1.4;margin:0;">Click below to set a new secure password and regain instant access to your account.</p>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{reset_url}}" style="background:linear-gradient(135deg,#facc15 0%,#ca8a04 100%);color:#000000;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 20px rgba(234,179,8,0.35);">Reset Password &nbsp;→</a>
      </div>
      <div style="background:#181511;border:1px solid rgba(234,179,8,0.2);border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:12px;color:#a1a1aa;line-height:1.5;">If you didn''t request a password reset, you can safely ignore this email.</div>',
    'Reset your password: click this link to set a new password: {{reset_url}}',
    ARRAY['reset_url'],
    true
  ),
  (
    'payment_receipt',
    'Payment Receipt & Subscription',
    'Payment Receipt for Invoice {{invoice_number}}',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="width:52px;vertical-align:top;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(202,138,4,0.1);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:48px;font-size:20px;">💳</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <h2 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 6px;">Payment <span style="color:#eab308;">Successful</span></h2>
            <p style="font-size:14px;color:#a1a1aa;line-height:1.5;margin:0;">Hello {{host_name}}, thank you for your purchase! We have successfully processed your invoice.</p>
          </td>
        </tr>
      </table>
      <div style="background:#0d0d0f;border:1px solid rgba(234,179,8,0.35);border-radius:12px;padding:18px 20px;margin:0 0 22px;">
        <p style="font-size:14px;font-weight:700;color:#eab308;margin:0 0 10px;">🧾 Invoice Summary</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="border-bottom:1px solid #27272a;"><td style="padding:8px 0;color:#a1a1aa;">Invoice Number:</td><td style="padding:8px 0;font-weight:700;text-align:right;color:#ffffff;">{{invoice_number}}</td></tr>
          <tr style="border-bottom:1px solid #27272a;"><td style="padding:8px 0;color:#a1a1aa;">Plan Description:</td><td style="padding:8px 0;font-weight:700;text-align:right;color:#ffffff;">{{plan_name}}</td></tr>
          <tr><td style="padding:8px 0;color:#a1a1aa;">Amount Paid:</td><td style="padding:8px 0;font-weight:800;text-align:right;color:#eab308;">₹{{payment_amount}}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{dashboard_url}}" style="background:linear-gradient(135deg,#facc15 0%,#ca8a04 100%);color:#000000;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 20px rgba(234,179,8,0.35);">Go to Dashboard &nbsp;→</a>
      </div>',
    'Payment successful: thank you for your payment of ₹{{payment_amount}} for {{plan_name}}. Invoice: {{invoice_number}}.',
    ARRAY['host_name', 'invoice_number', 'plan_name', 'payment_amount', 'dashboard_url'],
    true
  ),
  (
    'event_created',
    'Event Published',
    'Your Event "{{event_name}}" is Now Live!',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="width:52px;vertical-align:top;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(202,138,4,0.1);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:48px;font-size:20px;">📸</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <h2 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 6px;">Your Event is <span style="color:#eab308;">Live!</span></h2>
            <p style="font-size:14px;color:#a1a1aa;line-height:1.5;margin:0;">Hello {{host_name}}, congratulations! Your event <strong>{{event_name}}</strong> has been published.</p>
          </td>
        </tr>
      </table>
      <div style="background:#0d0d0f;border:1px solid rgba(234,179,8,0.35);border-radius:12px;padding:16px 20px;margin:0 0 22px;">
        <p style="font-size:14px;font-weight:700;color:#eab308;margin:0 0 4px;">🎉 Ready for Guests</p>
        <p style="font-size:12px;color:#a1a1aa;line-height:1.4;margin:0;">Share your gallery link or QR code poster with guests so they can start uploading instantly.</p>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{event_link}}" style="background:linear-gradient(135deg,#facc15 0%,#ca8a04 100%);color:#000000;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 20px rgba(234,179,8,0.35);">View Public Gallery &nbsp;→</a>
      </div>',
    'Event published: hello {{host_name}}, your event {{event_name}} is now live. Share link: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'guest_invitation',
    'Guest Invitation',
    'You are invited to join "{{event_name}}"',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="width:52px;vertical-align:top;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(202,138,4,0.1);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:48px;font-size:20px;">🎊</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <h2 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 6px;">You''re <span style="color:#eab308;">Invited!</span></h2>
            <p style="font-size:14px;color:#a1a1aa;line-height:1.5;margin:0;">Hello, <strong>{{host_name}}</strong> has invited you to capture and share moments for <strong>{{event_name}}</strong>.</p>
          </td>
        </tr>
      </table>
      <div style="background:#0d0d0f;border:1px solid rgba(234,179,8,0.35);border-radius:12px;padding:16px 20px;margin:0 0 22px;">
        <p style="font-size:14px;font-weight:700;color:#eab308;margin:0 0 4px;">📷 Join the Live Event Gallery</p>
        <p style="font-size:12px;color:#a1a1aa;line-height:1.4;margin:0;">Upload your photos and videos directly from your phone — no app download required.</p>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{event_link}}" style="background:linear-gradient(135deg,#facc15 0%,#ca8a04 100%);color:#000000;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 20px rgba(234,179,8,0.35);">Join Live Event & Upload &nbsp;→</a>
      </div>',
    'Invitation: hello, you are invited by {{host_name}} to join {{event_name}}. Click here to join: {{event_link}}.',
    ARRAY['host_name', 'event_name', 'event_link'],
    true
  ),
  (
    'newsletter',
    'Newsletter Broadcast',
    '✨ {{newsletter_title}} — Snapsy Events',
    '<table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="width:52px;vertical-align:top;">
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(202,138,4,0.1);border:1px solid rgba(234,179,8,0.3);text-align:center;line-height:48px;font-size:20px;">📰</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <h2 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 6px;"><span style="color:#eab308;">{{newsletter_title}}</span></h2>
            <p style="font-size:14px;color:#a1a1aa;line-height:1.5;margin:0;">Hello {{subscriber_name}}, welcome to this edition of the Snapsy Events newsletter!</p>
          </td>
        </tr>
      </table>
      <div style="background:#0d0d0f;border:1px solid rgba(234,179,8,0.35);border-radius:12px;padding:20px 22px;margin:0 0 22px;">
        <p style="font-size:14px;color:#e4e4e7;line-height:1.6;margin:0;white-space:pre-wrap;">{{newsletter_content}}</p>
      </div>
      <div style="text-align:center;margin:12px 0 24px;">
        <a href="{{cta_url}}" style="background:linear-gradient(135deg,#facc15 0%,#ca8a04 100%);color:#000000;text-decoration:none;padding:15px 38px;border-radius:10px;font-weight:800;font-size:14px;display:inline-block;box-shadow:0 4px 20px rgba(234,179,8,0.35);">{{cta_text}} &nbsp;→</a>
      </div>
      <div style="background:#181511;border:1px solid rgba(234,179,8,0.2);border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:12px;color:#a1a1aa;line-height:1.5;">You are receiving this email because you subscribed to Snapsy Events. If you wish to unsubscribe, click <a href="{{unsubscribe_url}}" style="color:#eab308;text-decoration:underline;">here</a>.</div>',
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
