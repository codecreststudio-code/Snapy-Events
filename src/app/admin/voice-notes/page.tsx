"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, RefreshCw, Trash2, ShieldAlert, Play, Pause, Loader2, Volume2, Mic, Clock, HardDrive, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

type VoiceItem = {
  id: string
  storage_path: string
  original_filename: string | null
  mime_type: string | null
  file_size: number | null
  created_at: string
  metadata: any
  event: {
    name: string
    id: string
  } | null
  uploader: {
    id: string
    email: string
    full_name: string | null
  } | null
}

export default function AdminVoiceNotesPage() {
  const [voices, setVoices] = useState<VoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)

  const fetchVoices = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/voice-notes?pageSize=50")
      if (!res.ok) throw new Error("Failed to load voice notes")
      const result = await res.json()
      setVoices(result.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVoices()
  }, [])

  const handleDelete = async (voiceId: string) => {
    if (!confirm("Are you sure you want to permanently delete this voice note? This cannot be undone.")) return
    setActioningId(voiceId)
    try {
      const res = await fetch(`/api/admin/voice-notes?voiceIds=${voiceId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete voice note")
      toast({ title: "Deleted", description: "Voice note deleted successfully." })
      setVoices(voices.filter(v => v.id !== voiceId))
      if (selectedVoice?.id === voiceId) setSelectedVoice(null)
      if (playingVoiceId === voiceId) setPlayingVoiceId(null)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredVoices = voices.filter((v) => {
    const term = search.toLowerCase()
    return (
      (v.original_filename || "").toLowerCase().includes(term) ||
      (v.event?.name || "").toLowerCase().includes(term) ||
      (v.uploader?.email || "").toLowerCase().includes(term)
    )
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Voice Note Management</h1>
          <p className="text-sm text-ink-secondary mt-1">Review guest voice note uploads, inspect waveforms, and audit audio greetings.</p>
        </div>
        <Button onClick={fetchVoices} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-ink-secondary bg-surface-card hover:bg-mauve/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-ink-secondary" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-ink-tertiary" />
        <Input
          placeholder="Filter by filename, event, or uploader..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-surface-card border-hairline-dark text-ink shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Voice Notes List */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-6">
            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-mauve" />
              </div>
            ) : filteredVoices.length === 0 ? (
              <div className="p-12 text-center text-ink-tertiary text-sm font-semibold">
                No voice notes found in the database.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVoices.map((v) => {
                  const fileSizeKb = v.file_size ? (v.file_size / 1024).toFixed(1) : "0"
                  const duration = v.metadata?.duration || "15"
                  const isPlaying = playingVoiceId === v.id
                  return (
                    <div 
                      key={v.id}
                      onClick={() => setSelectedVoice(v)}
                      className={cn(
                        "p-4 border rounded-xl cursor-pointer hover:bg-mauve/5 hover:border-mauve/30 transition-all flex items-center justify-between gap-4",
                        selectedVoice?.id === v.id ? "ring-2 ring-mauve/50 border-transparent bg-mauve/5" : "border-hairline-dark bg-surface-card"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPlayingVoiceId(isPlaying ? null : v.id)
                          }}
                          className="h-10 w-10 rounded-full bg-mauve/10 hover:bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20 shrink-0 shadow-sm"
                        >
                          {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-mauve ml-0.5" />}
                        </button>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-bold text-ink text-sm truncate">{v.original_filename || "audio-greeting.wav"}</p>
                          <p className="text-ink-tertiary text-[10px] truncate">Event: {v.event?.name || "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="h-6 flex items-center gap-0.5 overflow-hidden w-20 max-sm:hidden opacity-40">
                          {Array.from({ length: 15 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="w-[2px] bg-mauve rounded-full"
                              style={{
                                height: isPlaying 
                                  ? `${Math.max(10, Math.sin(idx + Date.now()/200) * 100)}%` 
                                  : `${Math.max(20, (idx % 4) * 20)}%`
                              }}
                            />
                          ))}
                        </div>
                        
                        <div className="text-right text-[10px] font-semibold text-ink-secondary">
                          <span className="block">{duration}s</span>
                          <span className="block text-ink-tertiary font-normal">{fileSizeKb} KB</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Inspector Panel */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm p-6 sticky top-6">
          {selectedVoice ? (
            <div className="space-y-6">
              <div className="h-32 bg-ink/5 border border-hairline-dark rounded-xl flex flex-col items-center justify-center text-ink-secondary relative overflow-hidden">
                <Mic className="h-8 w-8 text-ink-tertiary" />
                <span className="text-xs font-semibold text-ink-secondary mt-2">Voice Recording Inspector</span>
                <span className="text-[10px] font-mono text-ink-tertiary mt-1 truncate max-w-[220px]">{selectedVoice.storage_path}</span>
              </div>

              <div className="border-t border-hairline-dark pt-4 space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Voice ID</span>
                  <span className="font-mono text-ink-secondary font-semibold">{selectedVoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Filename</span>
                  <span className="text-ink-secondary font-semibold truncate max-w-[150px]">{selectedVoice.original_filename || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Event Name</span>
                  <span className="text-ink-secondary font-semibold">{selectedVoice.event?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider shrink-0">Uploader Email</span>
                  <span className="text-ink-secondary font-semibold break-all text-right">{selectedVoice.uploader?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Duration</span>
                  <span className="text-ink-secondary font-semibold">{selectedVoice.metadata?.duration || "15"} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Size</span>
                  <span className="text-ink-secondary font-semibold">
                    {(selectedVoice.file_size ? selectedVoice.file_size / 1024 : 0).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Upload Date</span>
                  <span className="text-ink-secondary font-semibold">{new Date(selectedVoice.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-hairline-dark pt-4 space-y-2">
                <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-2">Controls</h4>
                <Button
                  onClick={() => handleDelete(selectedVoice.id)}
                  disabled={actioningId === selectedVoice.id}
                  className="w-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Voice Note</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-ink-tertiary">
              <Volume2 className="h-8 w-8 text-ink-tertiary mb-2" />
              <span className="text-xs font-semibold">Select any audio greeting card to review waveform details, play recording, and perform moderation.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
