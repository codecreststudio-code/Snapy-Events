-- 0046_newsletter_email_template.sql
-- Adds the default Newsletter Broadcast template to email_templates matching Snapsy's luxury gold & dark theme aesthetics.

INSERT INTO public.email_templates (id, name, subject, html_content, text_content, variables, is_system)
VALUES (
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
      <a href="{{cta_url}}" style="background:linear-gradient(135deg,#c9a96e,#b89252);color:#ffffff;text-decoration:none;padding:14px 34px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 4px 12px rgba(201,169,110,0.3);">{{cta_text}} →</a>
    </div>
    <div style="background:#f7f5fb;border:1px solid #ede9fe;border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#64748b;line-height:1.5;">You are receiving this email because you subscribed to Snapsy Events. If you wish to unsubscribe, click <a href="{{unsubscribe_url}}" style="color:#b89252;text-decoration:underline;">here</a>.</div>',
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
