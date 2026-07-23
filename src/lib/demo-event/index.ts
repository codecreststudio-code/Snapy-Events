import { DEMO_TEMPLATES, type DemoEventTemplate, type DemoMediaItem } from "./templates"
import { toast } from "@/lib/components/ui/toaster"

export * from "./templates"

const DEMO_STORAGE_KEY = "snapsy_active_demo_template"

export function getActiveDemoTemplate(templateId?: string): DemoEventTemplate {
  if (templateId && DEMO_TEMPLATES[templateId]) {
    return DEMO_TEMPLATES[templateId]
  }

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY)
    if (saved && DEMO_TEMPLATES[saved]) {
      return DEMO_TEMPLATES[saved]
    }
  }

  return DEMO_TEMPLATES.wedding
}

export function setActiveDemoTemplate(templateId: string): void {
  if (typeof window !== "undefined" && DEMO_TEMPLATES[templateId]) {
    localStorage.setItem(DEMO_STORAGE_KEY, templateId)
  }
}

export function handleDemoReadOnlyAction(actionName: string): void {
  toast({
    title: "✨ Sample Event (Demo Mode)",
    description: `You are exploring a sample event! "${actionName}" is simulated. Create your own event to upload and save real memories.`,
    variant: "default",
  })
}

export function filterDemoMedia(
  media: DemoMediaItem[],
  filter: { category?: string; type?: string; searchQuery?: string }
): DemoMediaItem[] {
  return media.filter((item) => {
    if (filter.category && filter.category !== "all" && item.category !== filter.category) {
      return false
    }
    if (filter.type && filter.type !== "all" && item.type !== filter.type) {
      return false
    }
    if (filter.searchQuery && filter.searchQuery.trim() !== "") {
      const q = filter.searchQuery.toLowerCase()
      const titleMatch = item.title.toLowerCase().includes(q)
      const guestMatch = item.guestName.toLowerCase().includes(q)
      const commentsMatch = item.comments.some((c) => c.text.toLowerCase().includes(q))
      if (!titleMatch && !guestMatch && !commentsMatch) return false
    }
    return true
  })
}
