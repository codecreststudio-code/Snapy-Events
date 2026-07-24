import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary CTA — solid gold, dark ink text. Black-on-gold gives ~8.5:1
        // contrast (vs ~2.4:1 for white-on-gold, which fails WCAG AA even at
        // large text sizes) and reads as the classic luxury/jewelry
        // black-on-gold pairing rather than a flat corporate button.
        default: "bg-mauve text-[#1a1410] font-semibold hover:bg-mauve-strong shadow-lg shadow-mauve/20 hover:shadow-mauve/30",
        mauve: "bg-mauve text-[#1a1410] font-semibold hover:bg-mauve-strong shadow-lg shadow-mauve/20 hover:shadow-mauve/30",
        glass: "bg-white/5 border border-white/10 text-white backdrop-blur-md hover:bg-white/10 hover:border-mauve/30 hover:shadow-lg",
        gradient: "bg-gradient-to-br from-mauve-strong via-mauve to-mauve text-[#1a1410] font-semibold shadow-lg shadow-mauve/20 hover:shadow-mauve/35 hover:brightness-110",
        glow: "bg-mauve text-[#1a1410] font-semibold shadow-[0_0_28px_-4px_rgba(197,160,89,0.55)] hover:bg-mauve-strong hover:shadow-[0_0_34px_-4px_rgba(197,160,89,0.7)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20",
        outline: "border border-hairline-dark bg-surface-card/60 text-ink hover:bg-surface-card hover:text-ink hover:border-mauve/50",
        secondary: "bg-ink/5 text-ink hover:bg-ink/10 border border-hairline-dark",
        ghost: "text-ink-secondary hover:bg-mauve/10 hover:text-mauve-strong",
        link: "text-mauve underline-offset-4 hover:underline hover:text-mauve-strong",
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