import { notFound, redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// `/fanletter/characters` was a duplicate of `/fanletter/discovery` (same
// FanletterCharacterDirectoryPage, no inbound nav links). Consolidated onto
// `/discovery`; redirect any remaining /characters traffic (bookmarks, indexed
// URLs) there, preserving the query (sort/page/q/ref).
export default async function LocalizedFanletterCharactersPage({
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
    if (Array.isArray(value)) {
      for (const entry of value) {
        forwarded.append(key, entry);
      }
    } else if (value != null) {
      forwarded.set(key, value);
    }
  }

  const suffix = forwarded.toString();

  redirect(`/${locale}/fanletter/discovery${suffix ? `?${suffix}` : ""}`);
}
