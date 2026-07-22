// Minimal ambient type declaration for the `sanitize-html` package.
//
// The package ships no types of its own (just index.js), and no
// `@types/sanitize-html` is installed. Locally this went unnoticed because
// an incremental tsc build-info cache had it marked as already-checked from
// before src/lib/security/blog-sanitize.ts started importing it; Vercel's
// clean build (no cache reuse for type info) correctly caught it as a hard
// TS7016 error under this project's `strict`/`noImplicitAny` config.
//
// Shape below covers exactly what blog-sanitize.ts uses (the default
// export function plus the `IOptions` type referenced via
// `sanitizeHtml.IOptions["allowedAttributes"]`) — not a full re-declaration
// of the library's API surface.
declare module "sanitize-html" {
  namespace sanitizeHtml {
    interface IOptions {
      allowedTags?: string[] | false
      allowedAttributes?: Record<string, string[]> | false
      allowedSchemes?: string[]
      disallowedTagsMode?: "discard" | "escape" | "recursiveEscape"
      [key: string]: unknown
    }
  }

  function sanitizeHtml(dirty: string, options?: sanitizeHtml.IOptions): string

  export = sanitizeHtml
}
