"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Camera,
  Calendar,
  MapPin,
  QrCode,
  Sparkles,
  Play,
  MessageSquare,
  Mic,
  Video,
  Heart,
  Users,
  BarChart3,
  Download,
  Share2,
  Settings,
  Plus,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Check,
  Search,
  Lock,
  Film,
  Music,
  Bell,
  Eye,
  Info,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "@/lib/components/ui/toaster"
import {
  getActiveDemoTemplate,
  setActiveDemoTemplate,
  handleDemoReadOnlyAction,
  DEMO_TEMPLATES,
  type DemoEventTemplate,
  type DemoMediaItem,
} from "@/lib/demo-event"
import { DemoGuidedTour } from "./demo-guided-tour"
import { DemoAiFaceSearchModal } from "./demo-ai-face-search-modal"

export function DemoEventView() {
  const [template, setTemplate] = useState<DemoEventTemplate>(DEMO_TEMPLATES.wedding)
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false)
  const [isFaceSearchOpen, setIsFaceSearchOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)

  // Load initial tour state
  useEffect(() => {
    const tourDone = localStorage.getItem("snapsy_demo_tour_completed")
    if (!tourDone) {
      setIsTourOpen(true)
    }
  }, [])

  const handleTemplateChange = (templateId: string) => {
    setActiveDemoTemplate(templateId)
    setTemplate(getActiveDemoTemplate(templateId))
    toast({
      title: "Switched Demo Template",
      description: `Loaded demo content for "${DEMO_TEMPLATES[templateId]?.name}".`,
    })
  }

  const handleVoicePlay = (id: string) => {
    if (playingVoiceId === id) {
      setPlayingVoiceId(null)
    } else {
      setPlayingVoiceId(id)
      toast({
        title: "🎵 Playing Voice Note",
        description: "Simulated audio note playback in demo mode.",
      })
    }
  }

  const filteredMedia = template.media.filter((item) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.guestName.toLowerCase().includes(q) ||
        item.comments.some((c) => c.text.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-surface-dark text-ink pb-32">
      {/* Interactive Guided Tour */}
      <DemoGuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onCompleteTour={() => {
          localStorage.setItem("snapsy_demo_tour_completed", "true")
          toast({
            title: "Tour Complete! 🎉",
            description: "Explore the demo event freely or create your first real event.",
          })
        }}
      />

      {/* AI Face Search Modal */}
      <DemoAiFaceSearchModal
        isOpen={isFaceSearchOpen}
        onClose={() => setIsFaceSearchOpen(false)}
        guests={template.guests}
        media={template.media}
      />

      {/* Top Banner Notice */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-mauve/30 bg-mauve/15 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mauve text-white text-[10px] font-bold shadow-sm">
            ✨
          </span>
          <span className="text-xs font-bold text-ink">Sample Event (Demo Mode)</span>
          <span className="hidden sm:inline-block rounded-full bg-mauve/20 px-2 py-0.5 text-[10px] font-semibold text-mauve">
            Read-Only Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Template Switcher */}
          <select
            value={template.id}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="rounded-full border border-mauve/30 bg-[#faf6ed] px-3 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-mauve"
          >
            <option value="wedding">💍 Wedding Demo</option>
            <option value="birthday">🎂 Birthday Party</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTourOpen(true)}
            className="rounded-full gap-1 text-xs bg-[#faf6ed]"
          >
            <RotateCcw className="h-3 w-3" /> Replay Tour
          </Button>

          <Link href="/dashboard/events/new">
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-mauve px-4 text-xs font-bold text-[#1a1410] hover:bg-mauve-strong shadow-sm"
            >
              Create My Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-mauve/20 via-[#faf6ed] to-surface-dark border-b border-[#e5dfd0] px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{template.emoji}</span>
                <span className="rounded-full bg-mauve/10 border border-mauve/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-mauve">
                  Sample Event
                </span>
              </div>
              <h1 className="font-playfair text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                {template.name}
              </h1>
              <p className="text-sm font-medium text-mauve">{template.tagline}</p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDemoReadOnlyAction("Upload Photo")}
                className="flex items-center gap-2 rounded-full bg-mauve px-5 py-2.5 text-xs font-bold text-[#1a1410] shadow-lg shadow-mauve/20 transition-transform hover:scale-105"
              >
                <Camera className="h-4 w-4" /> Upload Demo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("qr")}
                className="flex items-center gap-2 rounded-full bg-white border border-[#e5dfd0] px-4 py-2.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:bg-black/5"
              >
                <QrCode className="h-4 w-4 text-mauve" /> Join Code: {template.joinCode}
              </button>
            </div>
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#e5dfd0]/60">
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 border border-[#e5dfd0] p-3">
              <Calendar className="h-4 w-4 text-mauve flex-shrink-0" />
              <span className="text-xs font-medium text-ink">{template.eventDate}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 border border-[#e5dfd0] p-3">
              <MapPin className="h-4 w-4 text-mauve flex-shrink-0" />
              <span className="text-xs font-medium text-ink truncate">{template.venue}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 border border-[#e5dfd0] p-3">
              <img
                src={template.hostAvatar}
                alt={template.hostName}
                className="h-6 w-6 rounded-full object-cover border border-white"
              />
              <span className="text-xs font-medium text-ink">Host: {template.hostName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="sticky top-[45px] z-30 border-b border-[#e5dfd0] bg-[#faf6ed]/95 backdrop-blur-md px-5">
        <div className="mx-auto max-w-5xl flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: Eye },
            { id: "gallery", label: `Gallery (${template.media.length})`, icon: Camera },
            { id: "ai", label: "AI Features", icon: Sparkles },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "qr", label: "QR & Invite", icon: QrCode },
            { id: "guests", label: `Guests (${template.guests.length})`, icon: Users },
            { id: "timeline", label: "Timeline", icon: Calendar },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-mauve text-[#1a1410] shadow-md shadow-mauve/20"
                    : "text-ink-secondary hover:bg-black/5 hover:text-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mx-auto max-w-5xl px-5 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Highlights Stats Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 text-center space-y-1">
                <span className="text-2xl font-extrabold text-mauve">{template.analytics.guestsJoined}</span>
                <p className="text-xs font-semibold text-ink-tertiary">Guests Joined</p>
              </div>
              <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 text-center space-y-1">
                <span className="text-2xl font-extrabold text-mauve">{template.analytics.totalUploads}</span>
                <p className="text-xs font-semibold text-ink-tertiary">Total Uploads</p>
              </div>
              <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 text-center space-y-1">
                <span className="text-2xl font-extrabold text-mauve">{template.analytics.reactionsCount}</span>
                <p className="text-xs font-semibold text-ink-tertiary">Reactions</p>
              </div>
              <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 text-center space-y-1">
                <span className="text-2xl font-extrabold text-mauve">{template.analytics.commentsCount}</span>
                <p className="text-xs font-semibold text-ink-tertiary">Comments</p>
              </div>
            </div>

            {/* Featured Media Carousel */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-playfair text-xl font-bold text-ink">Featured Event Highlights</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("gallery")}
                  className="text-xs font-bold text-mauve flex items-center gap-1 hover:underline"
                >
                  View All ({template.media.length}) <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {template.media.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#e5dfd0] bg-black/5"
                  >
                    <img
                      src={item.type === "video" ? item.thumbnailUrl : item.url}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                      <span className="text-[10px] font-bold text-mauve uppercase tracking-widest">
                        {item.type} · {item.category}
                      </span>
                      <h4 className="font-playfair text-base font-bold text-white truncate">{item.title}</h4>
                      <p className="text-xs text-white/80">By {item.guestName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="rounded-3xl border border-mauve/30 bg-gradient-to-br from-mauve/10 via-white to-[#faf6ed] p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-mauve" />
                <h3 className="font-playfair text-lg font-bold text-ink">AI Event Summary</h3>
              </div>
              <p className="text-sm leading-relaxed text-ink-secondary">{template.aiOutputs.eventSummary}</p>
            </div>
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === "gallery" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
                <input
                  type="text"
                  placeholder="Search photos, guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#e5dfd0] bg-white pl-10 pr-4 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-mauve"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {["all", "ceremony", "portraits", "dance", "food", "guests", "moments"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition-all ${
                      selectedCategory === cat
                        ? "bg-mauve text-white"
                        : "bg-white border border-[#e5dfd0] text-ink-secondary hover:border-mauve"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedia.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-[#e5dfd0] bg-white overflow-hidden space-y-3 p-3 shadow-sm hover:border-mauve/40 transition-all"
                >
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/5">
                    <img
                      src={m.type === "video" ? m.thumbnailUrl : m.url}
                      alt={m.title}
                      className="h-full w-full object-cover"
                    />
                    {m.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mauve/90 text-white shadow-lg">
                          <Play className="h-6 w-6 ml-0.5" />
                        </div>
                      </div>
                    )}
                    {m.type === "voice" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-mauve/80 text-white p-4 space-y-2">
                        <Mic className="h-8 w-8 animate-bounce" />
                        <span className="text-xs font-bold">Voice Note ({m.duration})</span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleVoicePlay(m.id)}
                          className="rounded-full bg-white text-mauve hover:bg-white/90 text-xs font-bold px-4"
                        >
                          {playingVoiceId === m.id ? "Pause Audio" : "Play Audio"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={m.guestAvatar}
                          alt={m.guestName}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-semibold text-ink">{m.guestName}</span>
                      </div>
                      <span className="text-[10px] text-ink-tertiary">{m.timestamp}</span>
                    </div>

                    <h4 className="text-sm font-bold text-ink">{m.title}</h4>

                    {/* Reactions & Comments Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#e5dfd0]">
                      <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                        {Object.entries(m.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleDemoReadOnlyAction(`React ${emoji}`)}
                            className="flex items-center gap-0.5 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium hover:bg-mauve/10"
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        ))}
                      </div>

                      <span className="text-[11px] text-ink-tertiary flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {m.comments.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI FEATURES TAB */}
        {activeTab === "ai" && (
          <div className="space-y-8">
            {/* AI Face Search Launcher */}
            <div className="rounded-3xl border border-mauve/30 bg-gradient-to-r from-mauve/15 via-white to-[#faf6ed] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-mauve" />
                  <h3 className="font-playfair text-xl font-bold text-ink">AI Face Search</h3>
                </div>
                <p className="text-xs text-ink-secondary">
                  Instantly find every photo a guest appears in using facial recognition.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsFaceSearchOpen(true)}
                className="rounded-full bg-mauve px-6 text-xs font-bold text-[#1a1410] hover:bg-mauve-strong shadow-md shadow-mauve/20"
              >
                Launch Face Search Demo
              </Button>
            </div>

            {/* Smart Albums */}
            <div>
              <h3 className="font-playfair text-xl font-bold text-ink mb-4">AI Smart Albums</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {template.aiOutputs.smartAlbums.map((album) => (
                  <div
                    key={album.id}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-[#e5dfd0] bg-black/5"
                  >
                    <img
                      src={album.coverImage}
                      alt={album.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                      <h4 className="text-xs font-bold text-white truncate">{album.name}</h4>
                      <p className="text-[10px] text-white/80">{album.count} photos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Memory Story */}
            <div className="rounded-3xl border border-[#e5dfd0] bg-white p-6 space-y-4 shadow-sm">
              <h3 className="font-playfair text-xl font-bold text-ink">
                AI Memory Story: {template.aiOutputs.memoryStory.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {template.aiOutputs.memoryStory.chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-[#e5dfd0] bg-[#faf6ed]"
                  >
                    <img
                      src={ch.image}
                      alt={ch.title}
                      className="h-16 w-16 rounded-xl object-cover flex-shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-ink">{ch.title}</h4>
                      <p className="text-[11px] text-ink-secondary leading-snug">{ch.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h3 className="font-playfair text-2xl font-bold text-ink">Event Analytics Dashboard</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 space-y-1">
                <span className="text-xs text-ink-tertiary uppercase font-bold">Storage Used</span>
                <p className="text-xl font-extrabold text-mauve">{template.analytics.storageUsedGb} GB</p>
              </div>
              <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 space-y-1">
                <span className="text-xs text-ink-tertiary uppercase font-bold">Most Active Guest</span>
                <p className="text-sm font-bold text-ink">{template.analytics.mostActiveGuest}</p>
              </div>
              <div className="rounded-2xl border border-[#e5dfd0] bg-white p-4 space-y-1">
                <span className="text-xs text-ink-tertiary uppercase font-bold">Peak Activity Time</span>
                <p className="text-sm font-bold text-ink">{template.analytics.peakActivityTime}</p>
              </div>
            </div>
          </div>
        )}

        {/* QR & INVITE TAB */}
        {activeTab === "qr" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#e5dfd0] bg-white p-8 max-w-lg mx-auto text-center space-y-4 shadow-sm">
              <h3 className="font-playfair text-2xl font-bold text-ink">Scan to Join Event</h3>
              <p className="text-xs text-ink-secondary">
                Guests scan this QR code or enter Join Code <strong className="text-mauve">{template.joinCode}</strong>
              </p>
              <div className="flex justify-center p-4 bg-[#faf6ed] rounded-2xl border border-[#e5dfd0] inline-block">
                <QRCodeSVG value={`https://snapsy.events/event/scan/${template.joinCode}`} size={180} />
              </div>
            </div>
          </div>
        )}

        {/* GUESTS TAB */}
        {activeTab === "guests" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {template.guests.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-[#e5dfd0] bg-white"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={g.avatar}
                    alt={g.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-ink">{g.name}</h4>
                    <p className="text-xs text-ink-tertiary">{g.role}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-mauve">{g.uploadsCount} uploads</span>
              </div>
            ))}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === "timeline" && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {template.milestones.map((m, idx) => (
              <div key={m.id} className="flex gap-4 p-4 rounded-2xl border border-[#e5dfd0] bg-white">
                <span className="text-xs font-bold text-mauve w-16">{m.time}</span>
                <div>
                  <h4 className="text-sm font-bold text-ink">{m.title}</h4>
                  <p className="text-xs text-ink-secondary">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="space-y-3 max-w-xl mx-auto">
            {template.notifications.map((n) => (
              <div key={n.id} className="p-4 rounded-2xl border border-[#e5dfd0] bg-white space-y-1">
                <h4 className="text-xs font-bold text-ink">{n.title}</h4>
                <p className="text-xs text-ink-secondary">{n.message}</p>
                <span className="text-[10px] text-ink-tertiary">{n.timestamp}</span>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="space-y-4 max-w-xl mx-auto rounded-3xl border border-[#e5dfd0] bg-white p-6">
            <h3 className="font-playfair text-xl font-bold text-ink">Sample Event Settings</h3>
            <p className="text-xs text-ink-tertiary">
              Configure security, guest permissions, and approval flows in real events.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-[#faf6ed]">
                <span>Public Access</span>
                <span className="font-bold text-mauve">Enabled</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-[#faf6ed]">
                <span>Auto-Approve Guest Photos</span>
                <span className="font-bold text-mauve">Enabled</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom CTA Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-mauve/30 bg-[#faf6ed]/95 p-4 backdrop-blur-lg shadow-2xl">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="text-sm font-extrabold text-ink">🎉 Ready to create your own memories?</p>
            <p className="text-xs text-ink-secondary">
              Set up your own event in less than 2 minutes and invite guests with a QR code.
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button
              type="button"
              className="rounded-full bg-mauve px-8 py-3 text-sm font-bold text-[#1a1410] hover:bg-mauve-strong shadow-lg shadow-mauve/25 transition-transform hover:scale-105"
            >
              Create My First Event ✨
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
