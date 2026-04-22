import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorContentStudioPage } from "@/components/creator-content-studio-page";
import { getContentCopy } from "@/lib/content-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

function resolveReturnTo(
  locale: Locale,
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith(`/${locale}/`) ||
    candidate.startsWith("//")
  ) {
    return null;
  }

  return candidate;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const copy = getContentCopy(locale);

  return {
    title: `${copy.meta.studioTitle} | 1066friend+`,
    description: copy.meta.studioDescription,
  };
}

export default async function LocalizedCreatorStudioPage({
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
  const returnToHref = resolveReturnTo(locale, query.returnTo);

  return (
    <CreatorContentStudioPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      view="hub"
    />
  );
}
