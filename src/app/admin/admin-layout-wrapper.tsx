"use client"

import { usePathname } from "next/navigation"
import { AdminNav } from "@/lib/components/layout/admin-nav"
import { AdminTopNav } from "@/lib/components/layout/admin-topnav"

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""
  const isLoginPage = pathname === "/admin/login"

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <AdminNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopNav />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

