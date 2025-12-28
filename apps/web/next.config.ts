import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDevelopment = process.env.NODE_ENV === "development";

// Bundle Analyzer - only load when ANALYZE=true
let withBundleAnalyzer = (config: NextConfig) => config;
if (process.env.ANALYZE === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: true,
  });
  withBundleAnalyzer = bundleAnalyzer;
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HSTS (only in production)
          ...(isDevelopment
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]),

          // CSP (optimized for Next.js and React)
          // Note: 'unsafe-inline' and 'unsafe-eval' are required for Next.js hydration
          // and development mode. In production, consider using nonce-based CSP.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' https: data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "script-src-elem 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              // Allow localhost connections in development for API calls
              isDevelopment
                ? "connect-src 'self' https: wss: ws: http://localhost:* http://127.0.0.1:*"
                : "connect-src 'self' https: wss: ws:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
            ].join("; "),
          },

          // Clickjacking
          { key: "X-Frame-Options", value: "DENY" },

          // MIME Sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Referrer policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // Feature permissions
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "fullscreen=(self)",
              "payment=()",
              "usb=()",
            ].join(", "),
          },

          // Cross-Origin protections
          // Relaxed in development for Next.js HMR and WebSocket connections
          ...(isDevelopment
            ? []
            : [
                {
                  key: "Cross-Origin-Resource-Policy",
                  value: "same-origin",
                },
                {
                  key: "Cross-Origin-Opener-Policy",
                  value: "same-origin",
                },
              ]),

          // COEP disabled for compatibility
          // { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },

      // static asset caching
      {
        source: "/:path*.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  poweredByHeader: false,
};

export default withNextIntl(withBundleAnalyzer(nextConfig));
