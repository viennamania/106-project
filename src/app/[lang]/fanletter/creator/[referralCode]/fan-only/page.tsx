import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorFanOnlyPage } from "@/components/fanletter-subpages";
import {
  getFanletterCreatorFanOnlyPageData,
  type FanletterCreatorFanOnlyPageData,
} from "@/lib/fanletter-content-service";
import {
  buildFanletterOgImagePath,
  buildFanletterOgVersionToken,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import { setPathSearchParams } from "@/lib/landing-branding";

type FanletterCreatorFanOnlySearchParams = {
  ref?: string | string[];
};

function formatShareNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getFanOnlyShareMetadata({
  characterName,
  data,
  locale,
}: {
  characterName: string;
  data: FanletterCreatorFanOnlyPageData;
  locale: Locale;
}) {
  const fanOnlyCount = formatShareNumber(data.fanOnlyContentCount, locale);
  const publicCount = formatShareNumber(data.publicContentCount, locale);
  const price = data.fanOnlyItems[0]?.priceUsdt ?? "1";

  if (locale === "ko") {
    return {
      description:
        data.fanOnlyContentCount > 0
          ? `${characterName}의 팬 전용 브이로그 ${fanOnlyCount}개를 확인하세요. 티저를 보고 ${price} USDT로 전체 영상과 본문을 열 수 있습니다.`
          : `${characterName}의 공개 브이로그 ${publicCount}개를 보고 팬 전용 콘텐츠 오픈을 기다려보세요.`,
      title: `${characterName} 팬 전용 브이로그`,
    };
  }

  return {
    description:
      data.fanOnlyContentCount > 0
        ? `Preview ${fanOnlyCount} fan-only vlogs from ${characterName}, then unlock the full video and body for ${price} USDT.`
        : `Watch ${publicCount} public vlogs from ${characterName} and wait for fan-only drops.`,
    title: `${characterName} fan-only vlogs`,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterCreatorFanOnlySearchParams>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const data = await getFanletterCreatorFanOnlyPageData(locale, referralCode, null);
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const fallbackTitle =
    locale === "ko" ? "FanLetter 팬 전용 브이로그" : "FanLetter fan-only vlogs";
  const fallbackDescription =
    locale === "ko"
      ? "FanLetter AI 캐릭터 팬 전용 브이로그 페이지입니다."
      : "A FanLetter AI character fan-only vlog page.";
  const shareMetadata =
    data && characterName
      ? getFanOnlyShareMetadata({ characterName, data, locale })
      : { description: fallbackDescription, title: fallbackTitle };
  const url = setPathSearchParams(
    `/${locale}/fanletter/creator/${normalizedReferralCode ?? referralCode}/fan-only`,
    {
      ref: readFanletterReferralCode(query.ref),
    },
  );
  const ogVisualUrl =
    data?.fanOnlyItems[0]?.coverImageUrl ??
    data?.items[0]?.coverImageUrl ??
    data?.profile.character?.avatarImageSet[0]?.url ??
    data?.profile.avatarImageUrl ??
    null;
  const ogImagePath = buildFanletterOgImagePath({
    description: shareMetadata.description,
    locale,
    referralCode: normalizedReferralCode,
    title: shareMetadata.title,
    variant: "creator",
    version:
      buildFanletterOgVersionToken(
        "creator-fan-only-og-v1",
        normalizedReferralCode ?? referralCode,
        shareMetadata.title,
        shareMetadata.description,
        ogVisualUrl,
        data?.fanOnlyItems[0]?.contentId,
      ) ??
      normalizedReferralCode ??
      referralCode,
  });
  const ogImage = {
    alt: data
      ? locale === "ko"
        ? `${characterName} 팬 전용 브이로그 미리보기`
        : `${characterName} fan-only vlogs preview`
      : getFanletterOgAlt(locale, "creator"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title: shareMetadata.title,
    description: shareMetadata.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description: shareMetadata.description,
      images: [ogImage],
      siteName: "FanLetter",
      title: shareMetadata.title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description: shareMetadata.description,
      images: [ogImage],
      title: shareMetadata.title,
    },
  };
}

export default async function LocalizedFanletterCreatorFanOnlyPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterCreatorFanOnlySearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const data = await getFanletterCreatorFanOnlyPageData(
    locale,
    referralCode,
    memberSession?.email ?? null,
  );

  if (!data) {
    notFound();
  }

  const queryReferralCode = readFanletterReferralCode(query.ref);

  return (
    <FanletterCreatorFanOnlyPage
      data={data}
      locale={locale}
      referralCode={queryReferralCode ?? data.profile.referralCode}
    />
  );
}
