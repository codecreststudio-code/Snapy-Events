"use client"

import { usePathname } from "next/navigation"
import { AdminNav } from "@/lib/components/layout/admin-nav"
import { AdminTopNav } from "@/lib/components/layout/admin-topnav"

import { redirect } from "next/navigation"

export function AdminLayoutWrapper({ children, needsMfa = false }: { children: React.ReactNode, needsMfa?: boolean }) {
  const pathname = usePathname() ?? ""
  const isLoginPage = pathname === "/admin/login"
  const isMfaPage = pathname === "/admin/mfa"

  if (needsMfa && !isMfaPage && !isLoginPage) {
    redirect("/admin/mfa")
  }

  if (isLoginPage || isMfaPage) {
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

