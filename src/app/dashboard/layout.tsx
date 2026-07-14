import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth/session"
import { DashboardSidebar } from "@/lib/components/layout"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext()

  if (!ctx.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="lg:pl-72">
        <div className="py-3 md:py-4 px-3 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}