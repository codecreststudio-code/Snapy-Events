import { ALLOWED_MIME_TYPES } from "@/lib/constants"

const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  "image/jpeg": [new Uint8Array([0xFF, 0xD8, 0xFF])],
  "image/png": [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  "image/webp": [
    new Uint8Array([0x52, 0x49, 0x46, 0x46]),
  ],
  "image/heic": [
    new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
    new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31]),
  ],
  "image/heif": [
    new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
    new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31]),
  ],
  "video/mp4": [
    new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
    new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]),
    new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
  ],
  "video/webm": [new Uint8Array([0x1A, 0x45, 0xDF, 0xA3])],
  "video/quicktime": [new Uint8Array([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20])],
  "video/x-msvideo": [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
  "audio/mpeg": [
    new Uint8Array([0x49, 0x44, 0x33]),
    new Uint8Array([0xFF, 0xFB]),
    new Uint8Array([0xFF, 0xF3]),
    new Uint8Array([0xFF, 0xF2]),
  ],
  "audio/wav": [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
  "audio/webm": [new Uint8Array([0x1A, 0x45, 0xDF, 0xA3])],
  "audio/mp4": [
    new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41]),
    new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41]),
  ],
  "audio/ogg": [new Uint8Array([0x4F, 0x67, 0x67, 0x53])],
  "audio/m4a": [
    new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41]),
    new Uint8Array([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41]),
  ],
}

const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".com", ".bat", ".cmd", ".msi", ".scr", ".pif",
  ".php", ".php3", ".php4", ".php5", ".phtml",
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".sh", ".bash", ".zsh", ".ksh",
  ".pl", ".py", ".rb", ".asp", ".aspx", ".jsp", ".cgi",
  ".jar", ".war", ".class",
  ".swf", ".fla",
  ".vbs", ".vbe", ".jse", ".wsh", ".wsf",
  ".ps1", ".psm1", ".psd1", ".ps1xml",
  ".dll", ".sys", ".ocx", ".drv", ".cpl",
  ".msi", ".msp", ".mst",
  ".app", ".pkg", ".dmg",
  ".wasm",
])

const SVG_XML_DECLARATIONS = [
  /<\?xml.*\?>/i,
  /<!DOCTYPE[^>]*>/i,
  /<svg[\s>]/i,
]

function bufferStartsWith(buf: Uint8Array, magic: Uint8Array): boolean {
  if (buf.length < magic.length) return false
  for (let i = 0; i < magic.length; i++) {
    if (buf[i] !== magic[i]) return false
  }
  return true
}

function matchesAnyMagic(buf: Uint8Array, signatures: Uint8Array[]): boolean {
  return signatures.some((sig) => bufferStartsWith(buf, sig))
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  if (dot === -1) return ""
  return filename.slice(dot).toLowerCase()
}

export function isDangerousExtension(filename: string): boolean {
  const ext = getExtension(filename)
  if (DANGEROUS_EXTENSIONS.has(ext)) return true
  const dotCount = (filename.match(/\./g) || []).length
  if (dotCount > 1) {
    const parts = filename.toLowerCase().split(".")
    if (parts.length > 2) {
      for (let i = 1; i < parts.length - 1; i++) {
        if (DANGEROUS_EXTENSIONS.has(`.${parts[i]}`)) return true
      }
    }
  }
  return false
}

export function validateMagicBytes(buf: Uint8Array, declaredMime: string): boolean {
  const sigs = MAGIC_BYTES[declaredMime]
  if (!sigs) return false
  if (declaredMime.startsWith("image/")) {
    if (matchesAnyMagic(buf, MAGIC_BYTES["image/jpeg"])) return declaredMime === "image/jpeg"
    if (matchesAnyMagic(buf, MAGIC_BYTES["image/png"])) return declaredMime === "image/png"
    if (matchesAnyMagic(buf, MAGIC_BYTES["image/webp"])) {
      if (declaredMime === "image/webp") return true
      const webpId = buf.slice(8, 12)
      const webpIdStr = String.fromCharCode(...webpId)
      return webpIdStr === "WEBP"
    }
    if (matchesAnyMagic(buf, MAGIC_BYTES["image/heic"])) return declaredMime === "image/heic" || declaredMime === "image/heif"
    if (matchesAnyMagic(buf, MAGIC_BYTES["image/heif"])) return declaredMime === "image/heif" || declaredMime === "image/heic"
    return false
  }
  if (declaredMime.startsWith("video/")) {
    if (declaredMime === "video/mp4") return matchesAnyMagic(buf, MAGIC_BYTES["video/mp4"])
    if (declaredMime === "video/webm") return matchesAnyMagic(buf, MAGIC_BYTES["video/webm"])
    if (declaredMime === "video/quicktime") return matchesAnyMagic(buf, MAGIC_BYTES["video/quicktime"])
    if (declaredMime === "video/x-msvideo") return matchesAnyMagic(buf, MAGIC_BYTES["video/x-msvideo"])
    return false
  }
  if (declaredMime.startsWith("audio/")) {
    return matchesAnyMagic(buf, MAGIC_BYTES[declaredMime] || [])
  }
  return false
}

export function isSvgContent(buf: Uint8Array): boolean {
  const header = new TextDecoder().decode(buf.slice(0, 512))
  return SVG_XML_DECLARATIONS.some((re) => re.test(header))
}

export function isAllowedMimeType(mime: string): boolean {
  const allAllowed: readonly string[] = [
    ...ALLOWED_MIME_TYPES.PHOTO,
    ...ALLOWED_MIME_TYPES.VIDEO,
    ...ALLOWED_MIME_TYPES.AUDIO,
    ...ALLOWED_MIME_TYPES.COVER,
  ]
  return allAllowed.includes(mime)
}

export interface ValidationResult {
  valid: boolean
  error?: string
  mimeType?: string
}

export function validateFile(
  buf: Uint8Array,
  filename: string,
  declaredMime: string,
  fileSize: number,
): ValidationResult {
  if (isDangerousExtension(filename)) {
    return { valid: false, error: "File type not allowed" }
  }

  if (isSvgContent(buf)) {
    return { valid: false, error: "SVG files are not allowed" }
  }

  if (!isAllowedMimeType(declaredMime)) {
    return { valid: false, error: "Unsupported file type" }
  }

  if (declaredMime.startsWith("image/") || declaredMime.startsWith("video/") || declaredMime.startsWith("audio/")) {
    if (!validateMagicBytes(buf, declaredMime)) {
      return { valid: false, error: "File content does not match declared type" }
    }
  }

  return { valid: true, mimeType: declaredMime }
}
