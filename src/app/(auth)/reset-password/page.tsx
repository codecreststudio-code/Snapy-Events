"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { useAuth } from "@/lib/hooks"
import { Logo } from "@/lib/components/layout/logo"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { updatePassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    setError("")

    const { error } = await updatePassword(password)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
      <Card className="glass-panel w-full max-w-md border-hairline-dark">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center mb-4">
            <Logo />
          </Link>
          <CardTitle className="text-2xl font-playfair text-white font-light">Set New Password</CardTitle>
          <CardDescription className="text-white/50">Enter your new password below</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10 bg-white/5 border-hairline-dark text-white placeholder:text-white/40 focus:border-mauve focus:ring-mauve"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white/70">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                className="bg-white/5 border-hairline-dark text-white placeholder:text-white/40 focus:border-mauve focus:ring-mauve"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-mauve/50"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>

            <p className="text-sm text-white/50 text-center">
              Remember your password?{" "}
              <Link href="/login" className="text-mauve hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}