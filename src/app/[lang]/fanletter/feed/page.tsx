import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FanletterFeedPage } from "@/components/fanletter-subpages";
import {
  fanletterFeedSortOptions,
  getFanletterFeedPageData,
  type FanletterFeedSort,
} from "@/lib/fanletter-content-service";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";

type FanletterFeedSearchParams = {
  page?: string | string[];
  q?: string | string[];
  ref?: string | string[];
  sort?: string | string[];
};

function readFeedSort(rawValue?: string | string[]): FanletterFeedSort {
  const value = readFirstSearchParam(rawValue);

  return fanletterFeedSortOptions.includes(value as FanletterFeedSort)
    ? (value as FanletterFeedSort)
    : "latest";
}

function readFeedPage(rawValue?: string | string[]) {
  const parsed = Number(readFirstSearchParam(rawValue));

  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterFeedSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 브이로그 피드 | 공개 AI 캐릭터 브이로그"
      : "FanLetter Vlog Feed | Public AI character vlogs";
  const description =
    locale === "ko"
      ? "FanLetter에서 공개된 AI 캐릭터 숏폼 브이로그를 확인하세요."
      : "Browse public AI character short-form vlogs on FanLetter.";
  const url = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "feed",
    version: "fanletter-feed-v1",
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

export default async function LocalizedFanletterFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterFeedSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const cookieStore = await cookies();
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const data = await getFanletterFeedPageData(locale, referralCode, {
    includeNsfw,
    page: readFeedPage(query.page),
    query: readFirstSearchParam(query.q),
    sort: readFeedSort(query.sort),
  });

  return (
    <FanletterFeedPage
      fanOnlyPreviewItems={data.fanOnlyPreviewItems}
      filters={data.filters}
      hiddenNsfwCount={data.hiddenNsfwCount}
      items={data.items}
      locale={locale}
      nsfwOptInEnabled={data.nsfwOptInEnabled}
      referralCode={data.referralCode}
    />
  );
}
