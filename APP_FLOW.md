# Snapsy - User Journey & End-to-End Application Flows

This document outlines the step-by-step user experience and system execution flows for Hosts, Guests, Photographers, and Platform Administrators.

---

## 🎭 1. Host Journey: Setting Up an Event Capsule

```mermaid
sequenceDiagram
    autonumber
    actor Host
    participant App as Snapsy Web UI
    participant API as Next.js API
    participant DB as Supabase DB

    Host->>App: Clicks "Get Started Free" / Logs in
    App->>Host: Renders /dashboard/events/new
    Host->>App: Enters Event Title, Date, Subdomain & Watermark
    App->>API: POST /api/events
    API->>DB: Insert Event record + generate QR code slug
    DB--->API: Event created successfully
    API--->App: Returns Event object + QR code vector
    App->>Host: Redirects to /dashboard/events/[slug]
    Host->>App: Downloads SVG/PNG QR Code for venue tables
```

---

## 📱 2. Guest Journey: Scanning, Uploading & AI Search

```mermaid
sequenceDiagram
    autonumber
    actor Guest
    participant Camera as Mobile Browser
    participant API as Next.js API
    participant Storage as Supabase Storage
    participant AI as AI Face Indexer

    Guest->>Camera: Scans Table QR Code
    Camera->>API: GET /event/[slug] (No App Download Needed)
    API--->Camera: Renders Mobile Upload Portal
    Guest->>Camera: Selects photos from Camera Roll & taps "Upload"
    Camera->>Storage: Direct multipart upload to event bucket
    Storage--->API: Trigger photo indexed webhook
    API->>AI: Extracts face vector embeddings
    Guest->>Camera: Taps "Find My Photos" & snaps selfie
    Camera->>API: POST /api/ai/faces/search (selfie vector)
    API->>AI: Vector dot-product match against event index
    AI--->API: Returns matched photo IDs (< 1 sec)
    API--->Camera: Displays personalized photo gallery
```

---

## 🎥 3. Venue Live Stream: Photo Wall Display

1. Host opens `/event/[slug]/qr` or Live Wall view on a venue Smart TV or Projector.
2. The Live Wall subscribes to Supabase Realtime changes on `photos` table.
3. As guests upload photos from their tables, new approved photos animate smoothly onto the big screen in real time.

---

## 🛡️ 4. Administrator Journey: System Governance

1. Admin signs in at `/admin/login`.
2. Middleware (`src/proxy.ts`) verifies user identity and checks `users.is_admin` flag.
3. Admin gains access to `/admin` suite for managing user accounts, checking revenue analytics, moderating reported photos, and managing subscription plans.
