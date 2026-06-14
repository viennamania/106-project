import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterAgentRankCoverageAuditPage } from "@/components/fanletter-agentrank-coverage-audit-page";
import { getAgentRankBackfillReadinessSnapshot } from "@/lib/agentrank/backfill-readiness";
import {
  normalizeAgentRankCoverageAction,
  readFirstSearchParam,
} from "@/lib/agentrank/coverage-action";
import { buildAgentRankCoverageSnapshot } from "@/lib/agentrank/coverage";
import { buildAgentRankCoverageEventFeed } from "@/lib/agentrank/coverage-event-feed";
import { getFanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import {
  filterAgentRankReputationEventFeedByMockScope,
  normalizeAgentRankEventMockScope,
  summarizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type CoverageAuditSearchParams = {
  coverageAction?: string | string[];
  limit?: string | string[];
  memberEmail?: string | string[];
  scope?: string | string[];
  starId?: string | string[];
};

function readFirstParam(value?: string | string[]) {
  return readFirstSearchParam(value);
}

function normalizeLimit(value?: string | string[]) {
  const parsed = Number(readFirstParam(value));

  return Number.isFinite(parsed) ? Math.max(10, Math.min(parsed, 200)) : 120;
}

function normalizeMemberEmail(value?: string | string[]) {
  const normalized = readFirstParam(value)?.trim().toLowerCase();

  return normalized || null;
}

function getCoverageAuditMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "FanLetter가 AgentRank Phase 1에서 생성하는 Reputation Event 커버리지를 사람이 검토하는 감사 페이지입니다.",
      title: "AgentRank Coverage Audit | FanLetter",
    };
  }

  return {
    description:
      "A human-readable coverage audit for FanLetter Reputation Events generated for AgentRank Phase 1.",
    title: "AgentRank Coverage Audit | FanLetter",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getCoverageAuditMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/agentrank/coverage`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/agentrank/coverage`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterAgentRankCoverageAuditRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CoverageAuditSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const starId = normalizeFanletterStarId(readFirstParam(query.starId) ?? null);
  const memberEmail = normalizeMemberEmail(query.memberEmail);
  const limit = normalizeLimit(query.limit);
  const eventScope = normalizeAgentRankEventMockScope(
    readFirstParam(query.scope),
  );
  const coverageAction = normalizeAgentRankCoverageAction(query.coverageAction);
  const snapshot = await getFanletterAgentRankInvestorSnapshot({
    limit,
    memberEmail,
    starId,
  });
  const baseEventFeed = filterAgentRankReputationEventFeedByMockScope(
    snapshot.eventFeed,
    eventScope,
  );
  const preliminaryCoverage = buildAgentRankCoverageSnapshot(
    baseEventFeed,
    snapshot.ers.readiness,
  );
  const rawCoverageEventFeed = await buildAgentRankCoverageEventFeed({
    baseFeed: baseEventFeed,
    memberEmail,
    missingTypes: preliminaryCoverage.eventTypes
      .filter((eventType) => !eventType.covered)
      .map((eventType) => eventType.type),
    starId,
  });
  const coverageEventFeed = filterAgentRankReputationEventFeedByMockScope(
    rawCoverageEventFeed,
    eventScope,
  );
  const coverage = buildAgentRankCoverageSnapshot(
    coverageEventFeed,
    snapshot.ers.readiness,
  );
  const backfill = await getAgentRankBackfillReadinessSnapshot();

  return (
    <FanletterAgentRankCoverageAuditPage
      backfill={backfill}
      coverage={coverage}
      coverageAction={coverageAction}
      eventFeed={coverageEventFeed}
      eventScope={{
        raw: summarizeAgentRankEventMockScope(snapshot.eventFeed.events),
        scope: eventScope,
        scoped: summarizeAgentRankEventMockScope(coverageEventFeed.events),
      }}
      generatedAt={snapshot.generatedAt}
      locale={locale}
      scope={{
        limit,
        memberEmail,
        eventScope,
        starId,
      }}
    />
  );
}
