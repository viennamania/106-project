import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getFanletterNewsCutsHomeHref } from "@/lib/fanletter-news-home-routing";
import {
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import {
  localeCookieName,
  resolveLocale,
} from "@/lib/i18n";

function readSingleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pwa?: string | string[]; ref?: string | string[] }>;
}) {
  const query = await searchParams;
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocale({
    acceptLanguage: headerStore.get("accept-language"),
    requestedLocale: cookieStore.get(localeCookieName)?.value,
  });
  const pwaLaunch = readSingleValue(query.pwa) === "1";
  const referralCode = readFanletterReferralCode(query.ref);

  redirect(
    getFanletterNewsCutsHomeHref({
      locale,
      pwaLaunch,
      referralCode,
    }),
  );
}
