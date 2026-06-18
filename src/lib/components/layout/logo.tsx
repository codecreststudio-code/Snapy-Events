import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-600 text-white shadow-sm">
        <span className="text-sm font-bold">S</span>
      </div>
      <span className="text-lg">Snapsy</span>
    </div>
  )
}
