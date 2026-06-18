import * as React from "react"
import { cn } from "@/lib/utils"

const Empty = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
      className,
    )}
    {...props}
  />
)
Empty.displayName = "Empty"

const EmptyHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex max-w-sm flex-col items-center gap-2", className)} {...props} />
)
EmptyHeader.displayName = "EmptyHeader"

const EmptyTitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <h3 className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
)
EmptyTitle.displayName = "EmptyTitle"

const EmptyDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)
EmptyDescription.displayName = "EmptyDescription"

const EmptyContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex items-center gap-2", className)} {...props} />
)
EmptyContent.displayName = "EmptyContent"

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent }
