

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
  { value: 10, label: "+10 guests", price: 199 },
  { value: 25, label: "+25 guests", price: 399 },
  { value: 50, label: "+50 guests", price: 699 },
  { value: 100, label: "+100 guests", price: 1199 },
]

export const DEFAULT_SHOT_BOOSTS = [
  { value: 5, label: "+5 shots", price: 99 },
  { value: 10, label: "+10 shots", price: 179 },
  { value: 25, label: "+25 shots", price: 249 },
]
