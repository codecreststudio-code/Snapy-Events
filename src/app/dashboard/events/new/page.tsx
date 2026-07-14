import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth/session"
import { NewEventForm } from "./new-event-form"

export const metadata = { title: "New event" }

export default async function NewEventPage() {
  const ctx = await getAuthContext()
  if (!ctx.user) redirect("/login")
  return (
    <div className="w-full min-h-[calc(100vh-6rem)] flex flex-col justify-center overflow-hidden">
      <NewEventForm />
    </div>
  )
}