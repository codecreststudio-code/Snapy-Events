"use client"

import * as React from "react"
import { Users, Search, Loader2, LayoutDashboard, Building2, Calendar, Image, CreditCard, Ticket, FileText } from "lucide-react"
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

  const groupedResults = React.useMemo(() => {
    const groups: Record<string, GlobalSearchResult[]> = {
      module: [],
      database: []
    }
    results.forEach(r => {
      if (r.type === 'module') {
        groups.module.push(r)
      } else {
        groups.database.push(r)
      }
    })
    return groups
  }, [results])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'module': return <LayoutDashboard className="h-4 w-4 text-mauve" />
      case 'organization': return <Building2 className="h-4 w-4 text-blue-500" />
      case 'user': return <Users className="h-4 w-4 text-emerald-500" />
      case 'event': return <Calendar className="h-4 w-4 text-amber-500" />
      case 'gallery': return <Image className="h-4 w-4 text-pink-500" />
      case 'subscription': return <CreditCard className="h-4 w-4 text-indigo-500" />
      case 'ticket': return <Ticket className="h-4 w-4 text-rose-500" />
      default: return <FileText className="h-4 w-4 text-ink-tertiary" />
    }
  }

  return (
    <div className="flex flex-1 items-center max-w-md relative" ref={wrapperRef}>
      <Search className="absolute left-3 h-4 w-4 text-ink-tertiary pointer-events-none" />
      <Input
        type="search"
        placeholder="Search everything... (modules, users, events)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (query.trim().length >= 2) setIsOpen(true) }}
        className="pl-9 pr-8 py-1.5 w-full bg-ink/5 border-hairline-dark rounded-lg text-sm text-ink placeholder:text-ink-tertiary focus-visible:ring-mauve/50 focus-visible:border-mauve transition-colors"
      />
      {isSearching && (
        <Loader2 className="absolute right-3 h-4 w-4 text-ink-tertiary animate-spin pointer-events-none" />
      )}
      {!isSearching && (
        <div className="absolute right-3 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-ink-tertiary bg-ink/5 rounded border border-hairline-dark pointer-events-none">
          <span>⌘</span>
          <span>K</span>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-card-elevated border border-hairline-dark rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {groupedResults.module.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 pb-1.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Navigation Modules</div>
                  {groupedResults.module.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => { router.push(result.link); setIsOpen(false); setQuery(""); }}
                      className="px-3 py-2 mx-1 rounded-lg hover:bg-mauve/5 cursor-pointer flex items-center gap-3 transition-colors"
                    >
                      <div className="shrink-0 p-1.5 bg-mauve/10 rounded-md">
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-sm font-semibold text-ink truncate">{result.title}</span>
                        <span className="text-[11px] text-ink-secondary truncate">{result.subtitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {groupedResults.database.length > 0 && (
                <div>
                  <div className="px-3 pb-1.5 pt-2 border-t border-hairline-dark text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Database Records</div>
                  {groupedResults.database.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => { router.push(result.link); setIsOpen(false); setQuery(""); }}
                      className="px-3 py-2 mx-1 rounded-lg hover:bg-mauve/5 cursor-pointer flex items-center gap-3 transition-colors"
                    >
                      <div className="shrink-0 p-1.5 bg-ink/5 rounded-md border border-hairline-dark">
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-sm font-medium text-ink truncate">{result.title}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
                          <span className="capitalize font-medium text-ink-secondary">{result.type}</span>
                          <span>&bull;</span>
                          <span className="truncate">{result.subtitle}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : query.trim().length >= 2 && !isSearching ? (
            <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <Search className="h-8 w-8 text-ink-tertiary" />
              <p className="text-sm text-ink-secondary font-medium">No results found for &quot;{query}&quot;</p>
              <p className="text-xs text-ink-tertiary">Try searching for a different keyword or module name.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
