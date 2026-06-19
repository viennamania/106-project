import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FanletterStarDetailPage } from "@/components/fanletter-star-detail-page";
import {
  normalizeAgentRankCoverageAction,
  readFirstSearchParam,
} from "@/lib/agentrank/coverage-action";
import { getFanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import {
  getFanletterFounderClubHomeStars,
  getFanletterFounderClubStarScoutShareLoop,
  getFanletterFounderClubStarDetail,
} from "@/lib/fanletter-founder-club-service";
import {
  normalizeFanletterStarId,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import {
  fanletterV2Mock,
  getFanletterV2LocalizedText,
  getFanletterV2MockStar,
  type AIStar,
  type ScoutShareLoopData,
} from "@/mock/fanletterV2";

type FanletterStarLandingSearchParams = {
  coverageAction?: string | string[];
  founder?: string | string[];
  ref?: string | string[];
  starId?: string | string[];
};

function readMockFounderJoined(rawValue?: string | string[]) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  return value === "joined" || value === "1" || value === "true";
}

function buildMockReferralCode(star: AIStar) {
  const starToken =
    star.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ||
    star.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return `${(starToken || "STAR").slice(0, 12)}-A-001`;
}

function buildMockFounderShareLink({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}) {
  const url = new URL(
    `/${locale}/fanletter/${encodeURIComponent(star.id)}`,
    "https://www.net402.ai",
  );
  url.searchParams.set("ref", referralCode);

  return url.toString();
}

function buildMockFounderScoutShareLoop({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string | null;
  star: AIStar;
}): ScoutShareLoopData {
  const effectiveReferralCode = referralCode ?? buildMockReferralCode(star);

  return {
    ...fanletterV2Mock.scoutShareLoop,
    referralCode: effectiveReferralCode,
    selectedUniverse: star.universeName,
    shareLink: buildMockFounderShareLink({
      locale,
      referralCode: effectiveReferralCode,
      star,
    }),
    starId: star.id,
    starName: star.name,
  };
}

function buildFanletterStarRedirectHref({
  locale,
  referralCode,
  starId,
}: {
  locale: Locale;
  referralCode: string | null;
  starId: string;
}) {
  const searchParams = new URLSearchParams({
    star: starId,
  });

  if (referralCode) {
    searchParams.set("ref", referralCode);
  }

  return `/${locale}/fanletter/founder-club?${searchParams.toString()}`;
}

async function resolveFanletterStarDetail(starId: string): Promise<{
  relatedStars: AIStar[];
  star: AIStar | null;
}> {
  const mockStar = getFanletterV2MockStar(starId);

  if (mockStar) {
    return {
      relatedStars: fanletterV2Mock.aiStars
        .filter((item) => item.id !== mockStar.id)
        .slice(0, 3),
      star: mockStar,
    };
  }

  const [liveStar, liveStars] = await Promise.all([
    getFanletterFounderClubStarDetail(starId),
    getFanletterFounderClubHomeStars({
      limit: 4,
      selectedStarId: starId,
    }),
  ]);

  if (!liveStar) {
    return {
      relatedStars: [],
      star: null,
    };
  }

  return {
    relatedStars: [
      ...liveStars.filter((item) => item.id !== liveStar.id),
      ...fanletterV2Mock.aiStars,
    ]
      .filter((item, index, list) =>
        list.findIndex((candidate) => candidate.id === item.id) === index,
      )
      .slice(0, 3),
    star: liveStar,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; starId: string }>;
}): Promise<Metadata> {
  const { lang, starId: rawStarId } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const starId = normalizeFanletterStarId(rawStarId);
  const star = starId
    ? (await resolveFanletterStarDetail(starId)).star
    : null;

  if (!star) {
    return {
      title: "AIAVpark | FanLetter",
    };
  }

  const specialty = getFanletterV2LocalizedText(star.specialty, locale);
  const title =
    locale === "ko"
      ? `${star.name} AI 스타 유니버스 | 파운더 클럽 2.0`
      : `${star.name} AI Star Universe | Founder Club 2.0`;
  const description =
    locale === "ko"
      ? `${star.name} ${specialty} AI 스타 유니버스입니다. Founder로 참여하고 추천 코드를 만들어 파운더 네트워크 안에서 성장하세요.`
      : `${star.name} ${specialty} AI Star Universe. Join as Founder, create a referral code, and grow through the Founder Network.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/fanletter/${star.id}`,
    },
    openGraph: {
      description,
      siteName: "AIAVpark",
      title,
      type: "website",
      url: `/${locale}/fanletter/${star.id}`,
    },
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function FanletterStarLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; starId: string }>;
  searchParams: Promise<FanletterStarLandingSearchParams>;
}) {
  const [{ lang, starId: rawStarId }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const starId = normalizeFanletterStarId(rawStarId);

  if (!starId) {
    notFound();
  }

  const { relatedStars, star } = await resolveFanletterStarDetail(starId);
  const referralCode = readFanletterReferralCode(query.ref);
  const isMockFounderJoined = readMockFounderJoined(query.founder);
  const coverageAction = normalizeAgentRankCoverageAction(query.coverageAction);
  const coverageStarId =
    normalizeFanletterStarId(readFirstSearchParam(query.starId) ?? null) ??
    starId;
  const memberSession = await readMemberServerSession();

  if (star) {
    const [liveViewerScoutShareLoop, agentRankSnapshot] = await Promise.all([
      getFanletterFounderClubStarScoutShareLoop({
        email: memberSession?.email ?? null,
        locale: lang,
        starId: star.id,
      }),
      getFanletterAgentRankInvestorSnapshot({
        limit: 80,
        starId: star.id,
      }).catch((error) => {
        console.error("Failed to load FanLetter star AgentRank snapshot", error);

        return null;
      }),
    ]);
    const viewerScoutShareLoop =
      liveViewerScoutShareLoop ??
      (isMockFounderJoined
        ? buildMockFounderScoutShareLoop({
            locale: lang,
            referralCode,
            star,
          })
        : null);

    return (
      <FanletterStarDetailPage
        agentRankSnapshot={agentRankSnapshot}
        coverageAction={
          coverageAction
            ? {
                action: coverageAction,
                starId: coverageStarId,
              }
            : null
        }
        isAuthenticated={Boolean(memberSession?.email)}
        inboundReferralCode={referralCode}
        locale={lang}
        relatedStars={relatedStars}
        star={star}
        viewerScoutShareLoop={viewerScoutShareLoop}
      />
    );
  }

  redirect(
    buildFanletterStarRedirectHref({
      locale: lang,
      referralCode,
      starId,
    }),
  );
}
