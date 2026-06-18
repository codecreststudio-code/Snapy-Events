export type PlanId = "free" | "starter" | "standard" | "premium"
export type EventType = typeof import("@/lib/constants").EVENT_TYPES[number]
export type EventStatus = "draft" | "published" | "completed" | "archived"
export type UserRole = "owner" | "admin" | "member" | "viewer"
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing"
export type Permission =
  | "events:create"
  | "events:read"
  | "events:update"
  | "events:delete"
  | "galleries:create"
  | "galleries:read"
  | "galleries:update"
  | "galleries:delete"
  | "users:create"
  | "users:read"
  | "users:update"
  | "users:delete"
  | "billing:read"
  | "billing:manage"
  | "analytics:read"
  | "admin:access"
  | "admin:users"
  | "admin:events"
  | "admin:revenue"

export interface Organization {
  id: string
  name: string
  slug: string
  plan: PlanId
  feature_flags: Record<string, boolean>
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string | null
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  permissions: Permission[]
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  organization_id: string
  host_id: string
  name: string
  slug: string
  description: string | null
  event_type: EventType | null
  event_date: string | null
  end_date: string | null
  venue: string | null
  timezone: string
  cover_image_url: string | null
  settings: EventSettings
  status: EventStatus
  view_count: number
  created_at: string
  updated_at: string
}

export interface EventSettings {
  is_public: boolean
  password_protected: boolean
  password?: string
  allow_guest_uploads: boolean
  auto_approve_photos: boolean
  enable_countdown: boolean
  countdown_date?: string
  custom_css?: string
}

export interface Gallery {
  id: string
  event_id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  is_public: boolean
  reveal_at: string | null
  reveal_enabled: boolean
  settings: GallerySettings
  photo_count: number
  created_at: string
  updated_at: string
}

export interface GallerySettings {
  allow_uploads: boolean
  allow_downloads: boolean
  show_exif: boolean
  enable_lightbox: boolean
}

export interface Photo {
  id: string
  gallery_id: string
  uploader_id: string | null
  event_id: string
  storage_path: string
  thumbnail_path: string | null
  original_filename: string | null
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  metadata: Record<string, unknown>
  is_approved: boolean
  is_featured: boolean
  face_count: number
  download_count: number
  created_at: string
}

