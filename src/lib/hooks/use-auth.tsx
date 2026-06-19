"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, createContext, useContext, useCallback } from "react"
import type { User, Session } from "@supabase/supabase-js"
import type { UserWithOrganization } from "@/lib/types"

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserWithOrganization | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, orgName: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserWithOrganization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*, organization:organizations(*)")
      .eq("id", userId)
      .single()

    if (!error && data) {
      if (!data.organization_id) {
        const userEmail = data.email || ""
        const fullName = data.full_name || userEmail.split("@")[0] || "User"
        const orgName = `${fullName}'s Workspace`
        const orgSlug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36).slice(-4)}`

        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({ name: orgName, slug: orgSlug, plan: "free" })
          .select()
          .single()

        if (!orgError && org) {
          const { error: updateError } = await supabase
            .from("users")
            .update({ organization_id: org.id, role: "owner", permissions: ["*"] })
            .eq("id", userId)

          if (!updateError) {
            const { data: updatedData } = await supabase
              .from("users")
              .select("*, organization:organizations(*)")
              .eq("id", userId)
              .single()
            if (updatedData) {
              setProfile(updatedData as UserWithOrganization)
              return
            }
          }
        }
      }
      setProfile(data as UserWithOrganization)
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
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, fullName: string, orgName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) return { error: new Error(error.message) }

    if (data.user) {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName, slug })
        .select()
        .single()

      if (orgError) return { error: new Error(orgError.message) }

      const { error: userError } = await supabase
        .from("users")
        .upsert({
          id: data.user.id,
          organization_id: org.id,
          full_name: fullName,
          role: "owner",
          permissions: ["*"],
        })

      if (userError) return { error: new Error(userError.message) }
    }

    return { error: null }
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
    return { error: error ? new Error(error.message) : null }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? new Error(error.message) : null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    return { error: error ? new Error(error.message) : null }
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