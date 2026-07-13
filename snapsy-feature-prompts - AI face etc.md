# Snapsy — Build Prompts for AI Features

Copy each prompt as-is into Claude Code (or your coding agent of choice). Each is self-contained with stack, data model, pipeline, UI, and acceptance criteria.

---

## Prompt 1: AI Face Recognition & Grouping

```
Add AI face recognition to Snapsy, a disposable-camera-style event photo app 
(brand: Jet Black #1D1D1D + Orchid #E5BDDF, ribbon-S logo). Goal: automatically 
group all photos from an event by the people in them, like Google Photos' 
"People" albums, so guests can find every photo they appear in without 
scrolling the full gallery.

REQUIREMENTS:

1. Face detection & embedding pipeline
   - Use face-api.js (TensorFlow.js, client-side) for MVP — no per-image cloud 
     billing, works offline, keeps biometric data off third-party servers.
   - On photo upload, run detection as a background job (do NOT block the 
     upload/WhatsApp confirmation flow). Use a job queue (BullMQ if Redis is 
     available, otherwise a simple Postgres-backed queue table).
   - For each detected face: extract a 128-dimension embedding, bounding box, 
     and detection confidence score. Discard faces below 0.5 confidence or 
     smaller than 40x40px (too small/blurry to be useful).
   - Store embeddings in Postgres using pgvector extension (or Supabase's 
     pgvector support). Schema:
     - faces(id, photo_id, event_id, embedding vector(128), bbox jsonb, 
       confidence float, cluster_id uuid nullable, created_at)
     - face_clusters(id, event_id, representative_face_id, label text nullable, 
       face_count int, created_at)

2. Clustering logic
   - After each event's upload window closes (or on-demand via a "Rebuild 
     People" admin action), run clustering across all faces in that event: 
     cosine similarity threshold ~0.6 for same-person match, or DBSCAN with 
     eps tuned per testing. Scope clustering strictly per-event — do not 
     cross-match faces between different events (privacy + relevance).
   - Merge a new face into an existing cluster if its embedding is within 
     threshold of the cluster's centroid; otherwise create a new cluster.
   - Cap cluster review: surface clusters with 3+ faces prominently; singleton 
     faces go into a lower-priority "unsorted" bucket to avoid UI clutter from 
     false positives.

3. Consent flow (required — do not skip)
   - Add an explicit opt-in checkbox at event upload/join time: "Allow AI to 
     group photos by faces to help you find yours" — separate from general 
     ToS acceptance. Store consent per-user per-event with timestamp.
   - If a guest declines, skip face processing for their uploads and exclude 
     their face from being matched in others' photos where technically 
     feasible.
   - Add a "Delete my face data" action in guest settings that removes all 
     face embeddings tied to that user across events, with cascade to cluster 
     recomputation.

4. UI/UX
   - New "People" tab in the event gallery, showing cluster thumbnails 
     (use each cluster's highest-confidence face crop as the tile).
   - Tapping a person tile filters the gallery to only photos containing that 
     face.
   - Allow a guest to self-identify their own cluster ("This is me") via a 
     lightweight selfie match at signup, auto-pinning their cluster to the 
     top of their personal view.
   - Style: match existing Jet Black/Orchid palette, rounded person-tile 
     avatars with a subtle Orchid ring on hover/selected state.

5. Performance & cost guardrails
   - Batch face detection jobs (process in chunks of 10-20 photos) to avoid 
     memory spikes on high-volume events (weddings can have 500+ uploads/hr).
   - Log processing time per photo; if client-side detection proves too slow 
     at scale, leave a clean interface boundary so the embedding step can be 
     swapped for a self-hosted InsightFace/DeepFace microservice later 
     without touching the clustering or UI layer.

ACCEPTANCE CRITERIA:
- Uploading a batch of event photos results in face clusters visible in the 
  "People" tab within a reasonable delay (background, non-blocking).
- No face processing occurs for guests who did not opt in.
- Clustering stays scoped to a single event.
- A guest can filter the gallery to "just me" with one tap.
- Guest can fully delete their face data on request.
```

---

