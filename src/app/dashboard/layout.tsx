import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth/session"
import { DashboardSidebar } from "@/lib/components/layout"
import { DashboardMain } from "@/lib/components/layout/dashboard-main"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext()

  if (!ctx.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-surface-dark">
      <DashboardSidebar />
      <DashboardMain>{children}</DashboardMain>
    </div>
  )
}