import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import {
  FanletterHomePage,
  type FanletterHomeShareContext,
} from "@/components/fanletter-home-page";
import { FanletterHomeStructuredData } from "@/components/fanletter-home-structured-data";
import {
  getFanletterFounderClubCreatorUnlock,
  getFanletterFounderClubHomeStars,
  getFanletterFounderClubMemberPortfolio,
  getFanletterFounderClubScoutShareLoop,
} from "@/lib/fanletter-founder-club-service";
import { getFanletterCreatorPageData } from "@/lib/fanletter-content-service";
import {
  getFanletterLandingData,
  type FanletterLandingData,
} from "@/lib/fanletter-landing-service";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { getFanletterPromoSponsor } from "@/lib/fanletter-promo-sponsor";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  readFanletterReferralCode,
  readFanletterStarId,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";
import { fanletterV2Mock } from "@/mock/fanletterV2";

type FanletterHomeSearchParams = {
  coverageAction?: string | string[];
  creator?: string | string[];
  from?: string | string[];
  ref?: string | string[];
  shareId?: string | string[];
  sponsor?: string | string[];
  star?: string | string[];
  starId?: string | string[];
};

function getFanletterMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "팬 요청으로 성장하는 AI 캐릭터 브이로그를 만들고, 팬 전용 콘텐츠 수익을 참여 보상과 공유 모델로 확장하는 AIAVpark 플랫폼입니다.",
      title: "AIAVpark | 팬이 키우는 AI 캐릭터 성장 플랫폼",
    };
  }

  return {
    description:
      "AIAVpark helps creators grow AI character vlogs through fan requests, then expand fan-only content revenue into participation rewards and sharing models.",
    title: "AIAVpark | Fan-powered AI character growth platform",
  };
}

function getFanletterHomeFallbackLandingData(): FanletterLandingData {
  return {
    featuredPaidVideos: [],
    featuredVideos: [],
    hiddenNsfwCount: 0,
    liveStats: {
      activeCreatorCount: 0,
      confirmedSalesCount: 0,
      publishedContentCount: 0,
      publicVideoCount: 0,
      totalSalesUsdt: 0,
    },
    nsfwOptInEnabled: false,
  };
}

async function safeLoadFanletterHomeData<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
  timeoutMs = 4500,
): Promise<T> {
  try {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => {
        console.error(
          `Timed out loading FanLetter home ${label}; using fallback`,
        );
        resolve(fallback);
      }, timeoutMs);
    });
    const result = await Promise.race([promise, timeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return result;
  } catch (error) {
    console.error(`Failed to load FanLetter home ${label}`, error);

    return fallback;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterHomeSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const meta = getFanletterMeta(locale);
  const url = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const ogImagePath = buildFanletterOgImagePath({
    description: meta.description,
    locale,
    referralCode,
    title: meta.title,
    variant: "home",
    version: "fanletter-home-v6",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "home"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description: meta.description,
      images: [ogImage],
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      images: [ogImage],
      title: meta.title,
    },
  };
}

export default async function FanletterRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterHomeSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }
  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const founderClubStarId = readFanletterStarId(query.star);
  const coverageAction = readFirstSearchParam(query.coverageAction)?.trim() ?? null;
  const coverageStarId = readFanletterStarId(query.starId) ?? founderClubStarId;
  const shareSource = readFirstSearchParam(query.from)?.trim().toLowerCase();
  const shareCreatorReferralCode = normalizeReferralCode(
    readFirstSearchParam(query.creator),
  );
  const shareId = normalizeShareId(readFirstSearchParam(query.shareId));
  const sponsor = getFanletterPromoSponsor(readFirstSearchParam(query.sponsor));
  const shouldLoadShareContext =
    shareSource === "share" && Boolean(shareCreatorReferralCode);
  const [cookieStore, memberSession] = await Promise.all([
    cookies(),
    readMemberServerSession(),
  ]);
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const [
    landingData,
    shareCreatorData,
    founderClubStars,
    founderClubMemberPortfolio,
    founderClubScoutShareLoop,
    founderClubCreatorUnlock,
  ] = await Promise.all([
    safeLoadFanletterHomeData(
      "landing data",
      getFanletterLandingData(locale, includeNsfw),
      getFanletterHomeFallbackLandingData(),
    ),
    shouldLoadShareContext && shareCreatorReferralCode
      ? safeLoadFanletterHomeData(
          "share context",
          getFanletterCreatorPageData(locale, shareCreatorReferralCode, null),
          null,
        )
      : Promise.resolve(null),
    safeLoadFanletterHomeData(
      "AI Stars",
      getFanletterFounderClubHomeStars({
        selectedStarId: founderClubStarId,
      }),
      fanletterV2Mock.aiStars,
    ),
    safeLoadFanletterHomeData(
      "member portfolio",
      getFanletterFounderClubMemberPortfolio(memberSession?.email ?? null),
      null,
    ),
    safeLoadFanletterHomeData(
      "scout share loop",
      getFanletterFounderClubScoutShareLoop({
        email: memberSession?.email ?? null,
        locale,
      }),
      null,
    ),
    safeLoadFanletterHomeData(
      "creator unlock",
      getFanletterFounderClubCreatorUnlock(memberSession?.email ?? null),
      null,
    ),
  ]);
  const shareContextReferralCode =
    referralCode ?? shareCreatorData?.profile.referralCode ?? null;
  const shareChannelHref = shareCreatorData
    ? buildPathWithReferral(
        `/${locale}/fanletter/channel/${shareCreatorData.profile.referralCode}`,
        shareContextReferralCode,
      )
    : null;
  const shareReturnToHref =
    shareCreatorData && shareId
      ? setPathSearchParams(`/${locale}/fanletter/share/${shareId}`, {
          creator: shareCreatorData.profile.referralCode,
          ref: shareContextReferralCode,
          sponsor: sponsor.slug,
        })
      : shareChannelHref;
  const shareContextParams = shareCreatorData
    ? {
        creator: shareCreatorData.profile.referralCode,
        from: "share",
        returnTo: shareReturnToHref,
        shareId,
        sponsor: sponsor.slug,
      }
    : null;
  const shareContext: FanletterHomeShareContext | null = shareCreatorData
    ? {
        avatarImageUrl:
          shareCreatorData.profile.character?.avatarImageSet[0]?.url ??
          shareCreatorData.profile.avatarImageUrl,
        channelHref: shareChannelHref ?? `/${locale}/fanletter`,
        channelName:
          shareCreatorData.profile.character?.name ??
          shareCreatorData.profile.displayName,
        creatorReferralCode: shareCreatorData.profile.referralCode,
        onboardingHref: setPathSearchParams(
          buildPathWithReferral(
            `/${locale}/fanletter/onboarding`,
            shareContextReferralCode,
          ),
          shareContextParams ?? {},
        ),
        shareId,
        sponsorName: sponsor.name,
        sponsorSlug: sponsor.slug,
      }
    : null;

  return (
    <>
      <FanletterHomeStructuredData locale={locale} />
      <FanletterHomePage
        featuredVideos={landingData.featuredVideos}
        founderClubCreatorUnlock={founderClubCreatorUnlock}
        founderClubMemberPortfolio={founderClubMemberPortfolio}
        founderClubScoutShareLoop={founderClubScoutShareLoop}
        founderClubSelectedStarId={founderClubStarId}
        founderClubStars={founderClubStars}
        agentRankTrackingStarId={coverageStarId}
        coverageAction={coverageAction}
        locale={locale}
        liveStats={landingData.liveStats}
        referralCode={referralCode}
        shareContext={shareContext}
      />
    </>
  );
}
