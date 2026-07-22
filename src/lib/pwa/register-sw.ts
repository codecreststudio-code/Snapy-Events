"use client"

import { useEffect, useState, useCallback } from "react"

interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | null
  updateAvailable: boolean
  applyUpdate: () => void
}

// Registers public/sw.js and surfaces a controlled "update available" state
// instead of silently activating a new version underneath an open tab. The
// SW itself never calls self.skipWaiting() on install (see sw.js) — it waits
// for this hook to postMessage("SKIP_WAITING") once the caller (PwaProvider)
// has shown the user something and they've chosen to refresh.
export function useServiceWorkerRegistration(): ServiceWorkerState {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    // Service workers require a secure context (https, or localhost in dev).
    if (!window.isSecureContext) return

    let cancelled = false

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return
        setRegistration(reg)

        // A waiting worker already exists (e.g. this tab was opened after an
        // update installed in another tab) — surface it immediately.
        if (reg.waiting) setUpdateAvailable(true)

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // A previous SW was already controlling the page, so this is a
              // genuine update (not the very first install) — safe to flag.
              setUpdateAvailable(true)
            }
          })
        })
      })
      .catch((err) => {
        console.warn("[pwa] service worker registration failed", err)
      })

    // Once the new SW takes control, reload so the page picks up whatever
    // fresh JS/CSS bundle it now expects instead of running old app code
    // against a new SW's caching rules.
    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage("SKIP_WAITING")
    }
  }, [registration])

  return { registration, updateAvailable, applyUpdate }
}
