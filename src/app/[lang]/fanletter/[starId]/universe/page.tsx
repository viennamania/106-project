import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createHash } from "node:crypto";

import { FanletterFounderUniverseExplorer } from "@/components/fanletter-founder-universe-explorer";
import {
  normalizeAgentRankCoverageAction,
  readFirstSearchParam,
} from "@/lib/agentrank/coverage-action";
import { getFanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import { getFanletterFounderUniverseExplorer } from "@/lib/fanletter-founder-universe-explorer-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

type FanletterFounderUniverseSearchParams = {
  coverageAction?: string | string[];
  memberEmail?: string | string[];
  starId?: string | string[];
};

function getViewerNodeId(email?: string | null) {
  const normalizedEmail = normalizeEmail(email ?? "");

  if (!normalizedEmail) {
    return null;
  }

  return `member-${createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 16)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; starId: string }>;
}): Promise<Metadata> {
  const { lang, starId: rawStarId } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const starId = normalizeFanletterStarId(rawStarId);
  const universe = starId
    ? await getFanletterFounderUniverseExplorer(starId)
    : null;

  if (!universe) {
    return {
      title: "Founder Network | FanLetter",
    };
  }

  const starName =
    universe.star.name?.trim() || universe.star.displayName?.trim() || "AI Star";
  const title =
    locale === "ko"
      ? `${starName} 파운더 네트워크 탐색`
      : `${starName} Founder Network Explorer`;
  const description =
    locale === "ko"
      ? `${starName} AI 스타 유니버스 안의 파운더 네트워크입니다. 멤버 ${universe.totals.totalMembers}명과 추천 연결 ${universe.totals.edgeCount}개를 보여줍니다.`
      : `${starName} AI Star Universe Founder Network with ${universe.totals.totalMembers} members and ${universe.totals.edgeCount} referral edges.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/fanletter/${universe.star.id}/universe`,
    },
    openGraph: {
      description,
      siteName: "AIAVpark",
      title,
      type: "website",
      url: `/${locale}/fanletter/${universe.star.id}/universe`,
    },
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function FanletterFounderUniverseExplorerRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; starId: string }>;
  searchParams: Promise<FanletterFounderUniverseSearchParams>;
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

  const coverageAction = normalizeAgentRankCoverageAction(query.coverageAction);
  const coverageStarId =
    normalizeFanletterStarId(readFirstSearchParam(query.starId) ?? null) ??
    starId;
  const coverageMemberEmail =
    readFirstSearchParam(query.memberEmail)?.trim().slice(0, 160) || null;
  const memberSession = await readMemberServerSession();
  const viewerNodeId = getViewerNodeId(memberSession?.email);

  const [universe, agentRank] = await Promise.all([
    getFanletterFounderUniverseExplorer(starId),
    getFanletterAgentRankInvestorSnapshot({
      limit: 80,
      starId,
    }),
  ]);

  if (!universe) {
    notFound();
  }

  return (
    <FanletterFounderUniverseExplorer
      agentRank={agentRank}
      coverageAction={
        coverageAction
          ? {
              action: coverageAction,
              memberEmail: coverageMemberEmail,
              starId: coverageStarId,
            }
          : null
      }
      locale={lang}
      universe={universe}
      viewerNodeId={viewerNodeId}
    />
  );
}
