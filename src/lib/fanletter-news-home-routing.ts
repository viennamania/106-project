import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

export function getFanletterNewsCutsHomeHref({
  locale,
  pwaLaunch = false,
  referralCode,
}: {
  locale: Locale;
  pwaLaunch?: boolean;
  referralCode: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/cuts`, referralCode),
    {
      pwa: pwaLaunch ? "1" : null,
    },
  );
}
