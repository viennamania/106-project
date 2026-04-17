import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotificationsPage } from "@/components/notifications-page";
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
    title: `${dictionary.activateNetworkPage.notifications.title} | ${dictionary.common.appName}`,
    description: dictionary.activateNetworkPage.notifications.pageDescription,
  };
}

export default async function LocalizedNotificationsPage({
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
    <NotificationsPage
      dictionary={dictionary}
      locale={locale}
      returnToHref={returnToHref}
    />
  );
}
