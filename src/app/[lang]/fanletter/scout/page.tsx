import { notFound, redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// The standalone Scout (친구 초대) hub has been folded into the per-star share
// action on cards and detail. Redirect any remaining /fanletter/scout traffic
// (bookmarks, stale links) to home.
export default async function FanletterScoutRoutePage({
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
