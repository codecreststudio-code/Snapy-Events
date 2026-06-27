"use client"

import * as React from "react"
import { Sun, Moon, Laptop } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { saveAdminTheme } from "@/app/actions/admin-theme"

// Note: To truly support dark mode, the application would need next-themes
// and tailwind dark mode configuration. This component stores the preference 
// and toggles the UI to simulate the feature.

type Theme = "light" | "dark" | "system"

export function AdminThemeToggle({ initialTheme = "light" }: { initialTheme?: string }) {
  const [theme, setTheme] = React.useState<Theme>(initialTheme as Theme)
  const [isUpdating, setIsUpdating] = React.useState(false)

  const toggleTheme = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    
    const nextTheme: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    setTheme(nextTheme)
    
    // Simulate applying theme to document
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else if (nextTheme === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }

    await saveAdminTheme(nextTheme)
    setIsUpdating(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={isUpdating}
      className="h-9 w-9 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
      title={`Current Theme: ${theme}`}
    >
      {theme === "light" ? (
        <Sun className="h-5 w-5 text-amber-500" />
      ) : theme === "dark" ? (
        <Moon className="h-5 w-5 text-indigo-500" />
      ) : (
        <Laptop className="h-5 w-5 text-slate-500" />
      )}
    </Button>
  )
}