## Prompt 2: Media Collage Generator

```
Add an auto-collage feature to Snapsy, a disposable-camera-style event photo 
app (brand: Jet Black #1D1D1D + Orchid #E5BDDF). Goal: let guests generate a 
shareable multi-photo collage from an event in one tap, styled consistently 
with Snapsy's existing film-grain filters (Haldi Gold, Golden Hour, Mono 
Noir), fully client-side — no backend ML calls needed.

REQUIREMENTS:

1. Photo scoring & auto-selection
   - Given an event's photo set (or a guest's personal subset), score each 
     photo on:
     - Sharpness: Laplacian variance (higher = sharper); discard bottom 
       quartile as likely blurry.
     - Face presence: prefer photos with 1+ detected face if face detection 
       data is available (reuse embeddings/bboxes from the face recognition 
       feature if present; degrade gracefully if not — face detection is 
       optional here, not a dependency).
     - Timestamp spread: prefer photos spaced across the event timeline 
       rather than 5 near-duplicate shots from the same 30 seconds (bucket by 
       10-15 min windows, pick best-scoring photo per bucket).
     - Brightness/exposure: penalize extremely dark or blown-out shots via 
       histogram check.
   - Rank and auto-select top N photos (N determined by chosen layout 
     template) but let the guest swap out any auto-picked photo manually 
     before finalizing.

2. Layout templates (render via HTML Canvas or fabric.js)
   - Ship with at least 5 fixed templates: 2-up (side by side), 3-up (one 
     large + two stacked), 4-grid, 6-grid, and a "polaroid scatter" style 
     (rotated overlapping frames) that matches Snapsy's disposable-camera 
     aesthetic.
   - Each template defined as a JSON layout spec (photo slot positions, 
     rotation, border/frame style) so new templates can be added without 
     touching render logic.
   - Apply a consistent border/frame treatment per template — thin cream 
     polaroid-style borders work well against Jet Black backgrounds.

3. Styling integration
   - Reuse the existing film-grain filter pipeline: let the guest apply one 
     filter (Haldi Gold / Golden Hour / Mono Noir) uniformly across the whole 
     collage before/after compositing, not per-individual-photo (avoids a 
     mismatched look).
   - Optional: event name + date stamp in a branded corner tag using the 
     Snapsy ribbon-S mark, toggleable on/off.

4. UI/UX flow
   - Entry point: "Make a Collage" button in the gallery view.
   - Step 1: pick template (visual thumbnail picker).
   - Step 2: review auto-picked photos with swap/replace affordance (tap any 
     slot to choose a different photo from the event gallery).
   - Step 3: pick filter, preview live on Canvas.
   - Step 4: export as single JPEG/PNG at share-ready resolution (min 1080px 
     on the short edge for WhatsApp/Instagram sharing).
   - Keep the whole flow under ~4 taps for the default auto-generated 
     version — the "auto" in the name should mean genuinely one-tap-to-decent-
     result, manual editing is optional polish.

5. Performance
   - All processing client-side; no server round-trip needed for collage 
     generation itself (only for fetching the source photos, which are 
     already loaded in-gallery).
   - Compress/resize source images before Canvas compositing to avoid memory 
     issues on lower-end Android devices common in the India/GCC guest base.

ACCEPTANCE CRITERIA:
- Guest can generate a collage in under 4 taps using auto-selected photos.
- Every template renders correctly with photo counts from 2 to 6.
- Collage export applies the chosen film-grain filter consistently.
- Works smoothly on a mid-range Android device (test on a device with 
  ~4GB RAM equivalent, not just desktop Chrome).
- Guest can manually swap any auto-picked photo before export.
```

---

## Prompt 3: Auto Reel / Recap Video Generation

