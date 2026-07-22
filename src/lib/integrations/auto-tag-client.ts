// src/lib/integrations/auto-tag-client.ts
//
// Auto Categorization — Step 8 wizard toggle (settings.ai_features.auto_categorization).
// Runs entirely in the guest's browser via MobileNet (@tensorflow-models/mobilenet),
// the same "no server-side ML cost" tradeoff as face-api.js's embeddings, just
// mirrored client-side because this specifically must NOT add a sharp/tfjs
// decode to every guest upload on the server. The model (a few MB) is only
// ever dynamically imported when an event has this toggle on — it costs
// nothing to guests uploading to events that never enabled it.
//
// MobileNet is trained on ImageNet's ~1000 general object categories, not
// "wedding photography" categories — TAG_RULES below maps the nearest
// ImageNet labels to Snapsy's own event vocabulary (cake, candles, dancing,
// flowers, etc.) where there's a reasonable correspondence. This is a
// best-effort v1, not a promise of precise tagging: a photo of a wedding
// cake reliably tags "cake"; a candid group photo may tag nothing at all,
// which is fine — untagged photos just don't get a chip, they're never
// hidden or penalized.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelPromise: Promise<any> | null = null

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs")
      await tf.ready()
      const mobilenet = await import("@tensorflow-models/mobilenet")
      // alpha 0.5 = the smaller/faster MobileNet variant. This is a nice-to-have
      // gallery enrichment feature, not a precision classifier — trading some
      // accuracy for a smaller download and faster in-browser inference on
      // guests' phones is the right call for a mobile-first upload flow.
      return mobilenet.load({ version: 2, alpha: 0.5 })
    })()
  }
  return modelPromise
}

const TAG_RULES: { match: RegExp; tag: string }[] = [
  { match: /cake|trifle|chocolate sauce|ice cream/i, tag: "cake" },
  { match: /candle/i, tag: "candles" },
  { match: /wine|champagne|cocktail|beer glass|red wine|eggnog/i, tag: "drinks" },
  { match: /bridal|gown|wedding/i, tag: "wedding" },
  { match: /microphone|stage|drum|guitar|banjo|cello|trombone|saxophone|accordion/i, tag: "music" },
  { match: /fireworks|sparkler/i, tag: "fireworks" },
  { match: /flower|bouquet|rose|daisy|petal/i, tag: "flowers" },
  { match: /sunset|sunscreen|sky|alp|seashore|lakeside|promontory|valley|cliff|volcano/i, tag: "scenery" },
  { match: /restaurant|dining|table|plate|dessert|pizza|meal|menu|guacamole/i, tag: "food" },
  { match: /suit|groom|tuxedo|gown|dress|bow tie|bowtie/i, tag: "outfit" },
  { match: /balloon|confetti|party hat|streamer/i, tag: "decor" },
]

export interface AutoTagResult {
  tags: string[]
}

/** Classifies an already-loaded image element. Never throws — returns an empty tag list on any failure. */
export async function classifyImageTags(imgEl: HTMLImageElement): Promise<AutoTagResult> {
  try {
    const model = await loadModel()
    const predictions = (await model.classify(imgEl, 5)) as { className: string; probability: number }[]
    const tags = new Set<string>()
    for (const p of predictions) {
      if (p.probability < 0.15) continue
      const rule = TAG_RULES.find((r) => r.match.test(p.className))
      if (rule) tags.add(rule.tag)
    }
    return { tags: Array.from(tags).slice(0, 6) }
  } catch (err) {
    console.warn("[auto-tag] classification failed", err)
    return { tags: [] }
  }
}

/** Convenience wrapper: loads a File into an <img>, classifies it, and revokes the object URL when done. */
export async function classifyImageFile(file: File): Promise<AutoTagResult> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Failed to load image for classification"))
      img.src = url
    })
    return await classifyImageTags(img)
  } catch (err) {
    console.warn("[auto-tag] file classification failed", err)
    return { tags: [] }
  } finally {
    URL.revokeObjectURL(url)
  }
}
