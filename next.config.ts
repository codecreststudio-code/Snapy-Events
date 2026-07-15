import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,

  // ─── Face detection model weights ────────────────────────────────────────
  // @vladmandic/face-api ships its model weights inside its own npm package
  // (node_modules/@vladmandic/face-api/model). Those files are loaded via
  // fs at runtime, not import/require, so Next's automatic file tracer won't
  // discover them — list them explicitly so Vercel bundles them into the
  // face-detection route functions.
  outputFileTracingIncludes: {
    "/api/ai/faces/*": ["./node_modules/@vladmandic/face-api/model/**/*"],
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' blob: data: https:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.razorpay.com https://*.razorpay.com https://*.resend.com; frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com;",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      // ─── Static assets — long cache ────────────────────────────────────────
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ─── Public images ────────────────────────────────────────────────────
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ]
  },
}

export default nextConfig;

