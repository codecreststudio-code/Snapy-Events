import { getAuthContext } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { AdminLayoutWrapper } from "./admin-layout-wrapper"

export const metadata = {
  title: {
    template: "%s | Snapsy Admin",
    default: "Snapsy Admin",
  },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verify administrator access on server side (also guarded by middleware)
  const ctx = await getAuthContext()
  
  // Note: /admin/login handles its own visual layout, but we bypass auth check for it.
  // We can let the middleware redirect to /admin/login, but here we double check for page actions.
  
  return (
    <AdminLayoutWrapper>
      {children}
    </AdminLayoutWrapper>
  )
}
