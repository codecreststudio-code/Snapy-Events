"use client"

import { motion } from "framer-motion"
import { Check, ChevronDown, Plus, SquareArrowUp } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog"
import { Button } from "@/lib/components/ui/button"
import { fadeInUp, staggerContainer, tapScaleSubtle } from "@/lib/motion/tokens"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"

const MotionButton = motion(Button)

const STEPS = [
  { icon: SquareArrowUp, text: "Tap the Share icon in Safari's toolbar" },
  { icon: Plus, text: <>Tap <strong className="text-ink">Add to Home Screen</strong></> },
  { icon: Check, text: <>Tap <strong className="text-ink">Add</strong> to finish</> },
]

export function IosInstallModal({
  open,
  onOpenChange,
  dismissIosHint,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dismissIosHint: () => void
}) {
  const prefersReducedMotion = useReducedMotion()

  function handleGotIt() {
    dismissIosHint()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing via Escape/outside-click/close-button is equally "seen
        // it, done" — this hint only ever shows once regardless of how it
        // was closed.
        if (!next) dismissIosHint()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-[420px] rounded-3xl sm:rounded-3xl border border-white/10 bg-[#080808] text-white">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-3 h-16 w-16 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
            <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
          </div>
          <DialogTitle className="font-playfair text-2xl font-medium text-white">Add Snapsy to Your Home Screen</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Install Snapsy for one-tap access — right from Safari, in three steps.
          </DialogDescription>
        </DialogHeader>

        <motion.ol
          className="flex flex-col items-center gap-2 pt-5"
          initial={prefersReducedMotion ? false : "hidden"}
          animate="visible"
          variants={staggerContainer(0.1)}
        >
          {STEPS.map((step, i) => (
            <motion.li key={i} variants={fadeInUp} className="flex w-full flex-col items-center gap-2">
              <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/20">
                  <step.icon className="h-4 w-4 text-white" />
                </span>
                <span>{step.text}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden />}
            </motion.li>
          ))}
        </motion.ol>

        <div className="mt-6">
          <MotionButton
            type="button"
            whileTap={tapScaleSubtle}
            onClick={handleGotIt}
            className="w-full h-11 rounded-full text-base font-semibold bg-white hover:bg-neutral-200 text-black shadow-lg shadow-white/10"
          >
            Got it
          </MotionButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
