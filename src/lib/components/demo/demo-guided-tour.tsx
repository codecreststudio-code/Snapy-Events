"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Camera,
  QrCode,
  Users,
  Brain,
  BarChart3,
  Settings,
  Download,
  Share2,
  MessageSquare,
  Heart,
  Images,
  Check,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"

export interface TourStep {
  id: string
  title: string
  subtitle: string
  description: string
  targetTab: string
  icon: any
  tip: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "gallery",
    title: "1. Interactive Event Gallery 🖼️",
    subtitle: "Real-time guest photos, videos & voice notes",
    description:
      "All media uploaded by host and guests streams directly into high-res grid galleries with instant filtering, full-size lightboxes, and auto-sorting.",
    targetTab: "gallery",
    icon: Images,
    tip: "Guests can view photos as soon as they are snapped!",
  },
  {
    id: "upload",
    title: "2. Instant Guest Uploads 📸",
    subtitle: "No app downloads needed for guests",
    description:
      "Guests simply scan the QR code or visit the link to instantly upload high-quality photos, videos, and voice recordings directly from their phone camera.",
    targetTab: "gallery",
    icon: Camera,
    tip: "Supports live camera capture and voice messages!",
  },
  {
    id: "qr",
    title: "3. Smart QR & Join Code 📲",
    subtitle: "Frictionless guest check-in",
    description:
      "Display your unique QR Code on table stands, TV screens, or printed cards so guests can join in 2 seconds with zero registration friction.",
    targetTab: "qr",
    icon: QrCode,
    tip: "You can download print-ready QR templates!",
  },
  {
    id: "guests",
    title: "4. Guest Roster & Leaderboard 👥",
    subtitle: "Track who is contributing memories",
    description:
      "See all joined guests, track upload stats, award guest achievements, and manage participation permissions effortlessly.",
    targetTab: "guests",
    icon: Users,
    tip: "Highlight top photo contributors with guest awards!",
  },
  {
    id: "ai",
    title: "5. AI Magic & Smart Albums 🤖",
    subtitle: "AI Summaries, Face Search & Recaps",
    description:
      "Snapsy's AI automatically categorizes photos, generates 4K highlight videos, builds animated slideshows with music, and powers face search.",
    targetTab: "ai",
    icon: Brain,
    tip: "Try the AI Face Search demo to find photos of any guest instantly!",
  },
  {
    id: "analytics",
    title: "6. Real-Time Event Analytics 📊",
    subtitle: "Insights into uploads, peak hours & engagement",
    description:
      "Monitor storage usage, daily upload trends, peak activity hours, and total reaction/comment engagement metrics in beautiful interactive charts.",
    targetTab: "analytics",
    icon: BarChart3,
    tip: "Hosts get instant activity metrics during live events!",
  },
  {
    id: "settings",
    title: "7. Complete Event Controls ⚙️",
    subtitle: "Custom branding, passwords & approvals",
    description:
      "Configure privacy settings, password protection, auto-approval workflows, custom cover imagery, and time capsule reveal dates.",
    targetTab: "settings",
    icon: Settings,
    tip: "Enable auto-approval or keep uploads private until reviewed!",
  },
  {
    id: "download",
    title: "8. Bulk High-Res Downloads 💾",
    subtitle: "Download all memories in 1-click ZIP",
    description:
      "Easily export full-resolution photo archives, videos, and voice recordings whenever you are ready to back up or print your album.",
    targetTab: "overview",
    icon: Download,
    tip: "Original quality preserved without compression loss!",
  },
  {
    id: "share",
    title: "9. Share & Invitation Cards 💌",
    subtitle: "Send WhatsApp or email invitations",
    description:
      "Generate custom digital invitation cards with personalized text and share directly via WhatsApp, SMS, or social media.",
    targetTab: "qr",
    icon: Share2,
    tip: "Pre-made invite templates ready to copy and send!",
  },
  {
    id: "comments",
    title: "10. Guest Comments & Voice Replies 💬",
    subtitle: "Rich conversations on every memory",
    description:
      "Guests can comment, leave audio voice notes, and discuss special memories attached to individual photos and videos.",
    targetTab: "gallery",
    icon: MessageSquare,
    tip: "Voice notes bring authentic emotional reactions to life!",
  },
  {
    id: "reactions",
    title: "11. Emoji Reactions ❤️😂😍",
    subtitle: "Express joy on photos and videos",
    description:
      "Guests tap hearts, fire, laughs, and claps on media items, building an interactive engagement leaderboard for top photos.",
    targetTab: "gallery",
    icon: Heart,
    tip: "Reactions automatically power AI highlight recommendations!",
  },
]

interface DemoGuidedTourProps {
  isOpen: boolean
  onClose: () => void
  onSelectTab: (tabId: string) => void
  onCompleteTour?: () => void
}

export function DemoGuidedTour({
  isOpen,
  onClose,
  onSelectTab,
  onCompleteTour,
}: DemoGuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const currentStep = TOUR_STEPS[currentStepIndex]

  useEffect(() => {
    if (isOpen && currentStep) {
      onSelectTab(currentStep.targetTab)
    }
  }, [currentStepIndex, isOpen, currentStep, onSelectTab])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      onClose()
      if (onCompleteTour) onCompleteTour()
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  const StepIcon = currentStep.icon

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg rounded-3xl border border-mauve/30 bg-[#faf6ed] p-6 shadow-2xl"
        >
          {/* Top header bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#e5dfd0]">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mauve text-white text-xs font-bold shadow-md shadow-mauve/20">
                ✨
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-mauve">
                  Guided Walkthrough
                </h4>
                <p className="text-[11px] text-ink-tertiary">
                  Step {currentStepIndex + 1} of {TOUR_STEPS.length}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-ink-tertiary hover:bg-black/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step Content */}
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-mauve/10 text-mauve">
                <StepIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-bold text-ink">
                  {currentStep.title}
                </h3>
                <p className="text-xs font-medium text-mauve">
                  {currentStep.subtitle}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-ink-secondary">
              {currentStep.description}
            </p>

            <div className="flex items-start gap-2 rounded-2xl bg-mauve/5 border border-mauve/20 p-3 text-xs text-ink-secondary">
              <Sparkles className="h-4 w-4 flex-shrink-0 text-mauve mt-0.5" />
              <span>
                <strong>Pro Tip:</strong> {currentStep.tip}
              </span>
            </div>
          </div>

          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 py-2">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? "w-6 bg-mauve"
                    : idx < currentStepIndex
                    ? "w-2 bg-mauve/40"
                    : "w-1.5 bg-[#e5dfd0]"
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-[#e5dfd0]">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-ink-tertiary hover:text-ink transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="rounded-full gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="rounded-full bg-mauve px-5 text-xs font-bold text-[#faf6ed] hover:bg-mauve-strong shadow-md shadow-mauve/20 gap-1"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <>
                    Finish Tour <Check className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Next Step <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
