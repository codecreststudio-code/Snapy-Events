"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import {
  User,
  Shield,
  Lock,
  ShieldCheck,
  Loader2,
  Settings
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function AdminProfileClient({ user, profile }: { user: any, profile: any }) {
  const supabase = createClient()
  
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  // 2FA State
  const [mfaStatus, setMfaStatus] = useState<"loading" | "enrolled" | "unenrolled">("loading")
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [loadingMfa, setLoadingMfa] = useState(false)

  useEffect(() => {
    checkMfaStatus()
  }, [])

  const checkMfaStatus = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (!error && data) {
      if (data.nextLevel === "aal2" || data.currentLevel === "aal2") {
        setMfaStatus("enrolled")
        // Need to find the factor ID
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const activeFactor = factors?.totp?.find(f => f.status === 'verified')
        if (activeFactor) setMfaFactorId(activeFactor.id)
      } else {
        setMfaStatus("unenrolled")
      }
    } else {
      setMfaStatus("unenrolled")
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingProfile(true)
    const { error } = await supabase.from("users").update({ full_name: fullName }).eq("id", user.id)
    setLoadingProfile(false)
    
    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Profile Updated", description: "Your admin profile details have been saved." })
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({ title: "Passwords Mismatch", description: "The passwords you entered do not match.", variant: "destructive" })
      return
    }
    if (password.length < 8) {
      toast({ title: "Password Too Weak", description: "Use at least 8 characters.", variant: "destructive" })
      return
    }

    setLoadingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoadingPassword(false)

    if (error) {
      toast({ title: "Password Update Failed", description: error.message, variant: "destructive" })
    } else {
      setPassword("")
      setConfirmPassword("")
      toast({ title: "Password Updated", description: "Your new password has been securely saved." })
    }
  }

  const handleEnrollMfa = async () => {
    setLoadingMfa(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) {
      toast({ title: "Enrollment Failed", description: error.message, variant: "destructive" })
      setLoadingMfa(false)
      return
    }
    
    setMfaFactorId(data.id)
    setQrCodeUrl(data.totp.qr_code)
    setLoadingMfa(false)
  }

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaFactorId || !totpCode) return
    
    setLoadingMfa(true)
    const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (challenge.error) {
      toast({ title: "Challenge Failed", description: challenge.error.message, variant: "destructive" })
      setLoadingMfa(false)
      return
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.data.id,
      code: totpCode
    })

    setLoadingMfa(false)
    if (verify.error) {
      toast({ title: "Verification Failed", description: "Invalid code. Please try again.", variant: "destructive" })
    } else {
      setMfaStatus("enrolled")
      setQrCodeUrl(null)
      setTotpCode("")
      toast({ title: "2FA Enabled", description: "Two-factor authentication is now required for your account." })
    }
  }

  const handleUnenrollMfa = async () => {
    if (!mfaFactorId) return
    if (!confirm("Are you sure you want to disable Two-Factor Authentication? Your admin account will be less secure.")) return

    setLoadingMfa(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
    setLoadingMfa(false)

    if (error) {
      toast({ title: "Disabling Failed", description: error.message, variant: "destructive" })
    } else {
      setMfaStatus("unenrolled")
      setMfaFactorId(null)
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed." })
    }
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-5xl bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Profile Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your identity, security credentials, and two-factor authentication.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
              <User className="h-5 w-5 text-violet-650" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Email Address</Label>
                <Input value={user.email} disabled className="bg-slate-50 border-slate-200 text-slate-500 shadow-sm" />
                <p className="text-[10px] text-slate-400">Email cannot be changed directly from the admin panel.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Full Name</Label>
                <Input 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 shadow-sm focus:border-violet-600 focus:ring-violet-600" 
                />
              </div>
              <Button type="submit" disabled={loadingProfile} className="bg-slate-900 hover:bg-slate-800 w-full mt-2">
                {loadingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
              <Lock className="h-5 w-5 text-violet-650" />
              <span>Security & Password</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">New Password</Label>
                <Input 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 shadow-sm focus:border-violet-600 focus:ring-violet-600" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Confirm Password</Label>
                <Input 
                  type="password"
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 shadow-sm focus:border-violet-600 focus:ring-violet-600" 
                />
              </div>
              <Button type="submit" disabled={loadingPassword} className="bg-slate-900 hover:bg-slate-800 w-full mt-2">
                {loadingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 2FA Card */}
        <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
              <Shield className="h-5 w-5 text-violet-650" />
              <span>Two-Factor Authentication (2FA)</span>
            </CardTitle>
            <CardDescription className="text-slate-500">
              Add an additional layer of security to your admin account by requiring an authenticator code (TOTP) upon login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mfaStatus === "loading" ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking security status...
              </div>
            ) : mfaStatus === "enrolled" ? (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900">2FA is Currently Enabled</h4>
                    <p className="text-sm text-emerald-700">Your account is secured with a TOTP Authenticator.</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleUnenrollMfa} disabled={loadingMfa} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  {loadingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Disable 2FA"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {!qrCodeUrl ? (
                  <div>
                    <p className="text-sm text-slate-600 mb-4">2FA is currently disabled. We highly recommend enabling it for administrative accounts.</p>
                    <Button onClick={handleEnrollMfa} disabled={loadingMfa} className="bg-violet-600 hover:bg-violet-700">
                      {loadingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Setup Authenticator App
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div className="space-y-4 text-center">
                      <p className="text-sm font-semibold text-slate-800">1. Scan this QR Code with your Authenticator App</p>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block">
                        <img src={qrCodeUrl} alt="QR Code for 2FA" className="w-48 h-48" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-slate-800">2. Verify the 6-digit code</p>
                      <form onSubmit={handleVerifyMfa} className="space-y-3">
                        <Input 
                          placeholder="e.g. 123456" 
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value)}
                          className="text-center text-lg tracking-widest bg-white"
                          maxLength={6}
                        />
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setQrCodeUrl(null)} className="w-full">Cancel</Button>
                          <Button type="submit" disabled={loadingMfa || totpCode.length < 6} className="w-full bg-emerald-600 hover:bg-emerald-700">
                            {loadingMfa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Verify Code
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
