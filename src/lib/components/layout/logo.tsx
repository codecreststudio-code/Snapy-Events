import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <img
        src="/logo_png.png"
        alt="Snapsy Events"
        className="h-10 w-auto object-contain shrink-0"
      />
    </div>
  )
}
