import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterScoutPage } from "@/components/fanletter-scout-page";
import {
  getFanletterFounderClubHomeStars,
  getFanletterFounderClubMemberPortfolio,
  getFanletterFounderClubStarScoutShareLoop,
} from "@/lib/fanletter-founder-club-service";
import {
  readFanletterReferralCode,
  readFanletterStarId,
} from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import {
  fanletterV2Mock,
  getFanletterV2MockStar,
  type AIStar,
} from "@/mock/fanletterV2";

type FanletterScoutSearchParams = {
  ref?: string | string[];
  starId?: string | string[];
};

export const dynamic = "force-dynamic";

function getScoutMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "AI 스타별 추천 링크를 공유하고 Founder 참여, 보상, 평판 기록 흐름을 확인하세요.",
      title: "스카우트 센터 | FanLetter Founder Club",
    };
  }

  return {
    description:
      "Share AI Star referral links and review Founder participation, rewards, and reputation event flow.",
    title: "Scout Center | FanLetter Founder Club",
  };
}

function uniqueStars(stars: AIStar[]) {
  const seen = new Set<string>();

  return stars.filter((star) => {
    if (seen.has(star.id)) {
      return false;
    }

    seen.add(star.id);

    return true;
  });
}

function resolveSelectedStar({
  queryStarId,
  portfolioPrimaryStarId,
  portfolioRoleStarId,
  stars,
}: {
  portfolioPrimaryStarId?: string | null;
  portfolioRoleStarId?: string | null;
  queryStarId?: string | null;
  stars: AIStar[];
}) {
  const selectedStarId =
    queryStarId ?? portfolioPrimaryStarId ?? portfolioRoleStarId ?? stars[0]?.id;

  if (!selectedStarId) {
    return null;
  }

  return (
    stars.find((star) => star.id === selectedStarId) ??
    getFanletterV2MockStar(selectedStarId) ??
    stars[0] ??
    null
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getScoutMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/scout`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/scout`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterScoutRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterScoutSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const queryStarId = readFanletterStarId(query.starId);
  const inboundReferralCode = readFanletterReferralCode(query.ref);
  const memberSession = await readMemberServerSession();
  const memberEmail = memberSession?.email ?? null;
  const [portfolio, liveStars] = await Promise.all([
    getFanletterFounderClubMemberPortfolio(memberEmail),
    getFanletterFounderClubHomeStars({
      limit: 8,
      selectedStarId: queryStarId,
    }),
  ]);
  const stars = uniqueStars([
    ...liveStars,
    ...fanletterV2Mock.aiStars,
  ]);
  const selectedStar = resolveSelectedStar({
    portfolioPrimaryStarId: portfolio?.primaryStarId,
    portfolioRoleStarId: portfolio?.roles[0]?.starId,
    queryStarId,
    stars,
  });

  if (!selectedStar) {
    notFound();
  }

  const viewerScoutShareLoop = memberEmail
    ? await getFanletterFounderClubStarScoutShareLoop({
        email: memberEmail,
        locale,
        starId: selectedStar.id,
      })
    : null;

  return (
    <FanletterScoutPage
      inboundReferralCode={inboundReferralCode}
      isAuthenticated={Boolean(memberEmail)}
      locale={locale}
      portfolio={portfolio}
      selectedStar={selectedStar}
      stars={stars}
      viewerScoutShareLoop={viewerScoutShareLoop}
    />
  );
}
