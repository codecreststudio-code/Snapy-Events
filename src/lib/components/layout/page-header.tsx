"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
  eyebrow?: string
}

export function PageHeader({ title, description, actions, eyebrow, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-[#3D332A] pb-6 md:flex-row md:items-end md:justify-between", className)} {...props}>
      <div className="space-y-1">
        {eyebrow && <p className="text-xs font-medium uppercase tracking-wider text-mauve">{eyebrow}</p>}
        <h1 className="font-playfair text-3xl font-light text-white tracking-tight">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-white/50">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
