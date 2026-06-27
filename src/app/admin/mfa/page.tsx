import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { Card } from "@/lib/components/ui/card"
import { AdminMfaForm } from "./admin-mfa-form"

export const metadata = { title: "Two-Factor Authentication" }

export default function AdminMfaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <Card className="w-full max-w-sm p-6">
          <h1 className="text-xl font-semibold">Two-Factor Authentication</h1>
          <p className="mt-1 text-sm text-muted-foreground">Please verify your identity using your authenticator app.</p>
          <div className="mt-6"><AdminMfaForm /></div>
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}
