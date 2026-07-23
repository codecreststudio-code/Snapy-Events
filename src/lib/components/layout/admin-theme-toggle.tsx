"use client"

import * as React from "react"
import { Sun, Moon, Laptop } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { saveAdminTheme } from "@/app/actions/admin-theme"

// Snapsy is a light-mode-only product (2026 Amber Noir Light rebrand) — there
// is no dark theme designed anywhere in the app anymore, so this no longer
// toggles document.documentElement's "dark" class (that would only flip
// shadcn's base --background/--foreground tokens, producing a broken
// half-dark admin shell). It still records the admin's stored preference via
// saveAdminTheme for continuity, but always keeps the document in light mode.

type Theme = "light" | "dark" | "system"

export function AdminThemeToggle({ initialTheme = "light" }: { initialTheme?: string }) {
  const [theme, setTheme] = React.useState<Theme>(initialTheme as Theme)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const toggleTheme = async () => {
    if (isUpdating) return
    setIsUpdating(true)

    const nextTheme: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(nextTheme)

    // Light-mode-only product: never actually apply a "dark" class.
    document.documentElement.classList.remove("dark")

    await saveAdminTheme(nextTheme)
    setIsUpdating(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={isUpdating}
      className="h-9 w-9 text-ink-secondary hover:bg-mauve/5 hover:text-ink rounded-lg transition-colors"
      title={`Current Theme: ${theme} (light mode only)`}
    >
      {theme === "light" ? (
        <Sun className="h-5 w-5 text-mauve" />
      ) : theme === "dark" ? (
        <Moon className="h-5 w-5 text-mauve" />
      ) : (
        <Laptop className="h-5 w-5 text-ink-tertiary" />
      )}
    </Button>
  )
}
