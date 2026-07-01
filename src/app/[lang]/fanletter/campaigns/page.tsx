import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCampaignsPage } from "@/components/fanletter-campaigns-page";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return {
    description:
      locale === "ko"
        ? "상품 URL을 AIAVpark AI 캐릭터 성장 캠페인으로 바꾸는 광고주 스튜디오입니다."
        : "Advertiser studio for turning product URLs into AIAVpark AI character growth campaigns.",
    title:
      locale === "ko"
        ? "AIAVpark 캠페인 스튜디오"
        : "AIAVpark Campaign Studio",
  };
}

export default async function LocalizedFanletterCampaignsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return <FanletterCampaignsPage locale={lang as Locale} />;
}
