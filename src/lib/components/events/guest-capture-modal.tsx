"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { logGuestAccess } from "@/app/actions/guest"
import { fadeIn, fadeInUp, staggerContainer, tapScaleSubtle } from "@/lib/motion/tokens"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"

const MotionButton = motion(Button)

// Brief window the "Welcome in" checkmark stays visible before the dialog
// actually closes — long enough to register as a deliberate confirmation,
// short enough not to feel like it's blocking the guest from the capsule.
const SUCCESS_LINGER_MS = 650

export function GuestCaptureModal({
  eventId,
  eventName,
  requireJoinCode = false,
}: {
  eventId: string
  eventName: string
  // Host toggle (Event Settings -> Capsule Locks & Limits ->
  // settings.require_join_code) — when on, a guest must also supply the
  // event's join code before check-in succeeds. Enforced server-side in
  // logGuestAccess regardless of what this prop is set to; it only controls
  // whether the field is shown/required in this form.
  requireJoinCode?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // Check if the guest has already checked in to this event
    const guestSession = localStorage.getItem(`snapsy_guest_${eventId}`)
    if (!guestSession) {
      setOpen(true)
    }
  }, [eventId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const cleanMobile = mobile.trim()
    const cleanCode = joinCode.trim()

    if (!cleanName || !cleanEmail || !cleanMobile) {
      toast({
        title: "All Fields Required",
        description: "Please fill in your Name, Mobile Number, and Email Address to enter the memory capsule.",
        variant: "destructive",
      })
      return
    }

    if (requireJoinCode && !cleanCode) {
      toast({
        title: "Event Code Required",
        description: "Ask your host for the event's join code and enter it below.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    // Log the access in the database for the event timeline and marketing
    // retargeting leads — this also performs the actual join-code check
    // server-side when the host requires one. Only persist to localStorage
    // (and grant the "already checked in" fast path) once it succeeds.
    const result = await logGuestAccess(eventId, { name: cleanName, email: cleanEmail, mobile: cleanMobile }, cleanCode || undefined)

    setLoading(false)
    if (result.success) {
      // Save locally for persistence across uploads
      localStorage.setItem(`snapsy_guest_${eventId}`, JSON.stringify({ name: cleanName, email: cleanEmail, mobile: cleanMobile }))

      // Also save globally for auto-filling upload forms
      localStorage.setItem("snapsy_last_guest_name", cleanName)
      localStorage.setItem("snapsy_last_guest_email", cleanEmail)

      // Show a brief success state (checkmark) instead of closing the
      // instant the server call resolves — gives the check-in a moment of
      // deliberate confirmation before handing the guest into the capsule.
      // All the actual state changes (open/toast/refresh) still happen the
      // same way, just after a short, skippable-by-reduced-motion delay.
      setSuccess(true)
      const lingerMs = prefersReducedMotion ? 0 : SUCCESS_LINGER_MS
      setTimeout(() => {
        setOpen(false)
        toast({ title: "Welcome!", description: `Enjoy the ${eventName} memory capsule.` })
        router.refresh()
      }, lingerMs)
    } else {
      toast({ title: "Check-in failed", description: result.error, variant: "destructive" })
    }
  }

  // Check-in gating is enforced server-side; the dialog must still be closable
  // by keyboard/AT users (WCAG 2.1.2 — no keyboard trap). We keep click-outside
  // disabled to discourage accidental dismissal, but ESC and the close button work.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[425px] rounded-2xl sm:rounded-2xl border border-[#e5dfd0] bg-[#ffffff] text-ink max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
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
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#b8925a]/15 border border-[#b8925a]/30"
              >
                <Check className="h-8 w-8 text-[#b8925a]" />
              </motion.div>
              <div>
                <p className="font-playfair text-lg font-medium text-ink">You&apos;re checked in</p>
                <p className="mt-1 text-sm text-ink-secondary">Opening the memory capsule…</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={false} animate="visible" exit={prefersReducedMotion ? undefined : { opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="font-playfair text-2xl font-medium text-ink">Welcome to {eventName}</DialogTitle>
                <DialogDescription className="text-ink-secondary">
                  {requireJoinCode
                    ? "Please check in with your details and the event code your host shared with you."
                    : "Please check in with your details to view the memory capsule and share your photos."}
                </DialogDescription>
              </DialogHeader>

              <motion.form
                onSubmit={handleSubmit}
                className="space-y-4 pt-4"
                initial={prefersReducedMotion ? false : "hidden"}
                animate="visible"
                variants={staggerContainer(0.06)}
              >
                <motion.div variants={fadeInUp} className="space-y-2">
                  <Label htmlFor="guestName" className="text-white font-semibold text-xs">Your Name <span className="text-white/60">*</span></Label>
                  <Input
                    id="guestName"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border-white/10 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-white/50 rounded-2xl py-3"
                  />
                </motion.div>

                <motion.div variants={fadeInUp} className="space-y-2">
                  <Label htmlFor="guestMobile" className="text-white font-semibold text-xs">Mobile Number <span className="text-white/60">*</span></Label>
                  <Input
                    id="guestMobile"
                    type="tel"
                    placeholder="e.g. +1 234 567 890"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="border-white/10 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-white/50 rounded-2xl py-3"
                  />
                </motion.div>

                <motion.div variants={fadeInUp} className="space-y-2">
                  <Label htmlFor="guestEmail" className="text-white font-semibold text-xs">Email Address <span className="text-white/60">*</span></Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-white/10 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-white/50 rounded-2xl py-3"
                  />
                </motion.div>

                {requireJoinCode && (
                  <motion.div variants={fadeInUp} className="space-y-2">
                    <Label htmlFor="guestJoinCode" className="text-white font-semibold text-xs">Event Code <span className="text-white/60">*</span></Label>
                    <Input
                      id="guestJoinCode"
                      placeholder="e.g. 8DM6KC"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      required
                      maxLength={8}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className="border-white/10 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-white/50 font-mono tracking-[0.2em] uppercase rounded-2xl py-3"
                    />
                    <p className="text-xs text-neutral-400">Ask your host for this event's join code.</p>
                  </motion.div>
                )}

                <motion.div variants={fadeInUp} className="pt-4">
                  <MotionButton
                    type="submit"
                    whileTap={loading ? undefined : tapScaleSubtle}
                    className="w-full h-11 rounded-full text-base font-semibold bg-white hover:bg-neutral-200 text-black shadow-lg shadow-white/10"
                    disabled={loading || !name.trim() || !mobile.trim() || !email.trim() || (requireJoinCode && !joinCode.trim())}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking in...
                      </span>
                    ) : (
                      "Enter Capsule"
                    )}
                  </MotionButton>
                </motion.div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
