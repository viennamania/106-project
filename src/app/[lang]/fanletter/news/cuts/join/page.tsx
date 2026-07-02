import { notFound, redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// The 4-cut-feed join view was consolidated into /news/activate with a
// `surface=cutFeed` query param (identical render — same FanletterNewsActivatePage,
// same surface prop + returnTo logic). Redirect any remaining /news/cuts/join
// traffic (bookmarks; the cut-feed's own link is already updated) there,
// preserving ref/returnTo and forcing surface=cutFeed.
export default async function LocalizedFanletterNewsCutJoinRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const query = await searchParams;
  const forwarded = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (key === "surface") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        forwarded.append(key, entry);
      }
    } else if (value != null) {
      forwarded.set(key, value);
    }
  }

  forwarded.set("surface", "cutFeed");

  redirect(`/${locale}/fanletter/news/activate?${forwarded.toString()}`);
}
