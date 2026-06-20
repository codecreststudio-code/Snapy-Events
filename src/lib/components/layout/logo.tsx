import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <img
        src="/logo_png.png"
        alt="Snapsy Logo"
        className="h-8 w-8 rounded-lg object-contain shadow-sm"
      />
      <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
        Snapsy
      </span>
    </div>
  )
}
