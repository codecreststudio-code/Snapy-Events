"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { RefreshCw } from "lucide-react"
import { useServiceWorkerRegistration } from "./register-sw"
import { useInstallPrompt } from "./use-install-prompt"
import { useIosInstallHint } from "./use-ios-install-hint"
import { InstallModal, INSTALL_DISMISSED_FOREVER_KEY } from "@/lib/components/pwa/install-modal"
import { IosInstallModal } from "@/lib/components/pwa/ios-install-modal"
import { fadeInUp } from "@/lib/motion/tokens"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"

// Short delay before either install surface can appear, so it doesn't
// compete with the guest check-in modal or other page-load onboarding UI
// for attention. Chosen to feel like a deliberate, secondary offer rather
// than something blocking the page.
const INSTALL_PROMPT_DELAY_MS = 4000

// Mounted once from the root layout. Owns:
//   1. Service worker registration + the "update available" refresh prompt.
//   2. Install-prompt UX — the Android/desktop beforeinstallprompt modal and
//      the iOS "Add to Home Screen" instructional modal, each gated by its
//      own hook and shown after a short delay so it doesn't compete with
//      other onboarding UI (e.g. GuestCaptureModal) already on the page.
// Renders no visible UI of its own beyond the update banner and (at most
// one of) the two install modals; everything else is global side-effect/
// state wiring, so this can safely sit above {children} in RootLayout
// without affecting layout/paint.
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const { updateAvailable, applyUpdate } = useServiceWorkerRegistration()
  const prefersReducedMotion = useReducedMotion()

  const { canInstall, isStandalone, promptInstall } = useInstallPrompt()
  const { shouldShowIosHint, dismissIosHint } = useIosInstallHint()

  const [showInstallModal, setShowInstallModal] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)

  useEffect(() => {
    if (!canInstall || isStandalone) return
    if (typeof window === "undefined") return

    let dismissedForever = false
    try {
      dismissedForever = window.localStorage.getItem(INSTALL_DISMISSED_FOREVER_KEY) === "true"
    } catch {
      // localStorage unavailable — fall back to showing the prompt.
    }
    if (dismissedForever) return

    const timer = setTimeout(() => setShowInstallModal(true), INSTALL_PROMPT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [canInstall, isStandalone])

  useEffect(() => {
    if (!shouldShowIosHint) return

    const timer = setTimeout(() => setShowIosModal(true), INSTALL_PROMPT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [shouldShowIosHint])

  return (
    <>
      {children}

      {/* Mutually exclusive by construction: a device firing beforeinstallprompt
          is Chromium/Android/desktop and never matches the iOS Safari detection
          below, but we still only ever mount one at a time defensively. */}
      {showInstallModal ? (
        <InstallModal open={showInstallModal} onOpenChange={setShowInstallModal} promptInstall={promptInstall} />
      ) : showIosModal ? (
        <IosInstallModal open={showIosModal} onOpenChange={setShowIosModal} dismissIosHint={dismissIosHint} />
      ) : null}

      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            variants={prefersReducedMotion ? undefined : fadeInUp}
            role="status"
            aria-live="polite"
            className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-[#3D332A] bg-[#1C1814] px-4 py-3 shadow-2xl sm:inset-x-auto sm:right-4"
          >
            <div className="flex-1 text-sm text-white">
              <p className="font-medium">Update available</p>
              <p className="text-xs text-white/60">Refresh to get the latest version.</p>
            </div>
            <button
              type="button"
              onClick={applyUpdate}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#B28DAE] px-3 py-2 text-xs font-bold text-[#141110] transition-transform hover:scale-[1.02] hover:bg-[#a468a0] active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
