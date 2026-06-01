import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterNewsPublicCutsFeedPage } from "@/components/fanletter-news-public-cuts-feed-page";
import { getFanletterNewsPublicCutFeed } from "@/lib/fanletter-news-public-cuts";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

type FanletterNewsCutsSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "팬 기자가 원본 브이로그 프레임에서 직접 고르고 크롭한 4컷을 전체화면 피드로 넘겨보는 FanLetter News 서비스입니다.",
        title: "리포터 컷 피드 | FanLetter News",
      }
    : {
        description:
          "A full-screen FanLetter News feed of four teaser cuts selected and cropped by fan reporters.",
        title: "Reporter Cut Feed | FanLetter News",
      };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: copy.title,
    description: copy.description,
  };
}

export default async function LocalizedFanletterNewsCutsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCutsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const items = await getFanletterNewsPublicCutFeed({
    locale,
  });

  return (
    <FanletterNewsPublicCutsFeedPage
      items={items}
      locale={locale}
      referralCode={referralCode}
    />
  );
}
