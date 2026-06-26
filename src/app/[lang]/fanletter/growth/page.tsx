import { notFound, redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// The standalone Growth Hub has been folded into the home page. Redirect any
// remaining /fanletter/growth traffic (bookmarks, stale links) to home.
export default async function FanletterGrowthRoutePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  redirect(`/${locale}/fanletter`);
}
