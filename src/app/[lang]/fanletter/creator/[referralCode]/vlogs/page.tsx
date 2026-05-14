import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorVlogsPage } from "@/components/fanletter-subpages";
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
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import { setPathSearchParams } from "@/lib/landing-branding";

type FanletterCreatorVlogsSearchParams = {
  page?: string | string[];
  ref?: string | string[];
  sort?: string | string[];
};

function readCreatorVlogsSort(rawValue?: string | string[]): FanletterFeedSort {
  const value = readFirstSearchParam(rawValue);

  return fanletterFeedSortOptions.includes(value as FanletterFeedSort)
    ? (value as FanletterFeedSort)
    : "latest";
}

function readCreatorVlogsPage(rawValue?: string | string[]) {
  const parsed = Number(readFirstSearchParam(rawValue));

  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
}

function formatShareNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterCreatorVlogsSearchParams>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const data = await getFanletterCreatorVlogsPageData(locale, referralCode, null, {
    page: readCreatorVlogsPage(query.page),
    sort: readCreatorVlogsSort(query.sort),
  });
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const publicCount = formatShareNumber(data?.publicContentCount ?? 0, locale);
  const title =
    data && characterName
      ? locale === "ko"
        ? `${characterName} 공개 브이로그 | FanLetter`
        : `${characterName} public vlogs | FanLetter`
      : locale === "ko"
        ? "FanLetter 공개 브이로그"
        : "FanLetter public vlogs";
  const description =
    data && characterName
      ? locale === "ko"
        ? `${characterName} 채널의 공개 브이로그 ${publicCount}개를 확인하세요.`
        : `Browse ${publicCount} public vlogs from ${characterName}.`
      : locale === "ko"
        ? "FanLetter AI 캐릭터 공개 브이로그 목록입니다."
        : "A FanLetter AI character public vlog archive.";
  const url = setPathSearchParams(
    `/${locale}/fanletter/creator/${normalizedReferralCode ?? referralCode}/vlogs`,
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
        "creator-vlogs-og-v1",
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

export default async function LocalizedFanletterCreatorVlogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterCreatorVlogsSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const data = await getFanletterCreatorVlogsPageData(
    locale,
    referralCode,
    memberSession?.email ?? null,
    {
      page: readCreatorVlogsPage(query.page),
      sort: readCreatorVlogsSort(query.sort),
    },
  );

  if (!data) {
    notFound();
  }

  const queryReferralCode = readFanletterReferralCode(query.ref);

  return (
    <FanletterCreatorVlogsPage
      data={data}
      locale={locale}
      referralCode={queryReferralCode ?? data.profile.referralCode}
    />
  );
}
