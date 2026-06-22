export const PLANS = {
  FREE: "free",
  STARTER: "starter",
  STANDARD: "standard",
  PREMIUM: "premium",
} as const

export const PLAN_LIMITS = {
  [PLANS.FREE]: {
    events_limit: 1,
    storage_limit_gb: 1,
    photo_limit: 25,
    guests_limit: 5,
    shots_limit: 5,
    qr_codes_per_event: 1,
    galleries_per_event: 1,
    ai_searches: 0,
    custom_branding: false,
    priority_support: false,
  },
  [PLANS.STARTER]: {
    events_limit: 5,
    storage_limit_gb: 10,
    photo_limit: 100,
    guests_limit: 10,
    shots_limit: 10,
    qr_codes_per_event: 10,
    galleries_per_event: 5,
    ai_searches: 50,
    custom_branding: false,
    priority_support: false,
  },
  [PLANS.STANDARD]: {
    events_limit: 25,
    storage_limit_gb: 100,
    photo_limit: 750,
    guests_limit: 50,
    shots_limit: 15,
    qr_codes_per_event: 50,
    galleries_per_event: 20,
    ai_searches: 500,
    custom_branding: true,
    priority_support: false,
  },
  [PLANS.PREMIUM]: {
    events_limit: -1, // unlimited
    storage_limit_gb: 1000,
    photo_limit: 2500,
    guests_limit: 100,
    shots_limit: 25,
    qr_codes_per_event: -1,
    galleries_per_event: -1,
    ai_searches: -1,
    custom_branding: true,
    priority_support: true,
  },
} as const

export const PLAN_PRICES = {
  [PLANS.FREE]: { inr: 0, usd: 0 },
  [PLANS.STARTER]: { inr: 99, usd: 1.5 },
  [PLANS.STANDARD]: { inr: 499, usd: 6 },
  [PLANS.PREMIUM]: { inr: 1499, usd: 18 },
} as const

export const EVENT_TYPES = [
  "wedding",
  "birthday",
  "corporate",
  "conference",
  "concert",
  "sports",
  "graduation",
  "baby_shower",
  "engagement",
  "anniversary",
  "fundraiser",
  "trade_show",
  "community",
  "other",
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
  API_DEFAULT: 100, // requests per minute
  UPLOAD_PHOTOS: 50, // photos per minute per event
  FACE_SEARCH: 20, // searches per minute per user
} as const

export const MAX_FILE_SIZES = {
  PHOTO: 50 * 1024 * 1024, // 50MB
  COVER_IMAGE: 10 * 1024 * 1024, // 10MB
  AVATAR: 5 * 1024 * 1024, // 5MB
} as const

export const ALLOWED_MIME_TYPES = {
  PHOTO: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  COVER: ["image/jpeg", "image/png", "image/webp"],
} as const

export const DEFAULT_GUEST_BOOSTS = [
  { label: "No extra", value: 0, price: 0 },
  { label: "+10 guests", value: 10, price: 199 },
  { label: "+25 guests", value: 25, price: 399 },
  { label: "+50 guests", value: 50, price: 699 },
  { label: "+100 guests", value: 100, price: 1199 },
]

export const DEFAULT_SHOT_BOOSTS = [
  { label: "No extra", value: 0, price: 0 },
  { label: "+5 shots/guest", value: 5, price: 99 },
  { label: "+10 shots/guest", value: 10, price: 179 },
  { label: "+15 shots/guest", value: 15, price: 249 },
]