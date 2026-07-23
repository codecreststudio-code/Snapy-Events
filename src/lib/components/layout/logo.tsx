import { cn } from "@/lib/utils"

export function Logo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <img
        src="/logo_png.png"
        alt="Snapsy Events"
        className={cn("h-16 min-[380px]:h-20 sm:h-22 md:h-24 max-h-[84px] w-auto object-contain shrink-0 transition-transform duration-200 hover:scale-[1.02]", imgClassName)}
      />
    </div>
  )
}
