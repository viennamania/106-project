import type { Metadata, MetadataRoute, Viewport } from "next";

import type { Locale } from "@/lib/i18n";

export const FANLETTER_PWA_THEME_COLOR = "#030504";
export const FANLETTER_PWA_BACKGROUND_COLOR = "#030504";
export const FANLETTER_PWA_NAME = "FanLetter";
export const FANLETTER_PWA_DESCRIPTION =
  "Create AI character vlog channels, watch public vlogs, and continue fan content workflows from a mobile-first app experience.";
export const FANLETTER_PWA_ICON_192 = "/fanletter-icon-192.png";
export const FANLETTER_PWA_ICON_512 = "/fanletter-icon-512.png";
export const FANLETTER_PWA_APPLE_ICON = "/fanletter-apple-icon.png";

export const fanletterViewport: Viewport = {
  colorScheme: "dark",
  themeColor: FANLETTER_PWA_THEME_COLOR,
  viewportFit: "cover",
  width: "device-width",
};

export function getFanletterPwaStartUrl(locale: Locale) {
  return `/${locale}/fanletter?pwa=1`;
}

export function getFanletterPwaScope(locale: Locale) {
  return `/${locale}/fanletter`;
}

export function createFanletterPwaManifest(
  locale: Locale,
): MetadataRoute.Manifest {
  const scope = getFanletterPwaScope(locale);

  return {
    background_color: FANLETTER_PWA_BACKGROUND_COLOR,
    categories: ["entertainment", "photo", "productivity", "social", "video"],
    description: FANLETTER_PWA_DESCRIPTION,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    icons: [
      {
        src: FANLETTER_PWA_ICON_192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: FANLETTER_PWA_ICON_192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: FANLETTER_PWA_ICON_512,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: FANLETTER_PWA_ICON_512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    id: `/${locale}/fanletter`,
    lang: locale,
    launch_handler: {
      client_mode: "navigate-existing",
    },
    name: FANLETTER_PWA_NAME,
    orientation: "portrait",
    scope,
    shortcuts: [
      {
        description: "Watch public AI character vlogs",
        name: "Vlog Feed",
        short_name: "Feed",
        url: `${scope}/feed`,
      },
      {
        description: "Create a character and first vlog",
        name: "Create Character",
        short_name: "Create",
        url: `${scope}/onboarding`,
      },
      {
        description: "Open the creator studio",
        name: "Studio",
        short_name: "Studio",
        url: `${scope}/studio`,
      },
    ],
    short_name: FANLETTER_PWA_NAME,
    start_url: getFanletterPwaStartUrl(locale),
    theme_color: FANLETTER_PWA_THEME_COLOR,
  };
}

export function createFanletterPwaMetadata(locale: Locale): Metadata {
  return {
    applicationName: FANLETTER_PWA_NAME,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: FANLETTER_PWA_NAME,
    },
    icons: {
      apple: [
        {
          sizes: "180x180",
          type: "image/png",
          url: FANLETTER_PWA_APPLE_ICON,
        },
      ],
      icon: [
        {
          sizes: "192x192",
          type: "image/png",
          url: FANLETTER_PWA_ICON_192,
        },
        {
          sizes: "512x512",
          type: "image/png",
          url: FANLETTER_PWA_ICON_512,
        },
      ],
    },
    manifest: `/${locale}/fanletter/manifest.webmanifest`,
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}
