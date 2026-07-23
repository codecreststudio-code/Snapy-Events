# Snapsy - AI-Powered Event Photography & Memory Sharing Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-SSR%20Auth%20%26%20DB-emerald?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

Snapsy is a high-end, real-time event photo sharing platform designed for weddings, corporate summits, concerts, and private celebrations. It empowers event hosts and professional photographers to collect every guest candid instantly via QR codes without requiring guests to download any mobile applications.

---

## 🌟 Core Features

### 1. App-Free Instant Guest Uploads
- **Zero App Download**: Guests scan a QR code using their default smartphone camera and upload photos straight from Safari or Chrome.
- **High-Speed Roll Upload**: Supports multi-photo batch selection, live upload progress bars, and EXIF timestamp parsing.

### 2. AI Face Search & Vector Recognition
- **Instant Selfie Match**: Guests take or upload a reference selfie to instantly retrieve every event photo they appear in within under 1 second.
- **Privacy First**: Face embeddings are processed securely and isolated to each individual event capsule.

### 3. Live TV Photo Wall & Slideshow
- **Real-Time Venue Projection**: Open the Live Wall link on any venue smart TV or projector to display guest photos live as they are uploaded.
- **Moderation Queue**: Hosts and admins can toggle automatic or manual photo approval before photos hit the live screen.

### 4. Custom Branding & Watermarking
- **Photographer Protection**: Automatically apply custom logo watermarks to uploaded photos before public viewing or downloading.
- **Custom Subdomains & QR Design**: Download print-ready high-resolution SVG and PNG QR code banners for venue tables.

### 5. Full-Featured Admin & Analytics Suite
- **Platform Analytics**: Real-time dashboards tracking active events, photo uploads, storage consumption, revenue, and active users.
- **Subscriptions & Addons**: Integrated billing with Razorpay, tier management, coupon codes, and custom add-on features.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (Strict Mode)
- **Database & Auth**: Supabase PostgreSQL + Supabase SSR Auth
- **Push Notifications**: Firebase Cloud Messaging (FCM) + Web Push API
- **Styling**: Tailwind CSS + Custom Dark Luxury Design System (Playfair Display + Inter)
- **Animations**: Framer Motion (GPU hardware accelerated spring physics)
- **Icons**: Lucide React
- **Payments**: Razorpay Node SDK & Client Integration

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: `npm` or `pnpm`
- **Database**: Supabase project instance

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Snapy-Events.git
   cd Snapy-Events
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env.local` and populate the required API credentials:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Environment Configuration

| Variable Key | Description | Required |
| :--- | :--- | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Client Anon Key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin Service Key | Yes |
| `RAZORPAY_KEY_ID` | Razorpay Payment Gateway ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay Webhook & Payment Secret | Yes |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Microsoft Clarity Analytics Key | Optional |

---

## 🧪 Build & Quality Verification

Run type checks and production build validations:

```bash
# Run TypeScript compiler verification
npx tsc --noEmit

# Run production build
npm run build
```

---

## 📄 License
Commercial License - All rights reserved by Snapsy Studio.