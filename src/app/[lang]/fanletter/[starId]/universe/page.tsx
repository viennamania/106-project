import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterFounderUniverseExplorer } from "@/components/fanletter-founder-universe-explorer";
import { getFanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import { getFanletterFounderUniverseExplorer } from "@/lib/fanletter-founder-universe-explorer-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

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
      ? `${starName} 스타 유니버스의 파운더 네트워크입니다. 멤버 ${universe.totals.totalMembers}명과 추천 연결 ${universe.totals.edgeCount}개를 보여줍니다.`
      : `${starName} Star Universe founder network with ${universe.totals.totalMembers} members and ${universe.totals.edgeCount} referral edges.`;

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
}: {
  params: Promise<{ lang: string; starId: string }>;
}) {
  const { lang, starId: rawStarId } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const starId = normalizeFanletterStarId(rawStarId);

  if (!starId) {
    notFound();
  }

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
      locale={lang}
      universe={universe}
    />
  );
}
