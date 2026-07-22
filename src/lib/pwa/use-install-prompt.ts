"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// The event the browser fires when it determines the page is installable.
// Not yet in the standard TS DOM lib, so we declare the shape we need here.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt(): Promise<void>
}

type PromptResult = "accepted" | "dismissed" | "unavailable"

interface InstallPromptState {
  canInstall: boolean
  isStandalone: boolean
  justInstalled: boolean
  promptInstall: () => Promise<PromptResult>
}

// Surfaces the `beforeinstallprompt` flow (Chromium/Android/desktop) as a
// small piece of React state instead of the raw event API. A captured event
// can only be `.prompt()`-ed once, so we hold it in a ref (not state) and
// null it out immediately after use.
export function useInstallPrompt(): InstallPromptState {
  const [canInstall, setCanInstall] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [justInstalled, setJustInstalled] = useState(false)
  const deferredEventRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    const onBeforeInstallPrompt = (event: Event) => {
      // Stop Chrome's default mini-infobar so we control if/when the install
      // UI appears — see PwaProvider for the delayed-modal presentation.
      event.preventDefault()
      deferredEventRef.current = event as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const onAppInstalled = () => {
      deferredEventRef.current = null
      setCanInstall(false)
      setJustInstalled(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<PromptResult> => {
    const event = deferredEventRef.current
    if (!event) return "unavailable"

    // A captured beforeinstallprompt event is single-use — clear it up front
    // so a rapid double-click can't attempt to replay it.
    deferredEventRef.current = null
    setCanInstall(false)

    await event.prompt()
    const { outcome } = await event.userChoice
    return outcome
  }, [])

  return {
    // Never offer to install an app the user is already running installed.
    canInstall: canInstall && !isStandalone,
    isStandalone,
    justInstalled,
    promptInstall,
  }
}
