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
  // Verify administrator access on server side. A logged-in non-admin has no
  // business in the admin tree — bounce them to the app (loop-safe: the login
  // page is reached by unauthenticated visitors, who have no ctx.user here).
  const ctx = await getAuthContext()
  if (ctx.user && !ctx.isAdmin) redirect("/")

  let needsMfa = false
  let theme = "light"
  if (ctx.user) {
    const supabase = await createClient()
    const { data: authLevel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    needsMfa = authLevel?.nextLevel === 'aal2' && authLevel?.currentLevel !== 'aal2'

    // Get user theme preference from auth metadata
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.theme) {
      theme = user.user_metadata.theme
    }
  }

  return (
    <AdminLayoutWrapper 
      needsMfa={needsMfa} 
      user={ctx.user}
      isAdmin={ctx.isAdmin}
      isOwner={ctx.role === "owner"}
      initialTheme={theme}
    >
      {children}
    </AdminLayoutWrapper>
  )
}
