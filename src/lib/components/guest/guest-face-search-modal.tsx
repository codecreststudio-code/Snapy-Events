"use client"

import { useState, useRef } from "react"
import { useClientFaceSearch, type FaceSearchHit } from "@/lib/hooks/use-client-face-search"
import { Button } from "@/lib/components/ui/button"
import { Sparkles, Camera, Upload, X, Loader2, Download, Image as ImageIcon, AlertCircle } from "lucide-react"

export interface GuestFaceSearchModalProps {
  isOpen: boolean
  onClose: () => void
  galleryId?: string
  eventId?: string
}

export function GuestFaceSearchModal({ isOpen, onClose, galleryId, eventId }: GuestFaceSearchModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { searchWithImage, isProcessing, statusMessage, results, error, clearResults } = useClientFaceSearch({
    galleryId,
    eventId,
  })

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreviewImage(dataUrl)
      void searchWithImage(file)
    }
    reader.readAsDataURL(file)
  }

  const handleReset = () => {
    setPreviewImage(null)
    clearResults()
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface-card-elevated border border-hairline-dark rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-hairline-dark flex items-center justify-between bg-surface-card-elevated">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#b8925a] to-[#96723a] flex items-center justify-center text-white shadow-lg shadow-[#b8925a]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Find My Photos
              </h2>
              <p className="text-xs text-ink-secondary">Snap a selfie to instantly find your photos in this event</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-ink-secondary hover:text-ink hover:bg-mauve/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!previewImage ? (
            <div className="border-2 border-dashed border-hairline-dark rounded-3xl p-8 text-center bg-mauve/5 hover:border-mauve/50 transition-all flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-mauve/10 flex items-center justify-center text-mauve-strong">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-ink">Take a selfie or upload a photo</h3>
                <p className="text-xs text-ink-secondary max-w-sm">
                  Your photo is analyzed 100% locally on your device for privacy and instant results.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-[#b8925a] to-[#96723a] text-white hover:brightness-95 rounded-xl px-5 py-2.5 font-medium flex items-center gap-2 shadow-lg shadow-[#b8925a]/20"
                >
                  <Camera className="w-4 h-4" />
                  Upload Selfie
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview and Search Status */}
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-hairline-dark">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-hairline-dark flex-shrink-0">
                  <img src={previewImage} alt="Selfie preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  {isProcessing ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-mauve-strong">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                      <p className="text-xs text-ink-secondary">{statusMessage || "Searching..."}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-ink">Search Complete</h4>
                        <p className="text-xs text-ink-secondary">
                          Found {results.length} matching {results.length === 1 ? "photo" : "photos"}
                        </p>
                      </div>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        size="sm"
                        className="text-xs border-hairline-dark text-ink hover:bg-mauve/5"
                      >
                        Try Another Selfie
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Errors */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Results Grid */}
              {results.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">Matched Event Photos</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {results.map((hit) => {
                      const photoUrl = hit.photo?.url || hit.photo?.storage_path
                      if (!photoUrl) return null

                      return (
                        <div
                          key={hit.id}
                          className="group relative aspect-square rounded-xl overflow-hidden bg-white border border-hairline-dark hover:border-mauve/50 transition-all"
                        >
                          <img
                            src={photoUrl}
                            alt="Matched photo"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                            <span className="text-[10px] font-semibold text-amber-300">
                              {(hit.similarity * 100).toFixed(0)}% Match
                            </span>
                            <a
                              href={photoUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-white bg-white/20 hover:bg-white/30 backdrop-blur-md px-2.5 py-1 rounded-lg transition-colors w-max"
                            >
                              <Download className="w-3 h-3" /> Save
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!isProcessing && results.length === 0 && !error && (
                <div className="py-12 text-center text-ink-tertiary space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto opacity-50" />
                  <p className="text-sm font-medium text-ink-secondary">No matching photos found yet</p>
                  <p className="text-xs text-ink-tertiary max-w-xs mx-auto">
                    Try uploading a clearer selfie with good lighting, or check back after more photos are uploaded.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
