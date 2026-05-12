import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterRequestsPage } from "@/components/fanletter-requests-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterRequestsSearchParams = {
  ref?: string | string[];
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterRequestsSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "내 팬 요청 인박스 | FanLetter"
      : "My Fan Request Inbox | FanLetter";
  const description =
    locale === "ko"
      ? "FanLetter에서 내가 남긴 팬 요청을 접수, 검토, 제작 완료 단계로 추적하세요."
      : "Track FanLetter fan requests from received to reviewed and produced.";
  const url = buildPathWithReferral(
    `/${locale}/fanletter/requests`,
    referralCode,
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "feed",
    version: "fanletter-requests-v1",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "feed"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: [ogImage],
      siteName: "FanLetter",
      title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterRequestsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <FanletterRequestsPage
      locale={lang as Locale}
      referralCode={readFanletterReferralCode(query.ref)}
    />
  );
}
