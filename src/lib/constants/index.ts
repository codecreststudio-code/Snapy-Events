

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
  // 1. Authentication Routes (Strict anti-bruteforce)
  AUTH_LOGIN: Number(process.env.RATE_LIMIT_AUTH_LOGIN) || 5, // 5 attempts per min
  AUTH_SIGNUP: Number(process.env.RATE_LIMIT_AUTH_SIGNUP) || 3, // 3 signups per 5 mins
  AUTH_PASSWORD: Number(process.env.RATE_LIMIT_AUTH_PASSWORD) || 3, // 3 resets per 5 mins

  // 2. Public Routes (Anti-enumeration & anti-spam)
  QR_SCAN: Number(process.env.RATE_LIMIT_QR_SCAN) || 30, // 30 scans per min
  PUBLIC_DEFAULT: Number(process.env.RATE_LIMIT_PUBLIC_DEFAULT) || 60, // 60 requests per min
  FACE_SEARCH: Number(process.env.RATE_LIMIT_AI_FACE_SEARCH) || 10, // 10 searches per min
  UPLOAD_PHOTOS: Number(process.env.RATE_LIMIT_UPLOAD_PHOTOS) || 30, // 30 uploads per min

  // 3. Authenticated User Routes
  USER_DEFAULT: Number(process.env.RATE_LIMIT_USER_DEFAULT) || 120, // 120 requests per min
  MEDIA_UPLOAD: Number(process.env.RATE_LIMIT_MEDIA_UPLOAD) || 30, // 30 uploads per min

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
  VIDEO: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  AUDIO: ["audio/mpeg", "audio/wav", "audio/webm", "audio/mp4", "audio/ogg", "audio/m4a"],
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
