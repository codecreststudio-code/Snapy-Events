"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastProps,
} from "./toast"

type ToastVariant = "default" | "destructive" | "success" | "info"

interface ToastItem extends ToastProps {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToasterState {
  toasts: ToastItem[]
}

type Action =
  | { type: "ADD"; toast: ToastItem }
  | { type: "DISMISS"; id: string }
  | { type: "REMOVE"; id: string }

const listeners = new Set<(state: ToasterState) => void>()
let state: ToasterState = { toasts: [] }
let counter = 0

function dispatch(action: Action) {
  switch (action.type) {
    case "ADD":
      state = { toasts: [...state.toasts, action.toast] }
      break
    case "DISMISS":
      state = {
        toasts: state.toasts.map((t) => (t.id === action.id ? { ...t, open: false } : t)),
      }
      break
    case "REMOVE":
      state = { toasts: state.toasts.filter((t) => t.id !== action.id) }
      break
  }
  for (const l of listeners) l(state)
}

export function toast(input: Omit<ToastItem, "id">) {
  const id = String(++counter)
  dispatch({ type: "ADD", toast: { ...input, id, open: true } })
  const dur = input.duration ?? 4000
  if (dur > 0) setTimeout(() => dispatch({ type: "DISMISS", id }), dur)
  return id
}

toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: "success" })
toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: "destructive" })
toast.info = (title: string, description?: string) =>
  toast({ title, description, variant: "info" })

export function useToasts() {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
    () => state,
  )
}

export function Toaster() {
  const { toasts } = useToasts()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, ...rest }) => (
        <Toast key={id} variant={variant} {...rest} onOpenChange={(open) => {
          if (!open) dispatch({ type: "REMOVE", id })
        }}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>,
    document.body,
  )
}
