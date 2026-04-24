import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
