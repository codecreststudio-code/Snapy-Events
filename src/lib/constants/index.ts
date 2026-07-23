

// Single source of truth for the event "type" a host can pick when creating
// an event. Consumed by the event-creation wizard's Step 2 cards
// (new-event-form.tsx's EVENT_TYPE_CARDS, which decorates each id below
// with an emoji/color via EVENT_TYPE_META) and by the EventType type below.
// Previously the wizard kept its own separate, hand-copied list that had
// drifted from this one — this one had "conference"/"concert"/"sports"/
// "anniversary"/"fundraiser"/"trade_show"/"community"/"other", none of
// which the wizard actually offered as a selectable card, while the wizard
// had "festival" and "custom", neither of which existed here. Since the
// wizard is the only place event_type is ever actually set, and it now
// imports this exact array instead of a second copy, the two can't drift
// again. Note "custom" is the wizard's free-text escape hatch — see
// EventType in lib/types/index.ts for why the stored value isn't actually
// confined to this list.
export const EVENT_TYPES = [
  "wedding",
  "birthday",
  "engagement",
  "corporate",
  "baby_shower",
  "graduation",
  "festival",
  "custom",
] as const

export const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  PAST_DUE: "past_due",
  TRIALING: "trialing",
} as const

export const USER_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
} as const

export const PERMISSIONS = {
  // Events
  "events:create": "Create events",
  "events:read": "View events",
  "events:update": "Update events",
  "events:delete": "Delete events",

  // Galleries
  "galleries:create": "Create galleries",
  "galleries:read": "View galleries",
  "galleries:update": "Update galleries",
  "galleries:delete": "Delete galleries",

  // Users
  "users:create": "Create users",
  "users:read": "View users",
  "users:update": "Update users",
  "users:delete": "Delete users",

  // Billing
  "billing:read": "View billing",
  "billing:manage": "Manage billing",

  // Analytics
  "analytics:read": "View analytics",

  // Admin
  "admin:access": "Access admin panel",
  "admin:users": "Manage admin users",
  "admin:events": "Manage all events",
  "admin:revenue": "View revenue",
} as const

export const STORAGE_BUCKETS = {
  EVENT_COVERS: "event-covers",
  GALLERY_COVERS: "gallery-covers",
  PHOTOS: "photos",
  PHOTOS_PUBLIC: "photos-public",
  FACES: "faces",
  AVATARS: "avatars",
  QR_CODES: "qr-codes",
} as const

export const FEATURE_FLAGS = {
  PAYMENTS_ENABLED: "payments_enabled",
  AI_FACE_SEARCH: "ai_face_search",
  PREMIUM_FEATURES: "premium_features",
  ENTERPRISE_SCALE: "enterprise_scale",
  WHATSAPP_NOTIFICATIONS: "whatsapp_notifications",
  LIVE_PHOTO_WALL: "live_photo_wall",
  SLIDESHOW_MODE: "slideshow_mode",
  WATERMARKING: "watermarking",
  CUSTOM_DOMAINS: "custom_domains",
  WHITE_LABEL: "white_label",
} as const

export const FACE_SIMILARITY_THRESHOLDS = {
  AUTO_MATCH: 0.8,
  REVIEW_SUGGESTED: 0.6,
} as const

