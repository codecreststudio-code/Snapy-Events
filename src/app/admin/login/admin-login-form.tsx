"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"

export function AdminLoginForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true); setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      })
      if (!res.ok) {
        const data = await res.json()
        const errMsg = typeof data.error === "object" && data.error?.message 
          ? data.error.message 
          : (data.error ?? "Failed")
        throw new Error(errMsg)
      }
      router.push("/admin")
      router.refresh()
    } catch (e: any) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
      <div className="grid gap-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  )
}
