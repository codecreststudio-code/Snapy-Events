import { getAuthContext } from "@/lib/auth/session"
import { MfaSettings } from "@/app/dashboard/settings/mfa-settings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Shield } from "lucide-react"

export const metadata = {
  title: "Security Settings | Snapsy Admin",
}

export default async function AdminSecurityPage() {
  const ctx = await getAuthContext()
  
  return (
    <main className="px-6 py-8 space-y-6 max-w-3xl bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your Two-Factor Authentication (2FA) to secure your admin account.</p>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
            <Shield className="h-5 w-5 text-violet-650" />
            <span>Two-Factor Authentication</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs font-semibold leading-relaxed">
            Protect your admin account with TOTP (Time-based One-Time Password).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaSettings />
        </CardContent>
      </Card>
    </main>
  )
}
