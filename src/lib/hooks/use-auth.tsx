"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, createContext, useContext, useCallback } from "react"
import type { User as SupabaseUser, Session } from "@supabase/supabase-js"
import type { User as DatabaseUser } from "@/lib/types"

// Supabase's auth-js client sometimes falls back to JSON.stringify-ing a raw
// (and occasionally empty) error body when the Auth server's response
// doesn't match its expected shape — e.g. when the server-side mailer itself
// fails (SMTP not configured, rate-limited, etc.) and returns a malformed
// error. Without this guard, pages render that raw text verbatim (users have
// seen a literal "{}" in the error banner), which is confusing and leaks
// nothing useful. Fall back to a generic, readable message instead.
function toFriendlyAuthError(message: string | null | undefined, fallback = "Something went wrong. Please try again."): string {
  const trimmed = (message ?? "").trim()
  if (!trimmed || trimmed === "{}" || trimmed === "[object Object]" || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    return fallback
  }
  return trimmed
}

interface AuthContextType {
  user: SupabaseUser | null
  session: Session | null
  profile: DatabaseUser | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<DatabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (!error && data) {
      setProfile(data as DatabaseUser)
    }
  }, [supabase])

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user.id)
      }

      setIsLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(toFriendlyAuthError(error.message, "Invalid email or password.")) : null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      })

      const resData = await res.json()
      if (!res.ok) {
        throw new Error(toFriendlyAuthError(resData.error?.message ?? resData.error, "Failed to sign up."))
      }

      // Explicitly sign in using client-side to set session and cookies in the browser
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        return { error: new Error(toFriendlyAuthError(signInError.message, "Signed up, but sign-in failed — please log in manually.")) }
      }

      return { error: null }
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(toFriendlyAuthError(err?.message, "Failed to sign up.")) }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return {
      error: error
        ? new Error(toFriendlyAuthError(error.message, "Couldn't send the reset email right now. Please try again in a bit."))
        : null,
    }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? new Error(toFriendlyAuthError(error.message, "Couldn't update your password. Please try again.")) : null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    return { error: error ? new Error(toFriendlyAuthError(error.message, "Google sign-in failed. Please try again.")) : null }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}