export const API_RATE_LIMITS = {
  // 1. Authentication Routes (Strict anti-bruteforce)
  AUTH_LOGIN: Number(process.env.RATE_LIMIT_AUTH_LOGIN) || 5, // 5 attempts per min
  AUTH_SIGNUP: Number(process.env.RATE_LIMIT_AUTH_SIGNUP) || 3, // 3 signups per 5 mins
  AUTH_PASSWORD: Number(process.env.RATE_LIMIT_AUTH_PASSWORD) || 3, // 3 resets per 5 mins

  // 2. Public Routes (Anti-enumeration & anti-spam)
  QR_SCAN: Number(process.env.RATE_LIMIT_QR_SCAN) || 30, // 30 scans per min
  PUBLIC_DEFAULT: Number(process.env.RATE_LIMIT_PUBLIC_DEFAULT) || 60, // 60 requests per min
  FACE_SEARCH: Number(process.env.RATE_LIMIT_AI_FACE_SEARCH) || 10, // 10 searches per min
  UPLOAD_PHOTOS: Number(process.env.RATE_LIMIT_UPLOAD_PHOTOS) || 30, // 30 uploads per min
  COUPON_VALIDATE: Number(process.env.RATE_LIMIT_COUPON_VALIDATE) || 20, // 20 checks per min — this is an unauthenticated code-guessing surface
  JOIN_CODE: Number(process.env.RATE_LIMIT_JOIN_CODE) || 15, // 15 checks per min — 6-char code is an unauthenticated guessing surface too
  // Check-in itself (logGuestAccess) is a second, separate guessing surface
  // once an event requires a join code — a wrong-code submission there is
  // the actual gate, not just the /api/events/join lookup. Tighter window
  // (10/10min rather than 15/min) since this is the last line of defense
  // against brute-forcing a 6-char code, keyed by event+IP in guest.ts.
  GUEST_CHECKIN: Number(process.env.RATE_LIMIT_GUEST_CHECKIN) || 10, // 10 attempts per 10 min per event+IP
  PHOTO_REACT: Number(process.env.RATE_LIMIT_PHOTO_REACT) || 60, // 60 reactions/comments per min — generous since a live event can have bursts of guests reacting at once
  NEWSLETTER_SUBSCRIBE: Number(process.env.RATE_LIMIT_NEWSLETTER_SUBSCRIBE) || 10, // 10 per min — public, unauthenticated upsert into blog_subscribers

  // 3. Authenticated User Routes
  USER_DEFAULT: Number(process.env.RATE_LIMIT_USER_DEFAULT) || 120, // 120 requests per min
  MEDIA_UPLOAD: Number(process.env.RATE_LIMIT_MEDIA_UPLOAD) || 30, // 30 uploads per min
  RECAP_GENERATE: Number(process.env.RATE_LIMIT_RECAP_GENERATE) || 1, // 1 render per 3 mins — ~300s ffmpeg render, a host rarely needs this more than once every few minutes
  MOVIE_UPLOAD: Number(process.env.RATE_LIMIT_MOVIE_UPLOAD) || 3, // 3 uploads per 5 mins — client renders the video, this route just stores the finished file
  // Auto Collage (sharp composition) and AI Slideshow (scoring pass) generation
  // — comparable resource cost to MOVIE_UPLOAD/RECAP_GENERATE above, which are
  // both rate-limited for that exact reason; these two had no limit at all.
  MEMORIES_GENERATE: Number(process.env.RATE_LIMIT_MEMORIES_GENERATE) || 6, // 6 generations per 5 mins
  NOTIFICATION_DEVICE_REGISTER: Number(process.env.RATE_LIMIT_NOTIFICATION_DEVICE_REGISTER) || 10, // 10 device (re)registrations per min — a malicious/buggy client could hammer this on every token refresh
  // Outbound WhatsApp send — queues a message to an attacker-suppliable phone
  // number on behalf of the host's account; previously had no throttle at all.
  WHATSAPP_SEND: Number(process.env.RATE_LIMIT_WHATSAPP_SEND) || 20, // 20 sends per min
  // Payment routes previously had no rate limit at all, unlike every other
  // authenticated/public mutation in this codebase — a gap for both
  // Razorpay-order-spam and for hammering a coupon-validity/idempotency
  // check. Order creation is capped tighter than verify, since verify is
  // also legitimately retried by both the browser and the async webhook for
  // the same payment.
  PAYMENT_CHECKOUT: Number(process.env.RATE_LIMIT_PAYMENT_CHECKOUT) || 10, // 10 order-creations per min
  PAYMENT_VERIFY: Number(process.env.RATE_LIMIT_PAYMENT_VERIFY) || 20, // 20 verify calls per min

  // 4. Admin Routes (Strict high-security limit)
  ADMIN_STRICT: Number(process.env.RATE_LIMIT_ADMIN_STRICT) || 30, // 30 admin requests per min
  API_DEFAULT: Number(process.env.RATE_LIMIT_DEFAULT) || 100, // 100 requests per min
} as const

export const MAX_FILE_SIZES = {
  PHOTO: 50 * 1024 * 1024, // 50MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  AUDIO: 20 * 1024 * 1024, // 20MB
  COVER_IMAGE: 10 * 1024 * 1024, // 10MB
  AVATAR: 5 * 1024 * 1024, // 5MB
} as const

export const ALLOWED_MIME_TYPES = {
  PHOTO: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  // video/x-m4v covers the .m4v container some older iPhones/iTunes exports
  // use (distinct from video/quicktime .mov and video/mp4); video/3gpp
  // matches the photos storage bucket's allowlist (see
  // supabase/migrations/0040_photos_bucket_mime_coverage.sql).
  VIDEO: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/3gpp", "video/x-m4v"],
  // audio/aac and audio/x-m4a cover browsers/recorders that report those
  // instead of the already-listed audio/mp4 / audio/m4a for the same voice-
  // note containers; audio/mp3 is a nonstandard-but-sometimes-seen variant
  // of the correct audio/mpeg.
  AUDIO: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4", "audio/ogg", "audio/m4a", "audio/x-m4a", "audio/aac"],
  COVER: ["image/jpeg", "image/png", "image/webp"],
} as const

// Fallback values used when the `addons` table has no matching rows (or the
// query fails) — kept in sync with whatever is actually configured in
// Admin > Subscriptions > Add-ons today. If you change prices/tiers there,
// update these too, or the "not in sync" bug from before comes right back
// for anyone hitting the fallback path.
export const DEFAULT_GUEST_BOOSTS = [
  { value: 5, label: "+5 guests", price: 199 },
  { value: 25, label: "+25 guests", price: 399 },
]

export const DEFAULT_SHOT_BOOSTS = [
  { value: 5, label: "+5 shots", price: 99 },
  { value: 10, label: "+10 shots", price: 179 },
  { value: 25, label: "+25 shots", price: 249 },
]

// How many photos-per-guest each plan includes for free. Selecting a photo
// limit above the current plan's own value in the event wizard is an
// upsell, priced via PHOTO_LIMIT_ADDON_PRICES below — it used to be
// selectable for free regardless of plan, which meant e.g. a Starter host
// (20/guest included) could pick "Unlimited" at no extra charge.
export const PLAN_BASE_PHOTO_LIMITS: Record<string, number> = {
  free: 5,
  starter: 20,
  standard: 45,
  premium: 85,
}

// Flat one-time charge for raising an event's per-guest photo cap to this
// tier, only applied when the tier exceeds the selected plan's own included
// limit (see PLAN_BASE_PHOTO_LIMITS). -1 represents "Unlimited".
export const PHOTO_LIMIT_ADDON_PRICES: Record<number, number> = {
  5: 0,
  10: 99,
  25: 179,
  50: 249,
  [-1]: 599,
}

// Flat one-time charge to unlock Videos / Voice Notes for an event on a plan
// that doesn't already include them (Videos: Standard+, Voice Notes: Premium
// only) — previously these were just hard-blocked with no way to pay for
// them, or in one case (Free plan, Videos) not blocked at all and free.
export const VIDEO_UNLOCK_ADDON_PRICE = 599
export const VOICE_UNLOCK_ADDON_PRICE = 399
