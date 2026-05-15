import type { MetadataRoute } from "next";

import { createPublicUrl, getPublicSiteUrl } from "@/lib/site-url";
import { supportedLocales } from "@/lib/i18n";

const localizedPrivatePaths = supportedLocales.flatMap((locale) => [
  `/${locale}/activate`,
  `/${locale}/branding-studio`,
  `/${locale}/creator`,
  `/${locale}/fanletter/connect`,
  `/${locale}/fanletter/create`,
  `/${locale}/fanletter/following`,
  `/${locale}/fanletter/profile`,
  `/${locale}/fanletter/purchases`,
  `/${locale}/fanletter/requests`,
  `/${locale}/fanletter/studio`,
  `/${locale}/fanletter/wallet`,
  `/${locale}/network-feed/purchases`,
  `/${locale}/network-feed/saved`,
  `/${locale}/notifications`,
  `/${locale}/referrals`,
  `/${locale}/rewards`,
  `/${locale}/wallet`,
]);

export default function robots(): MetadataRoute.Robots {
  return {
    host: getPublicSiteUrl(),
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og/"],
      disallow: [
        "/api/",
        "/offline",
        ...localizedPrivatePaths,
      ],
    },
    sitemap: createPublicUrl("/sitemap.xml"),
  };
}
