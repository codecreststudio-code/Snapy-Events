import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-mauve text-[#faf6ed] font-semibold hover:bg-mauve-strong shadow-lg shadow-mauve/15 hover:shadow-mauve/30",
        mauve: "bg-mauve text-[#faf6ed] font-semibold hover:bg-mauve-strong shadow-lg shadow-mauve/20 hover:shadow-mauve/40",
        glass: "bg-mauve/5 border border-hairline-dark text-ink backdrop-blur-md hover:bg-mauve/10 hover:border-mauve/30 hover:shadow-lg hover:shadow-mauve/5",
        gradient: "bg-gradient-to-r from-mauve via-amber-200/80 to-mauve text-[#faf6ed] font-semibold hover:brightness-110 shadow-lg shadow-mauve/25",
        glow: "bg-mauve text-[#faf6ed] font-semibold shadow-[0_0_20px_rgba(184,146,90,0.4)] hover:shadow-[0_0_30px_rgba(184,146,90,0.6)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20",
        outline: "border border-hairline-dark bg-surface-card/60 text-ink hover:bg-surface-card hover:text-ink hover:border-mauve/40",
        secondary: "bg-ink/5 text-ink hover:bg-ink/10 border border-hairline-dark",
        ghost: "text-ink-secondary hover:bg-mauve/5 hover:text-ink",
        link: "text-mauve underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 min-h-[44px]",
        sm: "h-9 rounded-full px-3.5 text-xs min-h-[36px]",
        lg: "h-12 rounded-full px-8 text-base min-h-[48px]",
        icon: "h-11 w-11 rounded-full min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }