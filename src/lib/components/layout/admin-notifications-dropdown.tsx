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
          className="relative h-9 w-9 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-white border border-slate-200 shadow-lg rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="font-bold text-slate-800 text-sm">System Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
            </div>
          ) : notifications.length > 0 ? (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "flex flex-col gap-1 px-4 py-3 text-xs transition-colors",
                  n.link ? "cursor-pointer" : "",
                  !n.is_read ? "bg-violet-50/40 hover:bg-violet-50" : "hover:bg-slate-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("text-slate-700", !n.is_read ? "font-semibold text-slate-900" : "")}>
                    {n.title}
                  </span>
                  {!n.is_read && (
                    <button 
                      onClick={(e) => handleMarkRead(n.id, e)}
                      title="Mark as read"
                      className="h-2 w-2 shrink-0 rounded-full bg-violet-600 mt-1 hover:bg-violet-700" 
                    />
                  )}
                </div>
                <span className="text-[11px] text-slate-600 line-clamp-2">{n.message}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              No notifications
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
