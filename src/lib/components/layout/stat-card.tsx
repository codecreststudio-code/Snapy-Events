"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card } from "@/lib/components/ui/card"

interface StatCardProps {
  label: string
  value: string | number
  delta?: { value: string; positive?: boolean }
  icon?: React.ReactNode
  href?: string
}

export function StatCard({ label, value, delta, icon, href }: StatCardProps) {
  const body = (
    <Card className="flex items-start justify-between p-5 transition-colors hover:bg-muted/40">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {delta && (
          <p className={cn("mt-2 text-xs", delta.positive ? "text-emerald-600" : "text-rose-600")}>
            {delta.positive ? "▲" : "▼"} {delta.value}
          </p>
        )}
      </div>
      {icon && <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>}
    </Card>
  )
  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    )
  }
  return body
}
