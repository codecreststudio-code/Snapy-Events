// Snapsy service worker — hand-written (no next-pwa/workbox dependency).
// Import Firebase compat scripts synchronously at initial worker evaluation time per W3C SW specification.
try {
  importScripts("https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/11.2.0/firebase-messaging-compat.js");
} catch (err) {
  console.warn("[sw] firebase scripts import skipped", err);
}

const CACHE_VERSION = "v1";
const STATIC_CACHE = `snapsy-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// ─── Firebase Cloud Messaging — background notifications ──────────────────
// Firebase config is loaded dynamically from /api/firebase-config or via postMessage
// to avoid hardcoding project API keys or credentials in static public files, preventing secret scanner alerts.
let firebaseMessagingInitialized = false;

function initFirebaseMessaging(config) {
  if (firebaseMessagingInitialized) return;
  if (!config || !config.apiKey || !config.projectId) return;
  if (typeof firebase === "undefined") return;

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();

    // Fires when a push arrives while no tab has focus (app closed, or open
    // but backgrounded) — foreground messages are instead handled in
    // src/lib/pwa/use-push-notifications.ts via onMessage(), per FCM's own
    // split between the two. `payload.data.url` (set server-side in
    // src/lib/integrations/push.ts) is what notificationclick below uses for
    // deep linking.
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || "Snapsy";
      const body = payload.notification?.body || "";
      const url = payload.data?.url || "/dashboard";
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        data: { url },
        tag: payload.data?.tag || undefined,
      });
    });
    firebaseMessagingInitialized = true;
  } catch (err) {
    console.warn("[sw] firebase messaging init error", err);
  }
}

// Fetch Firebase Web config dynamically from server
fetch("/api/firebase-config")
  .then((res) => (res.ok ? res.json() : null))
  .then((config) => {
    if (config) initFirebaseMessaging(config);
  })
  .catch((err) => {
    console.warn("[sw] firebase config fetch skipped", err);
  });

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// Precached at install time — small, high-value, rarely-changing assets.
// Next's own content-hashed JS/CSS bundles are intentionally NOT listed
// here (their filenames change every deploy, so precaching them by name is
// pointless); they're picked up by the runtime cache-first rule below the
// first time each one is actually requested.
const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/Logo.png",
  "/Favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        // Never let a single missing precache URL (e.g. a renamed asset)
        // brick installation of the whole service worker.
        console.warn("[sw] precache failed", err);
      })
  );
  // Don't self.skipWaiting() unconditionally here — the registration hook
  // (src/lib/pwa/register-sw.ts) controls the update flow explicitly via
  // postMessage("SKIP_WAITING") once the user has been told an update is
  // ready, so an open tab is never silently swapped out from under it.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("snapsy-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "SET_FIREBASE_CONFIG" && event.data.config) {
    initFirebaseMessaging(event.data.config);
  }
});

// Same-origin static-asset allowlist. Matched against pathname only (query
// strings — e.g. Next's cache-busting `?v=` — are ignored for the match but
// kept in the actual cache key via the full request).
function isCacheableStaticAsset(pathname) {
  if (pathname.startsWith("/_next/static/")) return true; // content-hashed JS/CSS/fonts — immutable
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/splash/")) return true;
  if (pathname === "/manifest.webmanifest") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/browserconfig.xml") return true;
  if (/^\/(Logo|Favicon|logo_png|logo_png-white|logo-email|logo-email-white)\.png$/.test(pathname)) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever intercept same-origin GET requests. Everything else (POST
  // uploads, cross-origin Supabase calls, payment webhooks, etc.) is left
  // completely alone — no event.respondWith() means the browser handles it
  // exactly as if this service worker weren't installed.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept dynamic/authenticated/data surfaces, even ones that
  // happen to respond to GET. Explicit belt-and-suspenders on top of the
  // allowlist below (which would already exclude these), so this list is
  // the actual product-requirement source of truth if either list is ever
  // edited independently.
  const NEVER_INTERCEPT_PREFIXES = ["/api/", "/auth", "/dashboard", "/admin", "/event/"];
  if (NEVER_INTERCEPT_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  // Navigations (typing a URL, following a link, opening the installed
  // app): try the network first so logged-in/dynamic content is always
  // fresh; only fall back to a cached page when genuinely offline, and
  // only the marketing landing page is served from cache — every other
  // route falls back to the generic offline page rather than a stale copy
  // of a page that may contain per-user data.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        if (url.pathname === "/") {
          return (await cache.match("/")) || (await cache.match(OFFLINE_URL));
        }
        return (await cache.match(OFFLINE_URL)) || Response.error();
      })
    );
    return;
  }

  if (!isCacheableStaticAsset(url.pathname)) return;

  // Cache-first for static assets: they're either content-hashed
  // (_next/static) or brand assets that rarely change, so serving instantly
  // from cache and refreshing in the background is the right trade-off.
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => undefined);

      return cached || networkFetch || Response.error();
    })
  );
});

// Background Sync scaffold: not yet wired to the guest upload pipeline (see
// src/lib/components/events/camera-capture.tsx / upload/page.tsx, which
// already have their own careful in-memory retry/undo queue). Registering
// the listener here means the moment that pipeline is extended to persist
// pending uploads to IndexedDB, this can request/replay them — it's
// intentionally a no-op today rather than a half-integrated feature that
// could silently drop or double-send a guest's photo.
self.addEventListener("sync", (event) => {
  if (event.tag === "snapsy-retry-uploads") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SNAPSY_SYNC_RETRY_UPLOADS" }));
      })
    );
  }
});
