"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { logGuestAccess } from "@/app/actions/guest"

export function GuestCaptureModal({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
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

    if (!cleanName || !cleanEmail || !cleanMobile) {
      toast({
        title: "All Fields Required",
        description: "Please fill in your Name, Mobile Number, and Email Address to enter the memory capsule.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    // Save locally for persistence across uploads
    localStorage.setItem(`snapsy_guest_${eventId}`, JSON.stringify({ name: cleanName, email: cleanEmail, mobile: cleanMobile }))
    
    // Also save globally for auto-filling upload forms
    localStorage.setItem("snapsy_last_guest_name", cleanName)
    localStorage.setItem("snapsy_last_guest_email", cleanEmail)

    // Log the access in the database for the event timeline and marketing retargeting leads
    const result = await logGuestAccess(eventId, { name: cleanName, email: cleanEmail, mobile: cleanMobile })
    
    setLoading(false)
    if (result.success) {
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
        className="sm:max-w-[425px] rounded-2xl sm:rounded-2xl border border-[#3D332A] bg-[#1C1814] text-white/90"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-playfair text-2xl font-medium text-white">Welcome to {eventName}</DialogTitle>
          <DialogDescription className="text-white/60">
            Please check in with your details to view the memory capsule and share your photos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="guestName" className="text-white/80">Your Name <span className="text-[#D4AF37]">*</span></Label>
            <Input
              id="guestName"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#D4AF37]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestMobile" className="text-white/80">Mobile Number <span className="text-[#D4AF37]">*</span></Label>
            <Input
              id="guestMobile"
              type="tel"
              placeholder="e.g. +1 234 567 890"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#D4AF37]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestEmail" className="text-white/80">Email Address <span className="text-[#D4AF37]">*</span></Label>
            <Input
              id="guestEmail"
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#D4AF37]"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-11 rounded-full text-base font-semibold bg-[#D4AF37] hover:bg-[#c4a233] text-[#141110]"
              disabled={loading || !name.trim() || !mobile.trim() || !email.trim()}
            >
              {loading ? "Checking in..." : "Enter Capsule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
