"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { QrCode, Key, Loader2, ArrowLeft, ArrowRight, Camera } from "lucide-react"
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
          {/* Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container (Mirroring Image 3) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0F0E0D] text-[#faf6ed] p-6 sm:p-7 rounded-3xl border border-[#2a2724] shadow-2xl space-y-6 text-left z-10 my-auto overflow-hidden"
          >
            {/* Top Bar with Back Arrow */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-[#2a2724] bg-[#1a1816] flex items-center justify-center text-ink-secondary hover:text-white transition cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-[#b8925a]">Scan or Join</span>
            </div>

            {/* QR Scanner Camera View Box */}
            <div className="relative aspect-square w-full bg-[#171513] rounded-3xl border-2 border-dashed border-[#b8925a]/40 p-6 flex flex-col items-center justify-center text-center space-y-3 overflow-hidden shadow-inner group">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#b8925a]/60 bg-[#b8925a]/10 flex items-center justify-center text-[#b8925a] animate-pulse">
                <Camera className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Scan Event QR Code</p>
                <p className="text-xs text-zinc-400">Position the event QR code inside the frame to scan</p>
              </div>
            </div>

            {/* Bottom Form Section: Or Paste Invitation Link */}
            <form onSubmit={handleJoinSubmit} className="space-y-4 pt-2 border-t border-[#2a2724]">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block">
                  OR PASTE INVITATION LINK / CODE
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Paste link or enter code (e.g. MQV8KF)"
                    className="w-full rounded-2xl border border-[#2a2724] bg-[#171513] px-4 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#b8925a] focus:outline-none transition-colors"
                  />
                </div>
                {joinError && (
                  <p className="text-xs font-medium text-red-400 pt-1">{joinError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={joinLoading || !joinCode.trim()}
                className="w-full rounded-2xl bg-[#faf6ed] hover:bg-white text-black font-bold py-4 text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {joinLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </span>
                ) : (
                  <>
                    <span>Join</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
