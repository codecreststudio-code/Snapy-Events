# Snapsy - Platform Sitemap & Route Architecture

This document provides a full map of public pages, authenticated host dashboards, guest entry portals, administrative tools, and backend API routes across the Snapsy platform.

---

## 🌐 1. Public Marketing Routes

| Path | Description | Access |
| :--- | :--- | :---: |
| `/` | Landing Page (Hero, Features, Workflows, FAQ, CTAs) | Public |
| `/features` | Platform Capabilities Bento Grid | Public |
| `/pricing` | Tiered Subscriptions & Add-on Packages | Public |
| `/about` | Story, Mission & Photographer Philosophy | Public |
| `/contact` | Host & Enterprise Support Form | Public |
| `/blog` | Articles, Guides & Event Photography Tips | Public |
| `/blog/[slug]` | Individual Blog Article View | Public |
| `/faq` | Knowledgebase & Frequently Asked Questions | Public |
| `/terms` | Terms of Service | Public |
| `/privacy` | Privacy Policy | Public |
| `/refund-policy` | Refund & Cancellation Guidelines | Public |

---

## 🔑 2. Authentication & Onboarding Routes

| Path | Description | Access |
| :--- | :--- | :---: |
| `/login` | User Sign In Portal | Guest / Unauthenticated |
| `/signup` | User Account Creation | Guest / Unauthenticated |
| `/forgot-password` | Password Recovery Request | Guest / Unauthenticated |
| `/reset-password` | Password Reset Confirmation | Token-Gated |

---

## 📸 3. Guest & Venue Portals

| Path | Description | Access |
| :--- | :--- | :---: |
| `/event/[slug]` | Event Landing & Guest Portal | Public / PIN-Gated |
| `/event/[slug]/upload` | Guest Mobile Web Photo Uploader | Public |
| `/event/[slug]/gallery` | Public / Guest Event Photo Gallery | Public |
| `/event/[slug]/qr` | Event QR Code Banner & Display View | Host / Public |
| `/event/[slug]/countdown` | Pre-Event Live Countdown Page | Public |
| `/event/scan/[code]` | Short Join Code Redirect Handler | Public |

---

## 📊 4. Host Dashboard Workspace (`/dashboard`)

| Path | Description | Access |
| :--- | :--- | :---: |
| `/dashboard` | Host Overview & Active Events | Host User |
| `/dashboard/events` | Event Management Grid | Host User |
| `/dashboard/events/new` | Create New Event Wizard | Host User |
| `/dashboard/events/[slug]` | Individual Event Control Center | Host User |
| `/dashboard/events/[slug]/gallery` | Host Photo Moderation & Approval Queue | Host User |
| `/dashboard/events/[slug]/qr` | Print-Ready QR Code Generator | Host User |
| `/dashboard/billing` | Subscription, Invoices & Upgrades | Host User |
| `/dashboard/settings` | Host Account & Watermark Settings | Host User |

---

## 🛡️ 5. Admin Control Center (`/admin`)

| Path | Description | Access |
| :--- | :--- | :---: |
| `/admin/login` | Admin Dedicated Sign In | Public |
| `/admin` | Executive Overview & Key Metrics | System Admin |
| `/admin/users` | User Account Management | System Admin |
| `/admin/events` | Platform-Wide Event Moderation | System Admin |
| `/admin/photos` | Global Photo Storage Inspection | System Admin |
| `/admin/revenue` | Revenue Analytics & Financial Reports | System Admin |
| `/admin/subscriptions` | Pricing Plans & Feature Toggles | System Admin |
| `/admin/audit-logs` | System Audit & Security Trail | System Admin |

---

## ⚡ 6. API Route Reference

### Authentication API
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Events & Uploads API
- `POST /api/events/join`
- `GET /api/events/[id]`
- `POST /api/photos/upload`
- `GET /api/ai/faces/search`

### Public Config API
- `GET /api/firebase-config`
