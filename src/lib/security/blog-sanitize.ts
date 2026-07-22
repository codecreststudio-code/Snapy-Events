// src/lib/security/blog-sanitize.ts
//
// Sanitizes blog post `content` at the trust boundary — when an admin
// actually saves a post (POST/PATCH on /api/blog/posts) — rather than only
// at render time. Client-side-only sanitization (see the DOMPurify pass in
// src/app/blog/[slug]/client.tsx) isn't sufficient on its own: browsers
// start executing <script>/<iframe>/onerror handlers as soon as the
// server-rendered HTML is parsed, which happens before React hydrates and
// runs any client-side sanitizer. Sanitizing here means the stored content
// is safe regardless of where or how it's ever rendered.
//
// Blog `content` is a lightweight custom markdown-ish format (## headers,
// **bold**, etc. — see formatContent() in client.tsx), not full HTML, so
// this doesn't touch valid markdown syntax (plain text with no HTML tags
// passes through completely unchanged). It only strips actual embedded HTML
// an author (or an attacker, given posts/route.ts previously had a broken
// authorization check — see the fix in that file) could inject directly,
// e.g. <script>, <iframe>, <object>, or an onerror= attribute.
import sanitizeHtml from "sanitize-html"

// Kept in sync with BLOG_CONTENT_ALLOWED_TAGS in
// src/app/blog/[slug]/client.tsx — the exact tags formatContent's own
// markdown-to-HTML conversion ever produces, plus <a> in case an author
// hand-writes a link (formatContent doesn't generate anchors itself).
const ALLOWED_TAGS = [
  "h2", "h3", "h4", "strong", "em", "code", "blockquote", "hr",
  "div", "table", "tr", "td", "ul", "ol", "li", "p", "span", "a",
]

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  "*": ["class"],
}

export function sanitizeBlogContent(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Blocks javascript:/data: hrefs on the one tag (`a`) allowed to carry one.
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  })
}
