import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})

export const createEventSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters").max(200),
  description: z.string().max(2000).optional(),
  event_type: z.string().optional(),
  event_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  venue: z.string().max(500).optional(),
  timezone: z.string().default("UTC"),
  status: z.enum(["draft", "published", "completed", "archived"]).optional(),
  settings: z.object({
    is_public: z.boolean().default(true),
    password_protected: z.boolean().default(false),
    password: z.string().optional(),
    allow_guest_uploads: z.boolean().default(true),
    auto_approve_photos: z.boolean().default(false),
    enable_countdown: z.boolean().default(false),
    countdown_date: z.string().datetime().optional(),
  }).optional(),
})

export const updateEventSchema = createEventSchema.partial()

export const createGallerySchema = z.object({
  name: z.string().min(2, "Gallery name must be at least 2 characters").max(200),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().default(true),
  reveal_at: z.string().datetime().optional(),
  reveal_enabled: z.boolean().default(false),
  settings: z.object({
    allow_uploads: z.boolean().default(true),
    allow_downloads: z.boolean().default(false),
    show_exif: z.boolean().default(false),
    enable_lightbox: z.boolean().default(true),
  }).optional(),
})

export const updateGallerySchema = createGallerySchema.partial()

export const createQRCodeSchema = z.object({
  gallery_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100).optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

export const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  avatar_url: z.string().url().optional().nullable(),
  role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
  permissions: z.array(z.string()).optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const subscribeSchema = z.object({
  plan_id: z.string().min(1),
  payment_method_id: z.string().optional(),
  coupon_code: z.string().optional(),
})

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
})

export const uploadPhotoSchema = z.object({
  gallery_id: z.string().uuid(),
  filename: z.string(),
  mime_type: z.string(),
  file_size: z.number().max(50 * 1024 * 1024), // 50MB
})

export const faceSearchSchema = z.object({
  photo_id: z.string().uuid().optional(),
  image_data: z.string().optional(), // base64 encoded image
  gallery_id: z.string().uuid().optional(),
  max_results: z.number().min(1).max(100).default(20),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type CreateGalleryInput = z.infer<typeof createGallerySchema>
export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>
export type CreateQRCodeInput = z.infer<typeof createQRCodeSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type SubscribeInput = z.infer<typeof subscribeSchema>
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>
export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>
export type FaceSearchInput = z.infer<typeof faceSearchSchema>