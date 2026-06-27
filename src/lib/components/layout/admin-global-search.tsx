"use client"

import * as React from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/lib/components/ui/input"
import { searchAdminGlobal, GlobalSearchResult } from "@/app/actions/admin-search"
import { useRouter } from "next/navigation"

export function AdminGlobalSearch() {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<GlobalSearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsSearching(true)
        const data = await searchAdminGlobal(query)
        setResults(data)
        setIsSearching(false)
        setIsOpen(true)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="flex flex-1 items-center max-w-md relative" ref={wrapperRef}>
      <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
      <Input
        type="search"
        placeholder="Search organizations, users, events..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (query.trim().length >= 2) setIsOpen(true) }}
        className="pl-9 pr-8 py-1.5 w-full bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus-visible:ring-violet-500 focus-visible:border-violet-500 focus-visible:bg-white transition-colors"
      />
      {isSearching && (
        <Loader2 className="absolute right-3 h-4 w-4 text-slate-400 animate-spin pointer-events-none" />
      )}
      {!isSearching && (
        <div className="absolute right-3 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 rounded border border-slate-200 pointer-events-none">
          <span>⌘</span>
          <span>K</span>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              <div className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Results</div>
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => {
                    router.push(result.link)
                    setIsOpen(false)
                    setQuery("")
                  }}
                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                >
                  <span className="text-sm font-medium text-slate-900">{result.title}</span>
                  <span className="text-xs text-slate-500 capitalize">{result.type} &bull; {result.subtitle}</span>
                </div>
              ))}
            </div>
          ) : query.trim().length >= 2 && !isSearching ? (
            <div className="p-4 text-sm text-center text-slate-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
