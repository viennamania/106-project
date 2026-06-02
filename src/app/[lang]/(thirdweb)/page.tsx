import { notFound, redirect } from "next/navigation";

import { getFanletterNewsCutsHomeHref } from "@/lib/fanletter-news-home-routing";
import {
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

type LocalizedHomeSearchParams = {
  pwa?: string | string[];
  ref?: string | string[];
};

export default async function LocalizedHome({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<LocalizedHomeSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  redirect(
    getFanletterNewsCutsHomeHref({
      locale: lang as Locale,
      pwaLaunch: readFirstSearchParam(query.pwa) === "1",
      referralCode: readFanletterReferralCode(query.ref),
    }),
  );
}
