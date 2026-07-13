import { defineRoute, ok, fail } from "@/lib/api/handler"
import { uploadFile } from "@/lib/integrations/storage"
import { validateFile, isSvgContent } from "@/lib/security/file-validation"
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES } from "@/lib/constants"

export const POST = defineRoute({
  method: "POST",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const fd = await request.formData()
    const file = fd.get("file") as File | null
    if (!file) return fail("VALIDATION_ERROR", "Missing file", 422)

    if (file.size === 0) return fail("VALIDATION_ERROR", "File is empty", 422)

    if (!(ALLOWED_MIME_TYPES.COVER as readonly string[]).includes(file.type)) {
      return fail("VALIDATION_ERROR", "Unsupported file type. Allowed: JPEG, PNG, WebP", 415)
    }

    if (file.size > MAX_FILE_SIZES.COVER_IMAGE) {
      return fail("VALIDATION_ERROR", "File too large. Maximum 10MB", 413)
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    if (isSvgContent(new Uint8Array(fileBuffer))) {
      return fail("VALIDATION_ERROR", "SVG files are not allowed", 415)
    }

    const validation = validateFile(new Uint8Array(fileBuffer), file.name, file.type, file.size)
    if (!validation.valid) return fail("VALIDATION_ERROR", validation.error!, 415)

    const fileId = crypto.randomUUID()
    const ext = file.name.split(".").pop() || "jpg"
    const filepath = `blog/${fileId}.${ext}`

    const up = await uploadFile({
      bucket: "EVENT_COVERS",
      path: filepath,
      file: new Blob([fileBuffer], { type: file.type }),
      contentType: file.type,
      cacheControl: "31536000",
    })

    return ok({ url: up.publicUrl, path: up.path })
  },
}).POST
