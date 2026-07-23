import { cn } from "@/lib/utils"

export function Logo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <img
        src="/logo_png.png"
        alt="Snapsy Events"
        className={cn("h-12 min-[380px]:h-13 sm:h-14 md:h-15 max-h-[58px] w-auto object-contain shrink-0 transition-transform duration-200 hover:scale-[1.02]", imgClassName)}
      />
    </div>
  )
}
