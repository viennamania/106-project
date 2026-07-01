import { notFound, redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// The reports surface moved into the News sub-app at /fanletter/news/reports
// during the News split. Internal links now point there directly; this route
// redirects any remaining /fanletter/reports traffic (bookmarks, stale share
// URLs) to the canonical location.
export default async function FanletterReportsRedirectPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  redirect(`/${locale}/fanletter/news/reports`);
}
