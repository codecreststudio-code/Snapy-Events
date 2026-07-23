"use client"

import { useState } from "react"
import { Button } from "@/lib/components/ui/button"
import { Sparkles } from "lucide-react"
import { GuestFaceSearchModal } from "./guest-face-search-modal"

export interface GuestFaceSearchButtonProps {
  galleryId?: string
  eventId?: string
}

export function GuestFaceSearchButton({ galleryId, eventId }: GuestFaceSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        variant="outline"
        className="rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-ink transition-all shadow-md shadow-amber-500/10"
      >
        <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
        Find My Photos (AI)
      </Button>

      <GuestFaceSearchModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        galleryId={galleryId}
        eventId={eventId}
      />
    </>
  )
}
