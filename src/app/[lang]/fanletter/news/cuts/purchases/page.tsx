import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FanletterPurchasesPage } from "@/components/fanletter-purchases-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterNewsCutPurchasesSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetadataCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "AIAVpark News 4컷 피드에서 구매한 팬 전용 원본과 유료 콘텐츠를 다시 확인하세요.",
        title: "4컷 피드 구매함 | AIAVpark News",
      }
    : {
        description:
          "Review fan-only sources and paid content purchased from the AIAVpark News 4-cut feed.",
        title: "4-cut feed purchases | AIAVpark News",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCutPurchasesSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const { description, title } = getMetadataCopy(locale);
  const url = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts/purchases`,
    referralCode,
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "feed",
    version: "fanletter-news-cuts-purchases-v1",
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
      siteName: "AIAVpark News",
      title,
      type: "website",
      url,
    },
    robots: {
      follow: false,
      index: false,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterNewsCutPurchasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCutPurchasesSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );

  return (
    <FanletterPurchasesPage
      locale={locale}
      nsfwOptInEnabled={nsfwOptInEnabled}
      referralCode={readFanletterReferralCode(query.ref)}
      returnToHref={normalizeFanletterReturnToPath(query.returnTo, locale)}
      service="news"
      surface="cutFeed"
    />
  );
}
