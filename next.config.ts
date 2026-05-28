import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/content/posts": [
      "./node_modules/ffmpeg-static/**/*",
      "./node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/**/*",
    ],
    "/api/content/posts/**": [
      "./node_modules/ffmpeg-static/**/*",
      "./node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/**/*",
    ],
  },
  serverExternalPackages: ["ffmpeg-static"],
  async headers() {
    return [
      {
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
        source: "/sw.js",
      },
    ];
  },
  images: {
    localPatterns: [
      {
        pathname: "/landing/**",
        search: "?v=20260415",
      },
    ],
    remotePatterns: [
      {
        hostname: "www.bithumb.com",
        pathname: "/resources/img/**",
        protocol: "https",
      },
      {
        hostname: "t0gqytzvlsa2lapo.public.blob.vercel-storage.com",
        pathname: "/**",
        protocol: "https",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
