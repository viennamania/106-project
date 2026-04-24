import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorStudioSalesPage } from "@/components/creator-studio-sales-page";
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

function getSalesTitle(locale: Locale) {
  return locale === "ko" ? "판매 관리" : "Sales management";
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
    title: `${getSalesTitle(locale)} | ${copy.meta.studioTitle} | 1066friend+`,
    description:
      locale === "ko"
        ? "유료 콘텐츠 판매 내역과 판매용 지갑 잔고를 관리합니다."
        : "Manage paid content sales and seller wallet balance.",
  };
}

export default async function LocalizedCreatorStudioSalesPage({
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
    <CreatorStudioSalesPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
  );
}
