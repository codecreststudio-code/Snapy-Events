import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,

  // ─── Recap-video ffmpeg pipeline ──────────────────────────────────────────
  // @ffmpeg-installer/ffmpeg resolves its platform-specific binary package
  // (e.g. @ffmpeg-installer/linux-x64) via a runtime-computed `require(...)`
  // path, which Turbopack's static import tracing can't follow ("server
  // relative imports are not implemented yet", module-not-found at build
  // time for src/lib/integrations/recap-video.ts's import chain). Marking
  // both packages external tells Next.js to leave them as plain Node
  // `require()` calls resolved at runtime inside the Lambda instead of
  // trying to statically bundle/trace them — the standard fix for native/
  // binary-resolving npm packages under Turbopack (same class of issue as
  // `sharp`, `canvas`, etc.).
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"],

  // ─── Face detection model weights ────────────────────────────────────────
  // @vladmandic/face-api ships its model weights inside its own npm package
  // (node_modules/@vladmandic/face-api/model). Those files are loaded via
  // fs at runtime, not import/require, so Next's automatic file tracer won't
  // discover them — list them explicitly so Vercel bundles them into the
  // face-detection route functions.
  outputFileTracingIncludes: {
    "/api/ai/faces/*": ["./node_modules/@vladmandic/face-api/model/**/*"],
    // The ffmpeg binary itself is located via a runtime filesystem check
    // inside @ffmpeg-installer/ffmpeg, not a statically-analyzable require —
    // explicit tracing (same pattern as the face-api weights above) ensures
    // the actual platform binary ships inside the recap route's function
    // bundle rather than relying on NFT to infer it automatically.
    "/api/events/*/recap/*": ["./node_modules/@ffmpeg-installer/**/*"],
  },

  // ─── Image Optimization ───────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rgueysvqeivxdnoeholx.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  // ─── Compression ─────────────────────────────────────────────────────────
  compress: true,

  // ─── Experimental Optimizations ──────────────────────────────────────────
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
    ],
  },

  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    
    if (isDev) {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "X-Frame-Options",
              value: "SAMEORIGIN",
            },
            {
              key: "Content-Security-Policy",
              value: "default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com; frame-src 'self' https://checkout.razorpay.com https://*.razorpay.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.razorpay.com https://*.razorpay.com;",
            },
          ],
        },
      ];
    }

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' blob: data: https:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.razorpay.com