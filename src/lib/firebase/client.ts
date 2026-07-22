"use client"

import { getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { firebaseConfig, isFirebaseConfigured } from "./config"

// Singleton app instance — Next's fast-refresh/multiple-import-path
// behavior in dev would otherwise call initializeApp() more than once,
// which Firebase throws on.
let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null
  if (!isFirebaseConfigured()) return null
  if (app) return app
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  return app
}

// `firebase/messaging`'s isSupported() checks for ServiceWorker + Notification
// + PushManager APIs — false on e.g. Safari < 16.4, non-browser/SSR contexts,
// and browsers with notifications disabled at the OS level. Always check
// this before touching anything in use-push-notifications.ts.
export async function isMessagingSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!isFirebaseConfigured()) return false
  const { isSupported } = await import("firebase/messaging")
  return isSupported()
}