export interface QRCode {
  id: string
  event_id: string
  gallery_id: string | null
  code: string
  name: string | null
  redirect_url: string | null
  scan_count: number
  settings: Record<string, unknown>
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export interface PhotoAccess {
  id: string
  event_id: string
  gallery_id: string | null
  session_token: string
  guest_name: string | null
  guest_email: string | null
  permissions: string[]
  accessed_at: string
  expires_at: string | null
}

export interface Plan {
  id: PlanId
  name: string
  description: string | null
  price_inr: number
  price_usd: number
  billing_interval: "monthly" | "yearly"
  features: string[]
  limits: PlanLimits
  is_active: boolean
  created_at: string
}

export interface PlanLimits {
  events_limit: number
  storage_limit_gb: number
  photo_limit: number
  qr_codes_per_event: number
  galleries_per_event: number
  ai_searches: number
  custom_branding: boolean
  priority_support: boolean
}

export interface Subscription {
  id: string
  organization_id: string
  plan_id: PlanId
  razorpay_subscription_id: string | null
  razorpay_customer_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  trial_ends_at: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  organization_id: string
  subscription_id: string | null
  razorpay_invoice_id: string | null
  invoice_number: string
  status: "created" | "sent" | "paid" | "failed" | "refunded"
  currency: string
  subtotal: number
  tax: number
  total: number
  paid_at: string | null
  issued_at: string
  due_at: string | null
}

export interface Transaction {
  id: string
  organization_id: string
  invoice_id: string | null
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  amount: number
  currency: string
  status: "pending" | "success" | "failed" | "refunded"
  payment_method: string | null
  gateway_response: Record<string, unknown> | null
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_subscription_months: number
  max_uses: number | null
  used_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export interface Referral {
  id: string
  referrer_org_id: string
  referred_org_id: string
  coupon_id: string | null
  status: "pending" | "completed" | "rewarded"
  reward_credited: boolean
  created_at: string
}

export interface Face {
  id: string
  photo_id: string
  bounding_box: BoundingBox
  confidence: number
  embedding_path: string | null
  created_at: string
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FaceSearchLog {
  id: string
  user_id: string | null
  search_type: "upload" | "gallery"
  query_photo_id: string | null
  results: FaceSearchResult[]
  search_duration_ms: number | null
  created_at: string
}

export interface FaceSearchResult {
  photo_id: string
  similarity: number
  face_id: string
}

export interface AnalyticsEvent {
  id: string
  organization_id: string | null
  event_type: string
  event_data: Record<string, unknown>
  user_id: string | null
  session_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  organization_id: string | null
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  changes: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface StorageUsage {
  id: string
  organization_id: string
  total_bytes: number
  photo_count: number
  updated_at: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface ApiMeta {
  pagination?: Pagination
}

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

// Extended types with relations
export interface EventWithDetails extends Event {
  organization?: Organization
  host?: User
  galleries?: Gallery[]
  qr_codes?: QRCode[]
  _count?: {
    galleries: number
    photos: number
  }
}

export interface GalleryWithPhotos extends Gallery {
  event?: Event
  photos?: Photo[]
  _count?: {
    photos: number
  }
}

export interface UserWithOrganization extends User {
  organization?: Organization
}

// Database insert types
export type OrganizationInsert = Omit<Organization, "id" | "created_at" | "updated_at">
export type UserInsert = Omit<User, "id" | "created_at" | "updated_at">
export type EventInsert = Omit<Event, "id" | "created_at" | "updated_at" | "view_count">
export type GalleryInsert = Omit<Gallery, "id" | "created_at" | "updated_at" | "photo_count">
export type PhotoInsert = Omit<Photo, "id" | "created_at" | "download_count">
export type QRCodeInsert = Omit<QRCode, "id" | "created_at" | "scan_count">
export type SubscriptionInsert = Omit<Subscription, "id" | "created_at" | "updated_at">
export type InvoiceInsert = Omit<Invoice, "id" | "issued_at">
export type TransactionInsert = Omit<Transaction, "id" | "created_at">
export type CouponInsert = Omit<Coupon, "id" | "created_at" | "used_count">
export type ReferralInsert = Omit<Referral, "id" | "created_at" | "reward_credited">
export type FaceInsert = Omit<Face, "id" | "created_at">
export type FaceSearchLogInsert = Omit<FaceSearchLog, "id" | "created_at">
export type AnalyticsEventInsert = Omit<AnalyticsEvent, "id" | "created_at">
export type AuditLogInsert = Omit<AuditLog, "id" | "created_at">
export type StorageUsageInsert = Omit<StorageUsage, "id" | "updated_at">;

// Database update types
export type OrganizationUpdate = Partial<OrganizationInsert>
export type UserUpdate = Partial<UserInsert>
export type EventUpdate = Partial<EventInsert>
export type GalleryUpdate = Partial<GalleryInsert>
export type PhotoUpdate = Partial<PhotoInsert>
export type QRCodeUpdate = Partial<QRCodeInsert>
export type SubscriptionUpdate = Partial<SubscriptionInsert>
export type InvoiceUpdate = Partial<InvoiceInsert>
export type TransactionUpdate = Partial<TransactionInsert>
export type CouponUpdate = Partial<CouponInsert>
export type ReferralUpdate = Partial<ReferralInsert>
export type FaceUpdate = Partial<FaceInsert>
export type FaceSearchLogUpdate = Partial<FaceSearchLogInsert>
export type AnalyticsEventUpdate = Partial<AnalyticsEventInsert>
export type AuditLogUpdate = Partial<AuditLogInsert>
export type StorageUsageUpdate = Partial<StorageUsageInsert>;