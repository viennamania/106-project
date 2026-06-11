import { notFound, redirect } from "next/navigation";

import {
  normalizeFanletterStarId,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

type FanletterStarLandingSearchParams = {
  ref?: string | string[];
};

function buildFanletterStarRedirectHref({
  locale,
  referralCode,
  starId,
}: {
  locale: Locale;
  referralCode: string | null;
  starId: string;
}) {
  const searchParams = new URLSearchParams({
    star: starId,
  });

  if (referralCode) {
    searchParams.set("ref", referralCode);
  }

  return `/${locale}/fanletter?${searchParams.toString()}#founder-club`;
}

export default async function FanletterStarLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; starId: string }>;
  searchParams: Promise<FanletterStarLandingSearchParams>;
}) {
  const [{ lang, starId: rawStarId }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const starId = normalizeFanletterStarId(rawStarId);

  if (!starId) {
    notFound();
  }

  redirect(
    buildFanletterStarRedirectHref({
      locale: lang,
      referralCode: readFanletterReferralCode(query.ref),
      starId,
    }),
  );
}
