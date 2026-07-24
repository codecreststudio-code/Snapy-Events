"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Loader2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"

export function MfaSettings() {
  const [factors, setFactors] = useState<any[]>([])
  const [qrCode, setQrCode] = useState("")
  const [factorId, setFactorId] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadFactors()
  }, [])

  async function loadFactors() {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      toast({ title: "Failed to load MFA factors", variant: "destructive" })
    } else {
      setFactors(data.totp || [])
    }
    setLoading(false)
  }

  async function onEnableMfa() {
    setActionLoading(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" })
    if (error) {
      toast({ title: "Failed to start MFA enrollment", description: error.message, variant: "destructive" })
      setActionLoading(false)
      return
    }
    
    setQrCode(data.totp.qr_code)
    setFactorId(data.id)
    setActionLoading(false)
  }

  async function onVerifyMfa(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading(true)
    
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error
      
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode
      })
      if (verify.error) throw verify.error
      
      toast({ title: "Two-Factor Authentication enabled successfully!" })
      setQrCode("")
      setVerifyCode("")
      loadFactors()
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  async function onDisableMfa(id: string) {
    setActionLoading(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) {
      toast({ title: "Failed to disable MFA", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "MFA disabled successfully" })
      loadFactors()
    }
    setActionLoading(false)
  }

  if (loading) {
    return <div className="text-sm text-ink-secondary">Loading MFA settings...</div>
  }

  const verifiedFactors = factors.filter(f => f.status === "verified")
  const isEnrolled = verifiedFactors.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-ink">Two-Factor Authentication</Label>
          <p className="text-sm text-ink-secondary">
            {isEnrolled ? "2FA is currently enabled for your account." : "Add an extra layer of security to your account"}
          </p>
        </div>
        {isEnrolled ? (
          <Button variant="destructive" onClick={() => onDisableMfa(verifiedFactors[0].id)} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Disable 2FA
          </Button>
        ) : (
          !qrCode && (
            <Button variant="outline" onClick={onEnableMfa} disabled={actionLoading} className="border-[#e5dfd0] bg-transparent text-ink-secondary hover:bg-mauve/5 hover:text-ink">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enable 2FA
            </Button>
          )
        )}
      </div>

      {qrCode && (
        <Card className="mt-4 rounded-2xl border border-mauve/20 bg-mauve/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-ink">Complete Enrollment</CardTitle>
            <CardDescription className="text-ink-secondary">
              Scan this QR code with your Authenticator App (Google Authenticator, Authy, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-[#EAE5DF]">
                <QRCodeSVG value={qrCode} size={150} />
              </div>
              <form onSubmit={onVerifyMfa} className="flex-1 space-y-4 w-full">
                <div className="grid gap-2">
                  <Label htmlFor="verify-code" className="text-ink-secondary">Verification Code</Label>
                  <Input
                    id="verify-code"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    required
                    className="max-w-[200px] bg-ink/5 border-[#e5dfd0] text-ink placeholder:text-ink-tertiary focus:border-mauve focus:ring-mauve"
                  />
                  <p className="text-xs text-ink-secondary">
                    Enter the 6-digit code from your app to verify.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={actionLoading || verifyCode.length < 6} className="rounded-full bg-mauve hover:bg-mauve-strong text-[#1a1410] font-semibold">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Verify and Enable
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setQrCode("")} disabled={actionLoading} className="text-ink-secondary hover:bg-mauve/5 hover:text-ink">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
