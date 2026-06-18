"use client"

import { useState } from "react"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Textarea } from "@/lib/components/ui/textarea"
import { Label } from "@/lib/components/ui/label"

export function ContactForm() {
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/contact", { method: "POST", body: fd })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send")
    } finally {
      setPending(false)
    }
  }

  if (done) return <p className="text-sm text-primary">Thanks — we'll be in touch.</p>

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
      <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
      <div className="grid gap-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" rows={5} required /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
    </form>
  )
}
