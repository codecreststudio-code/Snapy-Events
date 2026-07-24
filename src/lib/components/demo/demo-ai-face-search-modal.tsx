"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Search, CheckCircle2, User, X, Camera } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import type { DemoGuest, DemoMediaItem } from "@/lib/demo-event/templates"

interface DemoAiFaceSearchModalProps {
  isOpen: boolean
  onClose: () => void
  guests: DemoGuest[]
  media: DemoMediaItem[]
}

export function DemoAiFaceSearchModal({
  isOpen,
  onClose,
  guests,
  media,
}: DemoAiFaceSearchModalProps) {
  const [selectedGuest, setSelectedGuest] = useState<DemoGuest | null>(guests[0] || null)
  const [isSearching, setIsSearching] = useState(false)
  const [matchedResults, setMatchedResults] = useState<DemoMediaItem[]>([])

  if (!isOpen) return null

  const handleSelectGuest = (guest: DemoGuest) => {
    setSelectedGuest(guest)
    setIsSearching(true)
    setTimeout(() => {
      // Find media items tagged with or uploaded by guest
      const matches = media.filter(
        (m) =>
          m.guestName === guest.name ||
          m.faceTags?.some((tag) => tag.toLowerCase().includes(guest.name.toLowerCase()))
      )
      setMatchedResults(matches.length > 0 ? matches : media.slice(0, 3))
      setIsSearching(false)
    }, 600)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-mauve/30 bg-[#faf6ed] p-6 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#e5dfd0]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mauve/10 text-mauve">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-bold text-[#1a1410]">
                  AI Face Search Demo 👤✨
                </h3>
                <p className="text-xs text-[#7a7265]">
                  Select a guest or upload a selfie to instantly find matching photos
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#8c8275] hover:bg-black/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Guest Cluster Selector */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a7265] mb-3">
              Step 1: Select a Guest Face Cluster
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {guests.map((g) => {
                const isSelected = selectedGuest?.id === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGuest(g)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-mauve bg-mauve/10 shadow-sm scale-105"
                        : "border-[#e5dfd0] bg-white hover:border-mauve/40"
                    }`}
                  >
                    <img
                      src={g.avatar}
                      alt={g.name}
                      className="h-10 w-10 rounded-full object-cover border border-white shadow-sm"
                    />
                    <span className="truncate text-[10px] font-medium text-[#1a1410] w-full text-center">
                      {g.name.split(" ")[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Search Result State */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a7265]">
                Step 2: AI Face Recognition Results
              </h4>
              {selectedGuest && (
                <span className="text-xs font-medium text-mauve flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Showing photos for {selectedGuest.name}
                </span>
              )}
            </div>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white/60 rounded-2xl border border-[#e5dfd0]">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-mauve" />
                <p className="text-xs font-medium text-[#6b6055]">
                  Scanning 154 photos using vector face embeddings...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(matchedResults.length > 0 ? matchedResults : media.slice(0, 3)).map((m) => (
                  <div
                    key={m.id}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-[#e5dfd0] bg-black/5"
                  >
                    <img
                      src={m.url}
                      alt={m.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 p-3 flex flex-col justify-end">
                      <p className="text-xs font-semibold text-white truncate">{m.title}</p>
                      <span className="text-[10px] text-white/80">Match score: 98.4%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#e5dfd0]">
            <p className="text-xs text-[#7a7265]">
              In real events, guests upload a selfie to unlock all their event photos instantly!
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="rounded-full bg-mauve px-5 text-xs font-bold text-[#1a1410]"
            >
              Close Demo
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