```
Extend Snapsy's existing beat-synced recap video engine to support fully 
automatic reel generation — a guest or host taps one button and gets a 
finished, music-synced highlight reel with no manual editing required. This 
builds on (not replaces) the current beat-detection and video compositing 
pipeline.

CONTEXT: Snapsy already has a working beat-synced recap engine that syncs 
clip cuts to detected beats in a chosen audio track. This prompt adds the 
"auto" selection layer that decides WHICH photos/clips go in and WHEN, so the 
existing engine can render without manual clip picking.

REQUIREMENTS:

1. Content scoring & selection (feeds into existing beat-sync engine)
   - Score every photo/video clip in the event using the same core signals as 
     the collage feature (sharpness, face presence, exposure) plus 
     video-specific checks for clips: discard clips under 1 second or with 
     excessive motion blur/shake (basic frame-diff heuristic is enough, no 
     need for full ML stabilization scoring).
   - Deduplicate near-identical shots: if 3+ photos exist within the same 
     ~30-second window with high visual similarity (simple perceptual hash / 
     dHash comparison), keep only the top-scoring one.
   - Ensure timeline coverage: bucket the event into equal time windows 
     (e.g., 10 buckets across the event's total duration) and guarantee at 
     least one selected item per bucket where available, so the reel feels 
     like a full-event recap rather than clustering around one moment.
   - If face recognition data is available for the event, allow an optional 
     "personalized reel" mode: weight selection toward photos containing a 
     specific guest's face cluster, for a "your night" recap variant.

2. Beat-mapping handoff
   - Output of the selection step is an ordered list of {media_id, type, 
     score, suggested_duration} — hand this directly to the existing 
     beat-sync engine's input format (match field names/shape to what it 
     already expects; do not change the beat-sync engine's internals).
   - Selected item count and per-item duration should be driven by the 
     chosen music track's length and detected beat count — shorter track = 
     fewer/shorter clips, so the reel always lands on-beat at the outro 
     rather than cutting off mid-beat.

3. Music selection
   - Offer 3-5 pre-cleared royalty-free tracks bucketed by mood (upbeat/ 
     celebratory, emotional/slow, energetic/party) relevant to Indian/GCC 
     wedding and event contexts — avoid licensed commercial music to sidestep 
     copyright issues on a consumer-facing product.
   - Default to auto-picking a track based on event type metadata if set 
     (wedding, birthday, corporate), otherwise prompt the guest with the mood 
     picker as the only required input before generation.

4. UI/UX flow
   - Entry point: "Create My Reel" / "Auto Recap" button, prominent in the 
     event gallery (this is a flagship feature, treat it like one).
   - Minimum required input: pick a mood/track (or accept the default) → tap 
     Generate. Everything else automatic.
   - Show a branded progress state during generation (reuse Snapsy's visual 
     language — ribbon-S loading motif) since rendering may take a few 
     seconds to a minute depending on clip count.
   - After generation: preview player, with a lightweight "regenerate" option 
     (reroll selection with the same or different track) if the guest doesn't 
     like the first cut, before committing to export/share.
   - Export: match existing recap engine's output format/resolution; ensure 
     it's WhatsApp-share-ready (correct aspect ratio, file size under typical 
     WhatsApp media limits).

5. Processing architecture
   - Run selection + rendering as a background job (BullMQ or equivalent), 
     not synchronous in the request/response cycle — video compositing is 
     too slow to block the UI thread or an HTTP request.
   - Notify the guest (in-app + optional WhatsApp message via the existing 
     DoubleTick integration) when their reel is ready, rather than making 
     them wait on a spinner.

ACCEPTANCE CRITERIA:
- Guest can generate a full recap reel with a single tap plus one mood 
  selection.
- Selected content spans the full event timeline, not clustered in one spot.
- No near-duplicate clips appear back-to-back in the output.
- Reel duration and cut timing line up with the chosen track's beats and 
  runs to completion without an abrupt off-beat cutoff.
- Personalized "your night" mode correctly filters toward one guest's face 
  cluster when face data exists and the option is selected.
- Generation runs as a background job with a completion notification, not a 
  blocking UI wait.
```

---

**Build order recommendation** (from earlier): Collage → Auto Reel → Face Recognition — collage has zero ML infra and validates the scoring heuristics you'll reuse everywhere; auto reel extends what you've already built; face recognition has the most infra + DPDP consent overhead, so tackle it last once the scoring/pipeline patterns are proven.
