import { createFanletterPwaManifest } from "@/lib/fanletter-pwa";
import { defaultLocale, hasLocale } from "@/lib/i18n";

export async function GET(
  _request: Request,
  context: { params: Promise<{ lang: string }> },
) {
  const { lang } = await context.params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return new Response(JSON.stringify(createFanletterPwaManifest(locale)), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
}
