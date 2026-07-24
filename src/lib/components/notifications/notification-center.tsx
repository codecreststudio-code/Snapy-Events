"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, Check, Inbox, Loader2, Search, X } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/lib/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"
import { fadeInUp, staggerContainer } from "@/lib/motion/tokens"

// Richer, host-facing sibling of admin-notifications-dropdown.tsx (that one
// stays admin-only and simple/poll-based). This one adds realtime inserts via
// Supabase Realtime, search, type filters, date grouping, and pagination, and
// renders as a dropdown on sm+ and a full-width bottom sheet below that,
// following the same "two trees toggled by CSS breakpoint" split already used
// by DashboardSidebar (desktop) vs HomeBottomTabs (phone/tablet).

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  data?: { url?: string; [key: string]: unknown } | null
  read_at: string | null
  created_at: string
}

const PAGE_SIZE = 20

// Judgment call: the API's `type` column is free-form, so we map it down to a
// handful of user-meaningful chips rather than mirroring every preference
// category 1:1 (marketing/milestones/highlights are left out of the row to
// keep it scannable — those still show up under "All").
const TYPE_FILTERS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Uploads", value: "upload" },
  { label: "Comments", value: "comment" },
  { label: "Likes", value: "like" },
  { label: "Guests", value: "new_guest" },
  { label: "Reminders", value: "reminder" },
  { label: "AI Stories", value: "ai_story" },
  { label: "Announcements", value: "announcement" },
]

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older"] as const
type GroupLabel = (typeof GROUP_ORDER)[number]

function getDateGroup(iso: string): GroupLabel {
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  if (date >= startOfToday) return "Today"
  if (date >= startOfYesterday) return "Yesterday"
  if (date >= startOfWeek) return "This Week"
  return "Older"
}

function groupNotifications(items: NotificationItem[]) {
  const buckets = new Map<GroupLabel, NotificationItem[]>()
  for (const item of items) {
    const label = getDateGroup(item.created_at)
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label)!.push(item)
  }
  return GROUP_ORDER.map((label) => ({ label, items: buckets.get(label) ?? [] })).filter(
    (group) => group.items.length > 0
  )
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

