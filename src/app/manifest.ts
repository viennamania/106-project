import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0a1325",
    categories: ["finance", "productivity", "utilities"],
    description:
      "Pocket Smart Wallet offers smart-wallet onboarding, referral rewards, and USDT wallet tools in a mobile-first experience.",
    display: "standalone",
    id: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    name: "Pocket Smart Wallet",
    orientation: "portrait",
    scope: "/",
    short_name: "Pocket",
    start_url: "/?pwa=1",
    theme_color: "#0a1325",
  };
}
