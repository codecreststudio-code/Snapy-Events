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
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }

    setLoading(true)
    
    // Save locally for persistence across uploads
    localStorage.setItem(`snapsy_guest_${eventId}`, JSON.stringify({ name, email, mobile }))
    
    // Also save globally for auto-filling upload forms
    localStorage.setItem("snapsy_last_guest_name", name)
    if (email) localStorage.setItem("snapsy_last_guest_email", email)

    // Log the access in the database for the event timeline
    const result = await logGuestAccess(eventId, { name, email, mobile })
    
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
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Welcome to {eventName}</DialogTitle>
          <DialogDescription>
            Please check in to view the memory capsule and share your photos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="guestName">Your Name <span className="text-red-500">*</span></Label>
            <Input
              id="guestName"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestMobile">Mobile Number</Label>
            <Input
              id="guestMobile"
              placeholder="e.g. +1 234 567 890"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestEmail">Email Address</Label>
            <Input
              id="guestEmail"
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading || !name.trim()}>
              {loading ? "Checking in..." : "Enter Capsule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
