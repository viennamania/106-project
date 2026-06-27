import { FANLETTER_PWA_ICON_512 } from "@/lib/fanletter-pwa";
import type { Locale } from "@/lib/i18n";

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.net402.ai"
).replace(/\/$/, "");

// Organization + WebSite JSON-LD for the FanLetter home. Gives search engines the
// brand identity (name/logo) and a sitelinks-searchbox SearchAction wired to the
// discovery search (GET ?q=). Rendered server-side; one graph per locale home.
export function FanletterHomeStructuredData({ locale }: { locale: Locale }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${SITE_URL}/#organization`,
        "@type": "Organization",
        logo: `${SITE_URL}${FANLETTER_PWA_ICON_512}`,
        name: "AIAVpark",
        url: SITE_URL,
      },
      {
        "@id": `${SITE_URL}/#website`,
        "@type": "WebSite",
        inLanguage: locale,
        name: "AIAVpark",
        potentialAction: {
          "@type": "SearchAction",
          "query-input": "required name=search_term_string",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/${locale}/fanletter/discovery?q={search_term_string}`,
          },
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
        url: `${SITE_URL}/${locale}/fanletter`,
      },
    ],
  };

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      type="application/ld+json"
    />
  );
}
