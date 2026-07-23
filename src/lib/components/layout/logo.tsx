import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <img
        src="/Logo.png"
        alt="Snapsy Events"
        className="h-9 w-auto object-contain shrink-0"
      />
    </div>
  )
}
