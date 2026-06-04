import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FanletterNewsVlogsPage } from "@/components/fanletter-news-vlog-pages";
import {
  fanletterFeedSortOptions,
  getFanletterFeedPageData,
  type FanletterFeedSort,
} from "@/lib/fanletter-content-service";
import {
  buildFanletterOgImagePath,
  buildFanletterOgVersionToken,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { setPathSearchParams } from "@/lib/landing-branding";

type FanletterNewsVlogsSearchParams = {
  page?: string | string[];
  q?: string | string[];
  ref?: string | string[];
  sort?: string | string[];
};

function readVlogsSort(rawValue?: string | string[]): FanletterFeedSort {
  const value = readFirstSearchParam(rawValue);

  return fanletterFeedSortOptions.includes(value as FanletterFeedSort)
    ? (value as FanletterFeedSort)
    : "latest";
}

function readVlogsPage(rawValue?: string | string[]) {
  const parsed = Number(readFirstSearchParam(rawValue));

  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
}

function readVlogsQuery(rawValue?: string | string[]) {
  return (readFirstSearchParam(rawValue) ?? "").trim().slice(0, 80);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsVlogsSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const searchQuery = readVlogsQuery(query.q);
  const title =
    locale === "ko"
      ? "브이로그 아카이브 | AIAVpark News"
      : "Vlog Archive | AIAVpark News";
  const description =
    locale === "ko"
      ? "AI 캐릭터의 공개 브이로그와 팬 전용 티저를 이어서 둘러보세요."
      : "Browse AI character public vlogs and fan-only teasers.";
  const url = setPathSearchParams(`/${locale}/fanletter/news/vlogs`, {
    q: searchQuery || null,
    ref: readFanletterReferralCode(query.ref),
    sort: readVlogsSort(query.sort) === "latest" ? null : readVlogsSort(query.sort),
  });
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode: readFanletterReferralCode(query.ref),
    title,
    variant: "feed",
    version:
      buildFanletterOgVersionToken(
        "news-vlogs-og-v1",
        locale,
        title,
        description,
        searchQuery,
      ) ?? "news-vlogs",
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
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterNewsVlogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsVlogsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const cookieStore = await cookies();
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const referralCode = readFanletterReferralCode(query.ref);
  const data = await getFanletterFeedPageData(locale, referralCode, {
    includeNsfw,
    page: readVlogsPage(query.page),
    query: readVlogsQuery(query.q),
    sort: readVlogsSort(query.sort),
  });

  return (
    <FanletterNewsVlogsPage
      data={data}
      locale={locale}
      referralCode={referralCode}
    />
  );
}
