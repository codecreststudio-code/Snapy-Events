"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getFirebaseApp, isMessagingSupported } from "@/lib/firebase/client"
import { FIREBASE_VAPID_KEY, isFirebaseConfigured } from "@/lib/firebase/config"

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported"

interface PushNotificationsState {
  permission: PushPermissionState
  isSupported: boolean
  requestPermission: () => Promise<PushPermissionState>
}

function detectDeviceMeta() {
  const ua = navigator.userAgent
  const platform = /Android/i.test(ua)
    ? "android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "ios"
      : /Win/i.test(ua)
        ? "windows"
        : /Mac/i.test(ua)
          ? "macos"
          : /Linux/i.test(ua)
            ? "linux"
            : "unknown"

  const browser = /Edg\//.test(ua)
    ? "edge"
    : /OPR\//.test(ua)
      ? "opera"
      : /Chrome\//.test(ua) && !/Edg\//.test(ua)
        ? "chrome"
        : /Firefox\//.test(ua)
          ? "firefox"
          : /Safari\//.test(ua) && !/Chrome\//.test(ua)
            ? "safari"
            : "unknown"

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const deviceType = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop"

  return { platform, browser, deviceType: isStandalone ? `${deviceType}-pwa` : deviceType }
}

async function registerDevice(token: string) {
  const meta = detectDeviceMeta()
  try {
    await fetch("/api/notifications/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...meta }),
    })
  } catch (err) {
    console.warn("[push] failed to register device token", err)
  }
}

// Requests notification permission, retrieves an FCM token (scoped to the
// service worker already registered by register-sw.ts — see public/sw.js's
// importScripts firebase-messaging-compat block for the background-message
// handler), and registers it against the signed-in user via
// /api/notifications/devices. Foreground messages (app open + focused) are
// handled here directly rather than by the service worker, per FCM's own
// behavior — background/closed-tab notifications are handled entirely in
// public/sw.js's onBackgroundMessage.
export function usePushNotifications(): PushNotificationsState {
  const [permission, setPermission] = useState<PushPermissionState>("default")
  const [isSupported, setIsSupported] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission as PushPermissionState)

    let cancelled = false
    isMessagingSupported().then((supported) => {
      if (!cancelled) setIsSupported(supported && isFirebaseConfigured())
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setupForegroundListener = useCallback(async () => {
    if (initializedRef.current) return
    initializedRef.current = true

    const app = getFirebaseApp()
    if (!app) return
    const { getMessaging, onMessage } = await import("firebase/messaging")
    const messaging = getMessaging(app)

    onMessage(messaging, (payload) => {
      // Surface via the existing toast system for a consistent look with
      // the rest of the app's notifications — full "notification center"
      // list is populated separately from the notifications table itself
      // (written server-side at send time), not from this client event.
      const title = payload.notification?.title ?? "New notification"
      const body = payload.notification?.body
      import("@/lib/components/ui/toaster").then(({ toast }) => {
        toast({ title, description: body })
      })
    })
  }, [])

  const requestPermission = useCallback(async (): Promise<PushPermissionState> => {
    if (typeof Notification === "undefined") return "unsupported"
    if (!isSupported) return "unsupported"

    const result = await Notification.requestPermission()
    setPermission(result as PushPermissionState)
    if (result !== "granted") return result as PushPermissionState

    const app = getFirebaseApp()
    if (!app || !FIREBASE_VAPID_KEY) return result as PushPermissionState

    try {
      const { getMessaging, getToken } = await import("firebase/messaging")
      const messaging = getMessaging(app)
      const registration = await navigator.serviceWorker.ready
      const token = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      })
      if (token) {
        await registerDevice(token)
        await setupForegroundListener()
      }
    } catch (err) {
      console.warn("[push] failed to get FCM token", err)
    }

    return result as PushPermissionState
  }, [isSupported, setupForegroundListener])

  // If permission was already granted in a previous session, quietly
  // re-fetch/refresh the token and foreground listener on mount instead of
  // waiting for the user to click something again.
  useEffect(() => {
    if (permission === "granted" && isSupported) {
      requestPermission()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission, isSupported])

  return { permission, isSupported, requestPermission }
}
