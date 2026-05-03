import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorPage } from "@/components/fanletter-subpages";
import { getFanletterCreatorPageData } from "@/lib/fanletter-content-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

type FanletterCreatorSearchParams = {
  ref?: string | string[];
};

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const data = await getFanletterCreatorPageData(locale, referralCode);
  const title = data
    ? `${data.profile.displayName} | FanLetter`
    : locale === "ko"
      ? "FanLetter 크리에이터"
      : "FanLetter creator";
  const description =
    data?.profile.intro ??
    (locale === "ko"
      ? "FanLetter 크리에이터 공개 채널입니다."
      : "A public FanLetter creator channel.");

  return {
    title,
    description,
    openGraph: {
      description,
      title,
      url: `/${locale}/fanletter/creator/${referralCode}`,
    },
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function LocalizedFanletterCreatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterCreatorSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const data = await getFanletterCreatorPageData(locale, referralCode);

  if (!data) {
    notFound();
  }

  const queryReferralCode = readReferralCode(query.ref);

  return (
    <FanletterCreatorPage
      data={data}
      locale={locale}
      referralCode={queryReferralCode ?? data.profile.referralCode}
    />
  );
}
