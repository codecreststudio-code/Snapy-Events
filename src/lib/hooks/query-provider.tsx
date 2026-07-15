"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Short staleTime + refetch-on-focus/mount means switching between
            // dashboard pages (or tabs) picks up changes made elsewhere without
            // needing a hard browser refresh. Individual queries that need
            // tighter live updates (e.g. guest photo uploads) still layer their
            // own refetchInterval / Supabase Realtime subscription on top.
            staleTime: 15 * 1000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}