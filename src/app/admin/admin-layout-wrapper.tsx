"use client"

import { usePathname } from "next/navigation"
import { AdminNav } from "@/lib/components/layout/admin-nav"
import { AdminTopNav } from "@/lib/components/layout/admin-topnav"

import { redirect } from "next/navigation"

type AdminLayoutWrapperProps = {
  children: React.ReactNode
  needsMfa?: boolean
  user?: any
  isAdmin?: boolean
  isOwner?: boolean
  initialTheme?: string
}

export function AdminLayoutWrapper({ 
  children, 
  needsMfa = false,
  user,
  isAdmin = false,
  isOwner = false,
  initialTheme = "light"
}: AdminLayoutWrapperProps) {
  const pathname = usePathname() ?? ""
  const isLoginPage = pathname.startsWith("/admin/login")
  const isMfaPage = pathname.startsWith("/admin/mfa")

  if (needsMfa && !isMfaPage && !isLoginPage) {
    redirect("/admin/mfa")
  }

  if (isLoginPage || isMfaPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-dark text-white">
      <AdminNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopNav
          user={user}
          isAdmin={isAdmin}
          isOwner={isOwner}
          initialTheme={initialTheme}
        />
        <div className="flex-1 overflow-y-auto bg-surface-dark">
          {children}
        </div>
      </div>
    </div>
  )
}

