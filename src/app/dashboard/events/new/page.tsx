import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth/session"
import { DashboardNav } from "@/lib/components/layout/dashboard-nav"
import { PageHeader } from "@/lib/components/layout/page-header"
import { NewEventForm } from "./new-event-form"

export const metadata = { title: "New event" }

export default async function NewEventPage() {
  const ctx = await getAuthContext()
  if (!ctx.user) redirect("/login")
  return (
    <div className="flex min-h-screen">
      <DashboardNav auth={ctx} />
      <main className="flex-1 px-6 py-8">
        <PageHeader
          title="Create a new event"
          description="Set the basics — you can refine everything later."
        />
        <div className="mt-6 max-w-2xl">
          <NewEventForm />
        </div>
      </main>
    </div>
  )
}