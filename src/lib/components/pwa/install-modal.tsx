"use client"

import { useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Download, Wifi, Zap } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog"
import { Button } from "@/lib/components/ui/button"
import { fadeIn, fadeInUp, staggerContainer, tapScaleSubtle } from "@/lib/motion/tokens"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"

const MotionButton = motion(Button)

// localStorage flag for "never ask me again" — distinct from simply closing
// the modal (which allows it to reappear on a future visit/session).
export const INSTALL_DISMISSED_FOREVER_KEY = "snapsy_install_prompt_dismissed_forever"

// Brief window the success checkmark lingers before the modal auto-closes —
// mirrors GuestCaptureModal's confirmation pacing.
const SUCCESS_LINGER_MS = 700

const BENEFITS = [
  { icon: Zap, label: "Launch instantly from your home screen" },
  { icon: Wifi, label: "Works offline for your event's static pages" },
  { icon: Download, label: "One tap back into your events — no browser tabs to hunt for" },
]

export function InstallModal({
  open,
  onOpenChange,
  promptInstall,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">
}) {
  const [installing, setInstalling] = useState(false)
  const [success, setSuccess] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  async function handleInstall() {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)

    if (outcome === "accepted") {
      setSuccess(true)
      const lingerMs = prefersReducedMotion ? 0 : SUCCESS_LINGER_MS
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, lingerMs)
    } else {
      // "dismissed" or "unavailable" (e.g. the event expired) — just close,
      // this is a soft ask and can resurface on a future visit.
      onOpenChange(false)
    }
  }

  function handleLater() {
    onOpenChange(false)
  }

  function handleNever() {
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_FOREVER_KEY, "true")
    } catch {
      // localStorage unavailable — worst case the prompt can resurface later.
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-3xl sm:rounded-3xl border border-white/10 bg-[#080808] text-white">
        <AnimatePresence mode="wait" initial={false}>
          {success ? (
            <motion.div
              key="success"
              initial={prefersReducedMotion ? false : "hidden"}
              animate="visible"
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              variants={fadeIn}
              className="flex flex-col items-center gap-4 py-10 text-center"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 border border-white/20"
              >
                <Check className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <p className="font-playfair text-lg font-medium text-white">Installed</p>
                <p className="mt-1 text-sm text-neutral-400">Look for Snapsy on your home screen.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="content" initial={false} animate="visible" exit={prefersReducedMotion ? undefined : { opacity: 0 }}>
              <DialogHeader className="items-center text-center sm:text-center">
                <div className="mb-3 h-16 w-16 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                  <Image src="/icons/icon-192.png" alt="" width={64} height={64} className="h-full w-full object-cover" />
                </div>
                <DialogTitle className="font-playfair text-2xl font-medium text-white">Install Snapsy</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Add Snapsy to your device for the fastest way back into your events.
                </DialogDescription>
              </DialogHeader>

              <motion.ul
                className="space-y-3 pt-5"
                initial={prefersReducedMotion ? false : "hidden"}
                animate="visible"
                variants={staggerContainer(0.06)}
              >
                {BENEFITS.map(({ icon: Icon, label }) => (
                  <motion.li key={label} variants={fadeInUp} className="flex items-center gap-3 text-sm text-white">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/20">
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    {label}
                  </motion.li>
                ))}
              </motion.ul>

              <div className="mt-6 flex flex-col gap-2">
                <MotionButton
                  type="button"
                  whileTap={installing ? undefined : tapScaleSubtle}
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full h-11 rounded-full text-base font-semibold bg-white hover:bg-neutral-200 text-black shadow-lg shadow-white/10"
                >
                  {installing ? "Installing…" : "Install"}
                </MotionButton>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLater}
                    className="flex-1 h-10 rounded-full border border-hairline-dark bg-transparent text-sm text-ink hover:bg-mauve/5"
                  >
                    Later
                  </button>
                  <button
                    type="button"
                    onClick={handleNever}
                    className="flex-1 h-10 rounded-full border border-hairline-dark bg-transparent text-sm text-ink-secondary hover:bg-mauve/5 hover:text-ink"
                  >
                    Never
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
