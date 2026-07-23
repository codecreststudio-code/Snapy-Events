"use client"

import * as React from "react"
import { Bell, Loader2 } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { getAdminNotifications, markNotificationAsRead, markAllNotificationsAsRead, AdminNotification } from "@/app/actions/admin-notifications"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export function AdminNotificationsDropdown() {
  const [notifications, setNotifications] = React.useState<AdminNotification[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()

  const loadNotifications = React.useCallback(async () => {
    try {
      const data = await getAdminNotifications()
      setNotifications(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadNotifications()
    // Poll every 3 minutes for new notifications
    const interval = setInterval(loadNotifications, 180000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await markNotificationAsRead(id)
  }

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await markAllNotificationsAsRead()
  }

  const handleNotificationClick = (n: AdminNotification) => {
    if (!n.is_read) {
      handleMarkRead(n.id)
    }
    if (n.link) {
      router.push(n.link)
      setIsOpen(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-ink-secondary hover:bg-mauve/5 hover:text-ink rounded-lg"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-mauve text-[10px] font-bold text-[#faf6ed] ring-2 ring-surface-card">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-surface-card-elevated border border-hairline-dark shadow-lg rounded-xl">
        <div className="flex items-center justify-between border-b border-hairline-dark px-4 py-3">
          <span className="font-bold text-ink text-sm">System Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-mauve hover:text-mauve-strong transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-hairline-dark">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 text-ink-tertiary animate-spin" />
            </div>
          ) : notifications.length > 0 ? (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "flex flex-col gap-1 px-4 py-3 text-xs transition-colors",
                  n.link ? "cursor-pointer" : "",
                  !n.is_read ? "bg-mauve/10 hover:bg-mauve/15" : "hover:bg-mauve/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("text-ink-secondary", !n.is_read ? "font-semibold text-ink" : "")}>
                    {n.title}
                  </span>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkRead(n.id, e)}
                      title="Mark as read"
                      className="h-2 w-2 shrink-0 rounded-full bg-mauve mt-1 hover:bg-mauve-strong"
                    />
                  )}
                </div>
                <span className="text-[11px] text-ink-secondary line-clamp-2">{n.message}</span>
                <span className="text-[10px] text-ink-tertiary font-medium">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-ink-secondary">
              No notifications
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
