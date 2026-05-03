import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterStartPage } from "@/components/fanletter-subpages";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

type FanletterStartSearchParams = {
  ref?: string | string[];
};

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterStartSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const title =
    locale === "ko" ? "FanLetter 시작하기" : "Start FanLetter";
  const description =
    locale === "ko"
      ? "FanLetter에서 크리에이터 프로필, AI 콘텐츠 생성, 게시와 판매 흐름을 시작하세요."
      : "Start creator profile setup, AI content creation, publishing, and sales on FanLetter.";

  return {
    title,
    description,
    openGraph: {
      description,
      title,
      url: buildPathWithReferral(`/${locale}/fanletter/start`, referralCode),
    },
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function LocalizedFanletterStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterStartSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <FanletterStartPage
      locale={lang as Locale}
      referralCode={readReferralCode(query.ref)}
    />
  );
}
