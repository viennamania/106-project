import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotificationsPage } from "@/components/notifications-page";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";

function sanitizeReturnTo(input: string | null | undefined, locale: Locale) {
  if (!input) {
    return `/${locale}/activate`;
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return `/${locale}/activate`;
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
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const returnToInput = Array.isArray(query.returnTo)
    ? query.returnTo[0]
    : query.returnTo;
  const returnToHref = sanitizeReturnTo(returnToInput, locale);

  return (
    <NotificationsPage
      dictionary={dictionary}
      locale={locale}
      returnToHref={returnToHref}
    />
  );
}
