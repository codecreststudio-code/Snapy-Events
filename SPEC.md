# Snapsy - Production SaaS Event Platform Specification

## 1. Concept & Vision

**Snapsy** is an enterprise-grade SaaS event photography platform enabling hosts to create events, generate QR codes for guest photo uploads, manage galleries, and leverage AI-powered face search. The platform targets wedding photographers, event managers, and enterprises managing large photo collections.

**Core Principle:** Build the complete architecture from day one. Feature flags hide Phase 2-5 capabilities until enabled.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, React Query |
| Backend | Supabase (PostgreSQL, Edge Functions, Realtime, Auth) |
| Storage | Supabase Storage |
| Payments | Razorpay (Subscriptions, Invoices, Webhooks) |
| Notifications | WhatsApp API, Resend Email |
| AI | Face API (Face Detection, Embeddings, Matching), OpenAI-ready |
| Hosting | Vercel |

---

## 3. Architecture

### 3.1 Multi-Tenant SaaS Architecture

```
tenants/
├── organizations (multi-tenant root)
├── users (belong to organizations)
├── events (belong to organizations)
└── feature_flags (per-org toggles)
```

### 3.2 Feature Flags (Phase Control)

| Flag | Phase | Description |
|------|-------|-------------|
| `PAYMENTS_ENABLED` | 2 | Razorpay integration |
| `AI_FACE_SEARCH` | 3 | Face detection & matching |
| `PREMIUM_FEATURES` | 4 | Live wall, slideshow, etc. |
| `ENTERPRISE_SCALE` | 5 | Multi-tenant, audit logs |

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Organizations (Tenants)
organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  feature_flags JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Users
users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member', -- owner, admin, member, viewer
  permissions JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Events
