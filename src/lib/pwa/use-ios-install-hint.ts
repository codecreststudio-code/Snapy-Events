"use client"

import { useCallback, useEffect, useState } from "react"

// "Shown once, ever" — distinct from a per-session flag, so a guest who
// dismisses this never sees it again on this device even across visits.
const IOS_HINT_SEEN_KEY = "snapsy_ios_install_hint_seen"

interface IosInstallHintState {
  shouldShowIosHint: boolean
  dismissIosHint: () => void
}

// iOS Safari has no `beforeinstallprompt` API at all — "Add to Home Screen"
// is a manual Share-sheet action only, so the best we can do is show a
// one-time instructional hint to genuine iOS Safari visitors who haven't
// already installed the app.
function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false

  const ua = navigator.userAgent
  const isIosDevice = /iPad|iPhone|iPod/.test(ua)
  if (!isIosDevice) return false

  // iOS wrapper browsers (Chrome/Firefox/Edge-on-iOS, in-app webviews, etc.)
  // all use the same WebKit UA string but tag themselves with their own
  // token — none of them expose a real "Add to Home Screen" Safari flow, so
  // exclude anything that isn't genuine Safari.
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|mercury|GSA/.test(ua)
  if (isOtherIosBrowser) return false

  // Standard `Safari` token should be present in a genuine mobile Safari UA.
  const isSafari = /Safari/.test(ua)
  if (!isSafari) return false

  // Already running installed (Safari's legacy standalone flag) — nothing to hint at.
  const alreadyInstalled = (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (alreadyInstalled) return false

  return true
}

export function useIosInstallHint(): IosInstallHintState {
  const [shouldShowIosHint, setShouldShowIosHint] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const isIosSafari = detectIosSafari()
    if (!isIosSafari) return

    const alreadySeen = window.localStorage.getItem(IOS_HINT_SEEN_KEY) === "true"
    setShouldShowIosHint(!alreadySeen)
  }, [])

  const dismissIosHint = useCallback(() => {
    setShouldShowIosHint(false)
    try {
      window.localStorage.setItem(IOS_HINT_SEEN_KEY, "true")
    } catch {
      // localStorage unavailable (private mode / disabled) — nothing further to do.
    }
  }, [])

  return { shouldShowIosHint, dismissIosHint }
}
