import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterAgentRankPage } from "@/components/fanletter-agentrank-page";
import { getAgentRankBackfillReadinessSnapshot } from "@/lib/agentrank/backfill-readiness";
import { buildAgentRankCoverageSnapshot } from "@/lib/agentrank/coverage";
import { buildAgentRankCoverageEventFeed } from "@/lib/agentrank/coverage-event-feed";
import { getFanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type AgentRankSearchParams = {
  memberEmail?: string;
  starId?: string;
};

function getAgentRankMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "FanLetter가 AgentRank Phase 1로 생성하는 Reputation Events와 Economic Reputation Score를 보여주는 투자자용 페이지입니다.",
      title: "AgentRank | FanLetter Reputation Event Factory",
    };
  }

  return {
    description:
      "An investor-facing AgentRank preview showing FanLetter reputation events and the Economic Reputation Score.",
    title: "AgentRank | FanLetter Reputation Event Factory",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getAgentRankMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/agentrank`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/agentrank`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterAgentRankRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<AgentRankSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const starId =
    typeof query.starId === "string"
      ? normalizeFanletterStarId(query.starId)
      : null;
  const memberEmail =
    typeof query.memberEmail === "string"
      ? query.memberEmail.trim().toLowerCase()
      : null;
  const snapshot = await getFanletterAgentRankInvestorSnapshot({
    coverageProbe: true,
    includeMockEvents: true,
    limit: 120,
    memberEmail,
    starId,
  });
  const preliminaryCoverage = buildAgentRankCoverageSnapshot(
    snapshot.eventFeed,
    snapshot.ers.readiness,
  );
  const coverageEventFeed = await buildAgentRankCoverageEventFeed({
    baseFeed: snapshot.eventFeed,
    memberEmail,
    missingSources: preliminaryCoverage.sources
      .filter((source) => !source.covered)
      .map((source) => source.source),
    missingTypes: preliminaryCoverage.eventTypes
      .filter((eventType) => !eventType.covered)
      .map((eventType) => eventType.type),
    starId,
  });
  const coverage = buildAgentRankCoverageSnapshot(
    coverageEventFeed,
    snapshot.ers.readiness,
  );
  const backfill = await getAgentRankBackfillReadinessSnapshot();

  return (
    <FanletterAgentRankPage
      backfill={backfill}
      coverage={coverage}
      locale={locale}
      snapshot={snapshot}
      starId={starId}
    />
  );
}
