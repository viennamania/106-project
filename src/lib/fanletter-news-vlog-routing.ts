import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

export function getFanletterNewsVlogsHref({
  locale,
  page,
  query,
  referralCode,
  sort,
}: {
  locale: Locale;
  page?: number | null;
  query?: string | null;
  referralCode: string | null;
  sort?: string | null;
}) {
  const normalizedQuery = query?.trim() ?? "";

  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/vlogs`, referralCode),
    {
      page: page && page > 1 ? String(page) : null,
      q: normalizedQuery || null,
      sort: sort && sort !== "latest" ? sort : null,
    },
  );
}

export function getFanletterNewsCharacterVlogsHref({
  creatorReferralCode,
  locale,
  page,
  referralCode,
  sort,
}: {
  creatorReferralCode: string;
  locale: Locale;
  page?: number | null;
  referralCode: string | null;
  sort?: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/characters/${creatorReferralCode}/vlogs`,
      referralCode,
    ),
    {
      page: page && page > 1 ? String(page) : null,
      sort: sort && sort !== "latest" ? sort : null,
    },
  );
}

export function getFanletterNewsVlogHref({
  contentId,
  locale,
  referralCode,
  returnToHref,
}: {
  contentId: string;
  locale: Locale;
  referralCode: string | null;
  returnToHref?: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/vlogs/${contentId}`, referralCode),
    {
      returnTo: returnToHref,
    },
  );
}
