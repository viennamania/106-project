import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnnouncementsPage } from "@/components/announcements-page";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

function sanitizeReturnTo(
  input: string | null | undefined,
  locale: Locale,
  referralCode: string | null,
) {
  if (!input) {
    return buildPathWithReferral(`/${locale}/activate`, referralCode);
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return buildPathWithReferral(`/${locale}/activate`, referralCode);
  }

  return trimmed;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const dictionary = getDictionary(locale);

  return {
    title: `${dictionary.announcementsPage.title} | ${dictionary.common.appName}`,
    description: dictionary.announcementsPage.description,
  };
}

export default async function LocalizedAnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[]; returnTo?: string | string[] }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );
  const returnToInput = Array.isArray(query.returnTo)
    ? query.returnTo[0]
    : query.returnTo;
  const returnToHref = sanitizeReturnTo(returnToInput, locale, referralCode);

  return (
    <AnnouncementsPage
      dictionary={dictionary}
      locale={locale}
      returnToHref={returnToHref}
    />
  );
}
