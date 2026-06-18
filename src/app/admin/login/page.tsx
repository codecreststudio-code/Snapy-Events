import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { Card } from "@/lib/components/ui/card"
import { AdminLoginForm } from "./admin-login-form"

export const metadata = { title: "Admin sign in" }

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <Card className="w-full max-w-sm p-6">
          <h1 className="text-xl font-semibold">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform administrators only.</p>
          <div className="mt-6"><AdminLoginForm /></div>
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}
