"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { logGuestAccess } from "@/app/actions/guest"

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
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const router = useRouter()

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

      setOpen(false)
      toast({ title: "Welcome!", description: `Enjoy the ${eventName} memory capsule.` })
      router.refresh()
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
        className="sm:max-w-[425px] rounded-2xl sm:rounded-2xl border border-[#3D332A] bg-[#1C1814] text-white/90 max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-playfair text-2xl font-medium text-white">Welcome to {eventName}</DialogTitle>
          <DialogDescription className="text-white/60">
            {requireJoinCode
              ? "Please check in with your details and the event code your host shared with you."
              : "Please check in with your details to view the memory capsule and share your photos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="guestName" className="text-white/80">Your Name <span className="text-[#B28DAE]">*</span></Label>
            <Input
              id="guestName"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#B28DAE]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestMobile" className="text-white/80">Mobile Number <span className="text-[#B28DAE]">*</span></Label>
            <Input
              id="guestMobile"
              type="tel"
              placeholder="e.g. +1 234 567 890"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#B28DAE]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestEmail" className="text-white/80">Email Address <span className="text-[#B28DAE]">*</span></Label>
            <Input
              id="guestEmail"
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#B28DAE]"
            />
          </div>

          {requireJoinCode && (
            <div className="space-y-2">
              <Label htmlFor="guestJoinCode" className="text-white/80">Event Code <span className="text-[#B28DAE]">*</span></Label>
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
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#B28DAE] font-mono tracking-[0.2em] uppercase"
              />
              <p className="text-xs text-white/40">Ask your host for this event's join code.</p>
            </div>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-11 rounded-full text-base font-semibold bg-[#B28DAE] hover:bg-[#a468a0] text-[#141110]"
              disabled={loading || !name.trim() || !mobile.trim() || !email.trim() || (requireJoinCode && !joinCode.trim())}
            >
              {loading ? "Checking in..." : "Enter Capsule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
