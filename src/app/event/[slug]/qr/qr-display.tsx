"use client"

import { useEffect, useState } from "react"
import { Card } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Download, Printer } from "lucide-react"

export function QrDisplay({ eventName, url }: { eventName: string; url: string }) {
  const [png, setPng] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/qr/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: url, size: 1024 }) })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPng(d.data?.png ?? null) })
      .catch(() => null)
    return () => { cancelled = true }
  }, [url])
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{eventName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Scan to upload & view photos</p>
      <Card className="mt-6 inline-block p-6">
        {png ? <img src={png} alt="QR code" className="h-64 w-64" /> : <div className="h-64 w-64 animate-pulse rounded bg-muted" />}
      </Card>
      <p className="mt-4 break-all text-xs text-muted-foreground">{url}</p>
      <div className="mt-6 flex justify-center gap-2">
        {png && <Button asChild variant="outline"><a href={png} download={`${eventName}-qr.png`}><Download className="mr-1 h-4 w-4" />Download</a></Button>}
        <Button onClick={() => window.print()} variant="outline"><Printer className="mr-1 h-4 w-4" />Print</Button>
      </div>
    </div>
  )
}
