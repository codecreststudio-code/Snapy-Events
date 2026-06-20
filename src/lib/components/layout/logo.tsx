import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center font-semibold tracking-tight", className)}>
      <img
        src="/logo_png.png"
        alt="Snapsy Logo"
        className="h-8 w-auto object-contain"
      />
    </div>
  )
}
