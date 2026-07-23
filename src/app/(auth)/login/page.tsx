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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { signIn, signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark px-4">
      <Card className="glass-panel w-full max-w-md border-hairline-dark">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center mb-4">
            <Logo />
          </Link>
          <CardTitle className="text-2xl font-playfair text-ink font-light">Welcome back</CardTitle>
          <CardDescription className="text-ink-secondary">Sign in to your Snapsy account</CardDescription>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-ink-secondary">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-mauve hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10 bg-mauve/5 border-hairline-dark text-ink placeholder:text-ink-tertiary focus:border-mauve focus:ring-mauve"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-mauve/50"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-hairline-dark" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-card px-2 text-ink-tertiary">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-hairline-dark text-ink hover:bg-mauve/5 focus-visible:ring-2 focus-visible:ring-mauve/50"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign in with Google
            </Button>

            <p className="text-sm text-ink-secondary text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-mauve hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}