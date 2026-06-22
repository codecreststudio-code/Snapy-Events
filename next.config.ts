import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
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
              value: "default-src 'self' * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com; frame-src 'self' https://checkout.razorpay.com https://*.razorpay.com; img-src 'self' data: blob: *; connect-src 'self' *;",
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; connect-src 'self' https://*.supabase.co; frame-src 'self' https://checkout.razorpay.com;",
          },
          {
            key: "Permissions-Policy",
            value: "camera=*, microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig;