events (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  host_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  event_type TEXT, -- wedding, birthday, corporate, etc.
  event_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  venue TEXT,
  timezone TEXT DEFAULT 'UTC',
  cover_image_url TEXT,
  settings JSONB DEFAULT '{}', -- visibility, password protection, etc.
  status TEXT DEFAULT 'draft', -- draft, published, completed, archived
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Galleries
galleries (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  reveal_at TIMESTAMPTZ, -- scheduled reveal time
  reveal_enabled BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  photo_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Photos
photos (
  id UUID PRIMARY KEY,
  gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size INT,
  width INT,
  height INT,
  metadata JSONB DEFAULT '{}',
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  face_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- QR Codes
qr_codes (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  gallery_id UUID REFERENCES galleries(id),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  redirect_url TEXT,
  scan_count INT DEFAULT 0,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Photo Access (Guest sessions)
photo_access (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  gallery_id UUID REFERENCES galleries(id),
  session_token TEXT UNIQUE NOT NULL,
  guest_name TEXT,
  guest_email TEXT,
  permissions JSONB DEFAULT '[]',
  accessed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
)
```

### 4.2 Payments (Phase 2)

```sql
-- Plans
plans (
  id TEXT PRIMARY KEY, -- free, starter, standard, premium
  name TEXT NOT NULL,
  description TEXT,
  price_inr INT NOT NULL,
  price_usd INT NOT NULL,
  billing_interval TEXT DEFAULT 'monthly', -- monthly, yearly
  features JSONB NOT NULL,
  limits JSONB NOT NULL, -- events_limit, storage_limit_gb, photo_limit, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Subscriptions
subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  plan_id TEXT REFERENCES plans(id),
  razorpay_subscription_id TEXT UNIQUE,
  razorpay_customer_id TEXT,
  status TEXT DEFAULT 'active', -- active, cancelled, past_due, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Invoices
invoices (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  subscription_id UUID REFERENCES subscriptions(id),
  razorpay_invoice_id TEXT UNIQUE,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'created', -- created, sent, paid, failed, refunded
  currency TEXT DEFAULT 'INR',
  subtotal INT NOT NULL,
  tax INT DEFAULT 0,
  total INT NOT NULL,
  paid_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ
)

-- Transactions
transactions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  invoice_id UUID REFERENCES invoices(id),
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  amount INT NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending', -- pending, success, failed, refunded
  payment_method TEXT,
  gateway_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Coupons
coupons (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- percentage, fixed
  discount_value INT NOT NULL,
  min_subscription_months INT DEFAULT 1,
  max_uses INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Referrals
referrals (
  id UUID PRIMARY KEY,
  referrer_org_id UUID REFERENCES organizations(id),
  referred_org_id UUID REFERENCES organizations(id),
  coupon_id UUID REFERENCES coupons(id),
  status TEXT DEFAULT 'pending', -- pending, completed, rewarded
  reward_credited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### 4.3 AI Face Search (Phase 3)

```sql
-- Faces
faces (
  id UUID PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  bounding_box JSONB NOT NULL, -- {x, y, width, height}
  confidence FLOAT NOT NULL,
  embedding_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Face Search Logs
face_search_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  search_type TEXT NOT NULL, -- upload, gallery
  query_photo_id UUID REFERENCES photos(id),
  results JSONB NOT NULL, -- [{photo_id, similarity, face_id}]
  search_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### 4.4 Analytics & Audit (Phase 5)

```sql
-- Analytics Events
analytics_events (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Audit Logs
audit_logs (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Storage Usage
storage_usage (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  total_bytes BIGINT DEFAULT 0,
  photo_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

---

## 5. API Architecture

### 5.1 API Routes

```
app/api/
├── auth/
│   ├── signup/route.ts
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── refresh/route.ts
│   └── me/route.ts
├── organizations/
│   ├── route.ts (GET, POST)
│   └── [id]/route.ts (GET, PUT, DELETE)
├── users/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, PUT, DELETE)
│   └── me/route.ts
├── events/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, PUT, DELETE)
│   ├── [id]/analytics/route.ts
│   └── [id]/qr-codes/route.ts
├── galleries/
│   ├── route.ts (GET, POST)
│   ├── [id]/route.ts (GET, PUT, DELETE)
│   └── [id]/photos/route.ts (GET, POST)
├── photos/
│   ├── [id]/route.ts (GET, DELETE)
│   ├── [id]/approve/route.ts
│   └── upload/route.ts
├── qr/
│   ├── scan/[code]/route.ts
│   └── generate/route.ts
├── payments/
│   ├── subscriptions/route.ts
│   ├── invoices/route.ts
│   ├── webhooks/razorpay/route.ts
│   └── coupons/validate/route.ts
├── ai/
│   ├── faces/detect/route.ts
│   ├── faces/search/route.ts
│   └── faces/batch-process/route.ts
├── analytics/
│   ├── events/route.ts
│   └── dashboard/route.ts
└── admin/
    ├── users/route.ts
    ├── events/route.ts
    ├── revenue/route.ts
    └── storage/route.ts
```

### 5.2 Response Format

```typescript
// Success
{ success: true, data: T, meta?: { pagination } }

// Error
{ success: false, error: { code: string, message: string, details?: any } }
```

---

## 6. Pages Architecture

### 6.1 Public Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/pricing` | Pricing plans |
| `/features` | Feature showcase |
| `/faq` | FAQ page |
| `/contact` | Contact form |
| `/terms` | Terms of service |
| `/privacy` | Privacy policy |
| `/refund-policy` | Refund policy |

### 6.2 Auth Pages

| Route | Description |
|-------|-------------|
| `/login` | Login page |
| `/signup` | Signup page |
| `/forgot-password` | Password reset |
| `/reset-password` | Password reset confirm |

### 6.3 Host Dashboard (`/dashboard`)

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview with stats |
| `/dashboard/events` | Event list |
| `/dashboard/events/[slug]/edit` | Edit event |
| `/dashboard/events/new` | Create event |
| `/dashboard/events/[slug]/qr` | QR management |
| `/dashboard/events/[slug]/gallery` | Gallery management |
| `/dashboard/events/[slug]/analytics` | Event analytics |
| `/dashboard/events/[slug]/guests` | Guest management |
| `/dashboard/galleries` | All galleries |
| `/dashboard/settings` | Organization settings |
| `/dashboard/billing` | Billing & subscription |
| `/dashboard/team` | Team management |
| `/dashboard/downloads` | Download center |

### 6.4 Guest Pages (`/event/[slug]`)

| Route | Description |
|-------|-------------|
| `/event/[slug]` | Event landing |
| `/event/[slug]/gallery` | Photo gallery |
| `/event/[slug]/upload` | Upload photos |
| `/event/[slug]/camera` | Camera capture |
| `/event/[slug]/search` | AI face search |
| `/event/[slug]/countdown` | Reveal countdown |

### 6.5 Admin Pages (`/admin`)

| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/admin/login` | Admin login |
| `/admin/users` | User management |
| `/admin/events` | Event management |
| `/admin/revenue` | Revenue dashboard |
| `/admin/subscriptions` | Subscription management |
| `/admin/storage` | Storage monitoring |
| `/admin/ai-usage` | AI usage dashboard |
| `/admin/settings` | Platform settings |

---

## 7. Authentication & Authorization

### 7.1 Auth Flow

- Supabase Auth with email/password
- JWT tokens with refresh rotation
- Session management via cookies
- Role-based access control (RBAC)

### 7.2 Roles & Permissions

| Role | Permissions |
|------|-------------|
| `owner` | Full access, billing, delete org |
| `admin` | Manage users, events, settings |
| `member` | Create/manage own events |
| `viewer` | Read-only access |

### 7.3 Permission Matrix

```typescript
const permissions = {
  owner: ['*'],
  admin: ['events:*', 'galleries:*', 'users:read', 'analytics:read', 'billing:read'],
  member: ['events:create', 'events:read', 'events:update', 'galleries:*', 'analytics:read'],
  viewer: ['events:read', 'galleries:read']
}
```

---

## 8. Storage Architecture

### 8.1 Buckets

| Bucket | Public | Description |
|--------|--------|-------------|
| `event-covers` | Yes | Event cover images |
| `gallery-covers` | Yes | Gallery cover images |
| `photos` | No | Event photos (private) |
| `photos-public` | Yes | Public gallery photos |
| `faces` | No | Face embeddings |
| `avatars` | Yes | User avatars |
| `qr-codes` | Yes | Generated QR codes |

### 8.2 Storage Rules

- Signed URLs for private photos (1 hour expiry)
- Image transformations via Supabase
- Automatic thumbnail generation

---

## 9. Billing Architecture (Razorpay)

### 9.1 Plan Tiers

| Plan | Price (INR/mo) | Events | Storage | Features |
|------|---------------|--------|---------|----------|
| Free | 0 | 1 | 1 GB | Basic |
| Starter | 499 | 5 | 10 GB | + QR codes |
| Standard | 1499 | 25 | 100 GB | + Analytics |
| Premium | 3999 | Unlimited | 1 TB | + AI Search |

### 9.2 Billing Flow

1. User selects plan → Creates Razorpay Customer
2. Creates Subscription with plan
3. Handles `subscription.authorized` webhook
4. Generates invoice on `invoice.paid`
5. Handles failures, retries, cancellations

---

## 10. WhatsApp Integration

### 10.1 Notification Types

| Template | Trigger |
|----------|---------|
| `event_created` | Host creates event |
| `photo_uploaded` | Guest uploads photo |
| `gallery_revealed` | Host reveals gallery |
| `photo_approved` | Host approves photo |

### 10.2 Implementation

- Message templates approved via WhatsApp Business API
- Dynamic parameters for personalization
- Opt-out handling

---

## 11. AI Face Search Architecture

### 11.1 Flow

1. Photo upload → Face detection (bounding boxes)
2. Extract face regions → Generate embeddings
3. Store embeddings in `faces` table
4. Search: Input photo → Get embedding → Cosine similarity search
5. Return top-k matches with similarity scores

### 11.2 Thresholds

| Threshold | Action |
|-----------|--------|
| > 0.8 | Auto-match |
| 0.6 - 0.8 | Review suggested |
| < 0.6 | No match |

---

## 12. Deployment Architecture

### 12.1 Vercel Setup

- Next.js 15 App Router
- Edge Functions for low-latency
- ISR for static pages
- Image Optimization

### 12.2 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
WHATSAPP_BUSINESS_API_KEY=
RESEND_API_KEY=
FACE_API_KEY=
SENTRY_DSN=
```

---

## 13. Security

### 13.1 Rate Limiting

- API: 100 req/min per user
- Upload: 50 photos/min per event
- Search: 20 searches/min per user

### 13.2 Security Headers

```typescript
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=self, microphone=self'
}
```

### 13.3 SQL Injection Prevention

- Prepared statements via Supabase client
- Input validation with Zod
- Row-level security (RLS) policies

---

## 14. Monitoring & Observability

### 14.1 Sentry Integration

- Error tracking
- Performance monitoring
- Session replay

### 14.2 Custom Metrics

- API latency percentiles
- Photo upload success rate
- Face search accuracy

---

## 15. Production Checklist

- [ ] All environment variables configured
- [ ] Supabase RLS policies enabled
- [ ] Razorpay webhooks verified
- [ ] WhatsApp templates approved
- [ ] Sentry error tracking active
- [ ] CDN caching configured
- [ ] Rate limiting configured
- [ ] SSL certificates active
- [ ] Email deliverability tested
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed
- [ ] SEO meta tags complete
- [ ] TypeScript strict mode
- [ ] No console errors
- [ ] Build succeeds on Vercel