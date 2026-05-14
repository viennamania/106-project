import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorPage } from "@/components/fanletter-subpages";
import {
  getFanletterCreatorPageData,
  type FanletterCreatorPageData,
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

type FanletterCreatorSearchParams = {
  ref?: string | string[];
};

function formatShareNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getLocaleSafeShareTitle(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  if (locale === "ko" && !/[가-힣]/.test(value)) {
    return null;
  }

  return value;
}

function getFanletterCreatorShareMetadata({
  characterName,
  data,
  locale,
}: {
  characterName: string;
  data: FanletterCreatorPageData;
  locale: Locale;
}) {
  const publicCount = formatShareNumber(data.publicContentCount, locale);
  const fanOnlyCount = formatShareNumber(data.fanOnlyContentCount, locale);
  const level = data.profile.character?.growth.level ?? 1;
  const latestTitle = getLocaleSafeShareTitle(
    data.profile.character?.latestTitle ?? data.items[0]?.title ?? null,
    locale,
  );

  if (locale === "ko") {
    return {
      description: latestTitle
        ? `공개 브이로그 ${publicCount}개, 팬 전용 ${fanOnlyCount}개, Lv.${level} 캐릭터 채널입니다. 대표 브이로그: ${latestTitle}.`
        : `공개 브이로그 ${publicCount}개와 팬 전용 콘텐츠 ${fanOnlyCount}개를 볼 수 있는 Lv.${level} FanLetter AI 캐릭터 채널입니다.`,
      title: `${characterName} AI 브이로그 채널`,
    };
  }

  return {
    description: latestTitle
      ? `${publicCount} public vlogs, ${fanOnlyCount} fan-only posts, and a Lv.${level} AI character channel. Featured vlog: ${latestTitle}.`
      : `A Lv.${level} FanLetter AI character channel with ${publicCount} public vlogs and ${fanOnlyCount} fan-only posts.`,
    title: `${characterName} AI vlog channel`,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const data = await getFanletterCreatorPageData(locale, referralCode);
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const title = data
    ? `${characterName} | FanLetter`
    : locale === "ko"
      ? "FanLetter 캐릭터"
      : "FanLetter character";
  const description =
    data?.profile.character?.summary ??
    data?.profile.intro ??
    (locale === "ko"
      ? "FanLetter 가상 인물 공개 채널입니다."
      : "A public FanLetter virtual character channel.");
  const shareMetadata =
    data && characterName
      ? getFanletterCreatorShareMetadata({ characterName, data, locale })
      : { description, title };
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const url = `/${locale}/fanletter/creator/${normalizedReferralCode ?? referralCode}`;
  const ogVisualUrl =
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
        "creator-content-og-v2",
        normalizedReferralCode ?? referralCode,
        shareMetadata.title,
        shareMetadata.description,
        ogVisualUrl,
        data?.items[0]?.contentId,
      ) ??
      normalizedReferralCode ??
      referralCode,
  });
  const ogImage = {
    alt: data
      ? locale === "ko"
        ? `${characterName} FanLetter 채널 미리보기`
        : `${characterName} FanLetter channel preview`
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
      description: shareMetadata.description,
      images: [ogImage],
      siteName: "FanLetter",
      title: shareMetadata.title,
      type: "profile",
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

export default async function LocalizedFanletterCreatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterCreatorSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const data = await getFanletterCreatorPageData(
    locale,
    referralCode,
    memberSession?.email ?? null,
  );

  if (!data) {
    notFound();
  }

  const queryReferralCode = readFanletterReferralCode(query.ref);

  return (
    <FanletterCreatorPage
      data={data}
      locale={locale}
      referralCode={queryReferralCode ?? data.profile.referralCode}
    />
  );
}
