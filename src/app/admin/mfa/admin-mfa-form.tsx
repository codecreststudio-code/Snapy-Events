"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export function AdminMfaForm() {
  const router = useRouter()
  const supabase = createClient()
  
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [factorId, setFactorId] = useState<string | null>(null)
  
  useEffect(() => {
    async function initMfa() {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.find(f => f.status === 'verified')
      if (totpFactor) {
        setFactorId(totpFactor.id)
      } else {
        // No verified MFA found
        setError("No active Authenticator App found for your account.")
      }
    }
    initMfa()
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!factorId) return
    
    setPending(true)
    setError(null)
    
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) {
        throw challenge.error
      }
      
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code
      })
      
      if (verify.error) {
        throw verify.error
      }
      
      // Verification successful, refresh and go to admin
      router.push("/admin")
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Verification failed. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="code">Authenticator Code</Label>
        <Input 
          id="code" 
          name="code" 
          type="text" 
          required 
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          className="text-center tracking-widest text-lg"
          autoComplete="one-time-code"
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full bg-mauve hover:bg-mauve-strong" disabled={pending || code.length < 6 || !factorId}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {pending ? "Verifying…" : "Verify Code"}
      </Button>
      
      <div className="text-center mt-4">
        <Button variant="ghost" type="button" onClick={async () => {
          await supabase.auth.signOut()
          router.push("/admin/login")
        }} className="text-xs text-white/50 hover:text-white/70">
          Sign in as a different user
        </Button>
      </div>
    </form>
  )
}
