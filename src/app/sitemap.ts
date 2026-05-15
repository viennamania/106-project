import type { MetadataRoute } from "next";

import { createPublicUrl } from "@/lib/site-url";
import { supportedLocales } from "@/lib/i18n";

const indexedPaths = [
  "",
  "/disclaimer",
  "/fanletter",
  "/fanletter/feed",
  "/fanletter/onboarding",
  "/fanletter/start",
] as const;

function getLocalizedPath(locale: string, path: string) {
  return `/${locale}${path}`;
}

function getLanguageAlternates(path: string) {
  return Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      createPublicUrl(getLocalizedPath(locale, path)),
    ]),
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return supportedLocales.flatMap((locale) =>
    indexedPaths.map((path) => {
      const isHome = path === "";
      const isFanletterEntry = path === "/fanletter";

      return {
        url: createPublicUrl(getLocalizedPath(locale, path)),
        lastModified,
        changeFrequency: isHome || isFanletterEntry ? "weekly" : "monthly",
        priority: isHome ? 1 : isFanletterEntry ? 0.9 : 0.72,
        alternates: {
          languages: getLanguageAlternates(path),
        },
      } satisfies MetadataRoute.Sitemap[number];
    }),
  );
}