async function fetchNotificationsPage(opts: {
  offset: number
  type: string | null
  q: string
}): Promise<NotificationItem[]> {
  const params = new URLSearchParams()
  params.set("limit", String(PAGE_SIZE))
  params.set("offset", String(opts.offset))
  if (opts.type) params.set("type", opts.type)
  if (opts.q) params.set("q", opts.q)

  const res = await fetch(`/api/notifications?${params.toString()}`)
  if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`)
  const data = await res.json().catch(() => null)
  if (Array.isArray(data)) return data as NotificationItem[]
  if (data && Array.isArray((data as { notifications?: unknown }).notifications)) {
    return (data as { notifications: NotificationItem[] }).notifications
  }
  if (data && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: NotificationItem[] }).items
  }
  return []
}

// forwardRef so Radix's asChild/Slot cloning (on both DropdownMenuTrigger and
// DialogPrimitive.Trigger below) can attach its ref for focus-return-on-close
// management, instead of warning about refs on a plain function component.
const BellTrigger = React.forwardRef<
  HTMLButtonElement,
  { unreadCount: number } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ unreadCount, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="ghost"
    size="icon"
    aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
    className="relative h-9 w-9 rounded-lg text-ink-secondary hover:bg-mauve/5 hover:text-ink"
    {...props}
  >
    <Bell className="h-5 w-5" />
    {unreadCount > 0 && (
      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-mauve px-1 text-[10px] font-bold text-[#faf6ed] ring-2 ring-surface-card">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    )}
  </Button>
))
BellTrigger.displayName = "BellTrigger"

interface PanelContentProps {
  notifications: NotificationItem[]
  grouped: { label: GroupLabel; items: NotificationItem[] }[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  searchInput: string
  onSearchChange: (v: string) => void
  activeType: string | null
  onTypeChange: (v: string | null) => void
  unreadCount: number
  onMarkAllRead: () => void
  onItemClick: (n: NotificationItem) => void
  onDelete: (id: string, e?: React.MouseEvent) => void
  reducedMotion: boolean
  isSheet?: boolean
}

function NotificationRow({
  notification,
  onClick,
  onDelete,
  reducedMotion,
}: {
  notification: NotificationItem
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  reducedMotion: boolean
}) {
  const unread = !notification.read_at

  return (
    <motion.div
      layout={!reducedMotion}
      variants={reducedMotion ? undefined : fadeInUp}
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={reducedMotion ? { duration: 0 } : undefined}
      className={cn(
        "group relative border-b border-hairline-dark/60 transition-colors",
        unread ? "bg-mauve/[0.06] hover:bg-mauve/10" : "hover:bg-mauve/5"
      )}
    >
      <button type="button" onClick={onClick} className="flex w-full gap-3 px-4 py-3 pr-9 text-left">
        {unread && <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mauve" />}
        <div className={cn("min-w-0 flex-1", !unread && "pl-5")}>
          <p className={cn("truncate text-sm", unread ? "font-semibold text-ink" : "text-ink")}>
            {notification.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-secondary">{notification.body}</p>
          <p className="mt-1 text-[10px] font-medium text-ink-tertiary">{timeAgo(notification.created_at)}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete notification"
        className="absolute right-3 top-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-tertiary opacity-0 transition-opacity hover:bg-mauve/10 hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

function PanelContent({
  notifications,
  grouped,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  searchInput,
  onSearchChange,
  activeType,
  onTypeChange,
  unreadCount,
  onMarkAllRead,
  onItemClick,
  onDelete,
  reducedMotion,
  isSheet,
}: PanelContentProps) {
  return (
    <div className={cn("flex flex-col", isSheet ? "min-h-0 flex-1" : "")}>
      <div className="flex items-center justify-between gap-2 border-b border-hairline-dark px-4 py-3">
        <span className="font-playfair text-base font-semibold text-ink">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs font-semibold text-mauve transition-colors hover:text-mauve-strong"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notifications"
            aria-label="Search notifications"
            className="w-full rounded-full border border-hairline-dark bg-ink/5 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-mauve focus:outline-none focus:ring-1 focus:ring-mauve"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TYPE_FILTERS.map((f) => {
          const active = activeType === f.value
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => onTypeChange(f.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-mauve bg-mauve/15 text-mauve"
                  : "border-hairline-dark bg-transparent text-ink-secondary hover:border-mauve/30 hover:text-ink"
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className={cn("overflow-y-auto", isSheet ? "min-h-0 flex-1" : "max-h-[26rem]")}>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-ink-tertiary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5">
              <Inbox className="h-5 w-5 text-ink-tertiary" />
            </div>
            <p className="text-sm text-ink-secondary">
              {searchInput || activeType ? "No matching notifications" : "You're all caught up"}
            </p>
          </div>
        ) : (
          <motion.div
            variants={reducedMotion ? undefined : staggerContainer()}
            initial={reducedMotion ? undefined : "hidden"}
            animate={reducedMotion ? undefined : "visible"}
          >
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 bg-surface-card-elevated/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-tertiary backdrop-blur">
                  {group.label}
                </div>
                <AnimatePresence initial={false}>
                  {group.items.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onClick={() => onItemClick(n)}
                      onDelete={(e) => onDelete(n.id, e)}
                      reducedMotion={reducedMotion}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}

        {!isLoading && hasMore && notifications.length > 0 && (
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full rounded-full border border-hairline-dark py-2 text-xs font-semibold text-ink-secondary transition-colors hover:border-mauve/30 hover:text-ink disabled:opacity-50"
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function NotificationCenter() {
  const router = useRouter()
  const { user } = useAuth()
  const reducedMotion = !!useReducedMotion()

  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)
  const [activeType, setActiveType] = React.useState<string | null>(null)
  const [searchInput, setSearchInput] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  // Debounce the search box before it drives a request.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // (Re)load from the top whenever the filter or search term changes.
  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchNotificationsPage({ offset: 0, type: activeType, q: debouncedSearch })
      .then((items) => {
        if (cancelled) return
        setNotifications(items)
        setHasMore(items.length === PAGE_SIZE)
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([])
          setHasMore(false)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeType, debouncedSearch])

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const items = await fetchNotificationsPage({
        offset: notifications.length,
        type: activeType,
        q: debouncedSearch,
      })
      setNotifications((prev) => [...prev, ...items])
      setHasMore(items.length === PAGE_SIZE)
    } catch {
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, notifications.length, activeType, debouncedSearch])

  // Realtime: prepend newly-inserted notifications for the signed-in user.
  React.useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: { new: NotificationItem }) => {
          const row = payload.new
          setNotifications((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  const markRead = React.useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n))
    )
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      })
    } catch {
      // Best-effort — local state already reflects the intended outcome.
    }
  }, [])

  const handleDelete = React.useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()
      const prevState = notifications
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      try {
        const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("delete failed")
      } catch {
        setNotifications(prevState)
      }
    },
    [notifications]
  )

  const handleMarkAllRead = React.useCallback(async () => {
    const prevState = notifications
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" })
      if (!res.ok) throw new Error("mark-all-read failed")
    } catch {
      setNotifications(prevState)
    }
  }, [notifications])

  const handleItemClick = React.useCallback(
    (n: NotificationItem) => {
      if (!n.read_at) markRead(n.id)
      const url = n.data?.url
      if (typeof url === "string" && url.length > 0) {
        setOpen(false)
        router.push(url)
      }
    },
    [markRead, router]
  )

  const grouped = React.useMemo(() => groupNotifications(notifications), [notifications])

  const panelProps: Omit<PanelContentProps, "isSheet"> = {
    notifications,
    grouped,
    isLoading,
    isLoadingMore,
    hasMore,
    onLoadMore: handleLoadMore,
    searchInput,
    onSearchChange: setSearchInput,
    activeType,
    onTypeChange: setActiveType,
    unreadCount,
    onMarkAllRead: handleMarkAllRead,
    onItemClick: handleItemClick,
    onDelete: handleDelete,
    reducedMotion,
  }

  return (
    <>
      {/* Desktop / tablet: dropdown panel anchored to the bell */}
      <div className="hidden sm:block">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <BellTrigger unreadCount={unreadCount} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-hairline-dark bg-surface-card-elevated p-0 shadow-2xl"
          >
            <PanelContent {...panelProps} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Phone/tablet: full-width bottom sheet, mirroring HomeBottomTabs' overflow sheet */}
      <div className="sm:hidden">
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <BellTrigger unreadCount={unreadCount} />
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-hairline-dark bg-surface-card-elevated shadow-2xl duration-300 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <DialogPrimitive.Title className="sr-only">Notifications</DialogPrimitive.Title>
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-ink/15" />
              <PanelContent {...panelProps} isSheet />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </>
  )
}
