"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { QrCode, Key, Loader2, X } from "lucide-react"
import { Button } from "@/lib/components/ui/button"

interface JoinEventModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinEventModal({ isOpen, onClose }: JoinEventModalProps) {
  const [joinCode, setJoinCode] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoinLoading(true)
    setJoinError(null)

    try {
      const res = await fetch("/api/events/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.data?.slug) {
        window.location.href = `/event/${data.data.slug}`
      } else {
        setJoinError(data.error?.message || "Invalid event code. Please check and try again.")
      }
    } catch (_) {
      setJoinError("Unable to verify code right now. Please try again.")
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-card p-6 sm:p-8 rounded-3xl border border-hairline-dark shadow-2xl space-y-6 text-left z-10 my-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-mauve/10 text-mauve flex items-center justify-center">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Join an Event</h3>
                  <p className="text-xs text-ink-secondary font-light">Enter your event code or custom URL slug</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-ink-secondary hover:bg-mauve/10 hover:text-ink transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider">Event Code or Subdomain</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="e.g. K7XQ9M or sarah-wedding"
                    className="w-full rounded-2xl border border-hairline-dark bg-surface-dark pl-11 pr-4 py-3 text-sm text-ink uppercase placeholder:normal-case placeholder:text-ink-tertiary focus:border-mauve focus:outline-none"
                  />
                </div>
                {joinError && (
                  <p className="text-xs font-medium text-red-400 pt-1">{joinError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-full border-hairline-dark text-ink font-semibold py-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={joinLoading}
                  className="flex-1 rounded-full bg-mauve text-[#faf6ed] font-semibold py-3 text-xs hover:bg-mauve-strong shadow-lg shadow-mauve/15"
                >
                  {joinLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Join Gallery"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
