// src/lib/integrations/quality-score.ts
//
// Blends the static per-photo signals computed at upload time (blur,
// brightness, smile — see image-quality.ts and face.ts) with each photo's
// live engagement (reaction/comment/favorite counts) into a single "best
// shot" ranking. Used only when an event has Best Shot Selection enabled
// (settings.ai_features.best_shot) — see /api/galleries/[id]/photos/route.ts,
// which computes this over one gallery's photo set and flags the top slice
// as is_best_shot for the gallery grid's "✨ Highlight" badge.
//
// Everything here is a *relative* ranking within one photo set, not an
// absolute "in focus" or "well lit" classifier — blur/brightness scales vary
// too much across cameras/lighting for a fixed cutoff to mean anything, so
// each signal is min-max normalized against the other photos being ranked.

export interface QualityRankInput {
  id: string
  blurScore: number | null
  brightnessScore: number | null
  smileScore: number | null
  /** Reaction/comment/favorite-weighted engagement score, e.g. from getScoredPhotos. Defaults to 0. */
  engagementScore?: number
}

function normalize(values: number[]): (v: number | null) => number {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) return () => 0.5
  const min = Math.min(...finite)
  const max = Math.max(...finite)
  if (max - min < 1e-9) return (v) => (v === null ? 0.5 : 0.5)
  return (v) => (v === null || !Number.isFinite(v) ? 0.5 : (v - min) / (max - min))
}

/**
 * Ranks a set of photos and returns the ids of the top `fraction` (default
 * top 15%, minimum 1 when the set is non-empty) by blended quality score.
 * Photos missing signals entirely (e.g. quality computation failed or hasn't
 * run yet) are treated as average (0.5) rather than excluded, so they can
 * still surface via strong engagement alone.
 */
export function pickBestShots(photos: QualityRankInput[], fraction = 0.15): Set<string> {
  if (photos.length === 0) return new Set()

  const normBlur = normalize(photos.map((p) => p.blurScore ?? NaN))
  const normEngagement = normalize(photos.map((p) => p.engagementScore ?? 0))

  const scored = photos.map((p) => {
    const blur = normBlur(p.blurScore)
    // Brightness: extremes (too dark / blown out) are penalized relative to
    // a comfortable mid-range, rather than "higher is always better".
    const brightness = p.brightnessScore ?? 0.55
    const brightnessScore = Math.max(0, 1 - Math.abs(brightness - 0.55) * 1.8)
    const smile = p.smileScore ?? 0
    const engagement = normEngagement(p.engagementScore ?? 0)

    // Sharpness and engagement carry the most weight (a beautifully composed
    // photo nobody reacted to still deserves consideration; a blurry one
    // shouldn't win just because it got a lot of hearts). Smile is a bonus,
    // not a requirement — group/venue/decor shots have no faces at all.
    const score = blur * 0.4 + engagement * 0.3 + brightnessScore * 0.2 + smile * 0.1
    return { id: p.id, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const count = Math.max(1, Math.round(photos.length * fraction))
  return new Set(scored.slice(0, count).map((s) => s.id))
}
