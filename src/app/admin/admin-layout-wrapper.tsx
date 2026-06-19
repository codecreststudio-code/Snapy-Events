"use client"

import { usePathname } from "next/navigation"
import { AdminNav } from "@/lib/components/layout/admin-nav"

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""
  const isLoginPage = pathname === "/admin/login"

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <AdminNav />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
