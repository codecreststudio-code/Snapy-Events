"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { useAuth } from "@/lib/hooks"
import { Logo } from "@/lib/components/layout/logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
        <Card className="glass-panel w-full max-w-md border-hairline-dark">
          <CardHeader className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mauve/10 mx-auto mb-4">
              <Mail className="h-6 w-6 text-mauve" />
            </div>
            <CardTitle className="text-2xl font-playfair text-ink font-light">Check your email</CardTitle>
            <CardDescription className="text-ink-secondary">
              We&apos;ve sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login">
              <Button variant="outline" className="border-hairline-dark text-ink hover:bg-mauve/5 focus-visible:ring-2 focus-visible:ring-mauve/50">Back to Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
      <Card className="glass-panel w-full max-w-md border-hairline-dark">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center mb-4">
            <Logo />
          </Link>
          <CardTitle className="text-2xl font-playfair text-ink font-light">Forgot Password</CardTitle>
          <CardDescription className="text-ink-secondary">
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-ink-secondary">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-mauve/5 border-hairline-dark text-ink placeholder:text-ink-tertiary focus:border-mauve focus:ring-mauve"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-mauve/50"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>

            <p className="text-sm text-ink-secondary text-center">
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