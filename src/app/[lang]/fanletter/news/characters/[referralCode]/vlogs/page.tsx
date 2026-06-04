import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FanletterNewsCharacterVlogsPage } from "@/components/fanletter-news-vlog-pages";
import {
  fanletterFeedSortOptions,
  getFanletterCreatorVlogsPageData,
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
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import { setPathSearchParams } from "@/lib/landing-branding";

type FanletterNewsCharacterVlogsSearchParams = {
  page?: string | string[];
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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterNewsCharacterVlogsSearchParams>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const data = await getFanletterCreatorVlogsPageData(locale, referralCode, null, {
    page: readVlogsPage(query.page),
    sort: readVlogsSort(query.sort),
  });
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const publicCount = formatNumber(data?.publicContentCount ?? 0, locale);
  const title =
    data && characterName
      ? locale === "ko"
        ? `${characterName} 공개 브이로그 | AIAVpark News`
        : `${characterName} public vlogs | AIAVpark News`
      : locale === "ko"
        ? "공개 브이로그 | AIAVpark News"
        : "Public vlogs | AIAVpark News";
  const description =
    data && characterName
      ? locale === "ko"
        ? `${characterName}의 공개 브이로그 ${publicCount}개를 보고, 캐릭터 분위기와 리포트 소재가 될 원본 장면을 확인하세요.`
        : `Watch ${publicCount} public vlogs from ${characterName} and find source scenes for the character channel.`
      : locale === "ko"
        ? "AI 캐릭터 공개 브이로그 목록입니다."
        : "An AI character public vlog archive.";
  const url = setPathSearchParams(
    `/${locale}/fanletter/news/characters/${normalizedReferralCode ?? referralCode}/vlogs`,
    {
      ref: readFanletterReferralCode(query.ref),
    },
  );
  const ogVisualUrl =
    data?.items[0]?.coverImageUrl ??
    data?.profile.character?.avatarImageSet[0]?.url ??
    data?.profile.avatarImageUrl ??
    null;
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode: normalizedReferralCode,
    title,
    variant: "creator",
    version:
      buildFanletterOgVersionToken(
        "news-character-vlogs-og-v1",
        normalizedReferralCode ?? referralCode,
        title,
        description,
        ogVisualUrl,
        data?.items[0]?.contentId,
      ) ??
      normalizedReferralCode ??
      referralCode,
  });
  const ogImage = {
    alt: data
      ? locale === "ko"
        ? `${characterName} 공개 브이로그 미리보기`
        : `${characterName} public vlogs preview`
      : getFanletterOgAlt(locale, "creator"),
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

export default async function LocalizedFanletterNewsCharacterVlogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterNewsCharacterVlogsSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const cookieStore = await cookies();
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const data = await getFanletterCreatorVlogsPageData(
    locale,
    referralCode,
    memberSession?.email ?? null,
    {
      includeNsfw,
      page: readVlogsPage(query.page),
      sort: readVlogsSort(query.sort),
    },
  );

  if (!data) {
    notFound();
  }

  return (
    <FanletterNewsCharacterVlogsPage
      data={data}
      locale={locale}
      referralCode={readFanletterReferralCode(query.ref)}
    />
  );
}
