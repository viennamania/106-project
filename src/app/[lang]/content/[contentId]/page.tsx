import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentDetailPage } from "@/components/content-detail-page";
import { getContentCopy } from "@/lib/content-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contentId: string; lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const copy = getContentCopy(locale);

  return {
    title: `${copy.meta.detailTitle} | 1066friend+`,
    description: copy.meta.detailDescription,
  };
}

export default async function LocalizedContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { contentId, lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );

  return (
    <ContentDetailPage
      contentId={contentId}
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
    />
  );
}
