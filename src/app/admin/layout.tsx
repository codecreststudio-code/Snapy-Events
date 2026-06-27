import { getAuthContext } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { AdminLayoutWrapper } from "./admin-layout-wrapper"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: {
    template: "%s | Snapsy Admin",
    default: "Snapsy Admin",
  },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verify administrator access on server side (also guarded by middleware)
  const ctx = await getAuthContext()
  
  if (ctx.user) {
    const supabase = await createClient()
    const { data: authLevel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    
    // If the user has set up 2FA (nextLevel is aal2) but hasn't verified it yet in this session
    if (authLevel?.nextLevel === 'aal2' && authLevel?.currentLevel !== 'aal2') {
      redirect("/admin/mfa")
    }
  }

  
  return (
    <AdminLayoutWrapper>
      {children}
    </AdminLayoutWrapper>
  )
}
