# Snapsy - Event Photography Platform

A production-ready SaaS event photography platform built with Next.js 15, Supabase, and Razorpay.

## Features

### Phase 1: Core Event Platform
- Landing page, Pricing, Features, FAQ, Contact pages
- Event creation and management
- QR code generation for guest photo uploads
- Gallery management with photo uploads
- Guest upload functionality
- Event countdown timers
- Analytics dashboard

### Phase 2: Payments (Razorpay)
- Subscription management (Free, Starter, Standard, Premium plans)
- Invoice generation
- GST support
- Coupon system
- Referral program

### Phase 3: AI Face Search
- Face detection
- Face embeddings
- Face matching and similarity scoring

### Phase 4: Premium Features
- Live photo wall
- Slideshow mode
- Watermarking
- Custom branding

### Phase 5: Scale & Enterprise
- Multi-tenant architecture
- Team management with RBAC
- Audit logging
- Storage monitoring

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, React Query |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, Realtime) |
| Storage | Supabase Storage |
| Payments | Razorpay |
| Notifications | WhatsApp API, Resend Email |
| AI | Face API |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Razorpay account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. Set up Supabase:
   - Create a new Supabase project
   - Run the schema in `supabase/schema.sql` in the SQL Editor
   - Enable Row Level Security (RLS) on all tables

5. Run the development server:
   ```bash
   npm run dev
   ```

## Database Setup

The complete database schema is in `supabase/schema.sql`. This includes:

- Organizations (multi-tenant)
- Users with RBAC
- Events, Galleries, Photos
- QR Codes
- Subscriptions, Invoices, Transactions
- Faces and Face Search Logs
- Analytics and Audit Logs

Run this schema in your Supabase SQL Editor to initialize the database.

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add the environment variables in Vercel project settings
3. Deploy

### Supabase

1. Run `supabase/schema.sql` in your Supabase SQL Editor
2. Create storage buckets:
   - `event-covers` (public)
   - `gallery-covers` (public)
   - `photos` (private)
   - `photos-public` (public)
   - `faces` (private)
   - `avatars` (public)
   - `qr-codes` (public)

## Project Structure

```
src/
├── app/                    # Next.js 15 App Router pages
│   ├── (auth)/            # Auth pages (login, signup, etc.)
│   ├── (public)/          # Public pages (landing, pricing, etc.)
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── dashboard/         # Host dashboard
│   └── event/             # Guest event pages
├── lib/                    # Core utilities
│   ├── components/        # UI components
│   ├── hooks/             # React hooks
│   ├── types/             # TypeScript types
│   ├── validators/         # Zod schemas
│   └── supabase/          # Supabase clients
└── middleware.ts          # Auth middleware
```

## Phase 6: TypeScript Cleanup

Note: There are some TypeScript type errors that need to be cleaned up in Phase 6. The JavaScript compilation passes successfully.

## License

MIT