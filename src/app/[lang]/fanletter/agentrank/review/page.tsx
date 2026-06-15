import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterAgentRankReviewPage } from "@/components/fanletter-agentrank-review-page";
import { readFirstSearchParam } from "@/lib/agentrank/coverage-action";
import {
  getFanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import {
  filterAgentRankReputationEventFeedByMockScope,
  normalizeAgentRankEventMockScope,
  summarizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import { buildAgentRankReviewQueueSnapshot } from "@/lib/agentrank/review-queue";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type AgentRankReviewSearchParams = {
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

  return Number.isFinite(parsed) ? Math.max(10, Math.min(parsed, 240)) : 120;
}

function normalizeMemberEmail(value?: string | string[]) {
  const normalized = readFirstParam(value)?.trim().toLowerCase();

  return normalized || null;
}

function getReviewMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "FanLetter Reputation Event를 AgentRank Oracle 후보와 보강 큐로 분류하는 운영 페이지입니다.",
      title: "AgentRank Review Queue | FanLetter",
    };
  }

  return {
    description:
      "An operator review queue for classifying FanLetter Reputation Events into Oracle candidates and enrichment work.",
    title: "AgentRank Review Queue | FanLetter",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getReviewMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/agentrank/review`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/agentrank/review`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterAgentRankReviewRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<AgentRankReviewSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const starId = normalizeFanletterStarId(readFirstParam(query.starId) ?? null);
  const memberEmail = normalizeMemberEmail(query.memberEmail);
  const scope = normalizeAgentRankEventMockScope(readFirstParam(query.scope));
  const limit = normalizeLimit(query.limit);
  const rawFeed = await getFanletterAgentRankReputationEventFeed({
    limit,
    memberEmail,
    starId,
  });
  const scopedFeed = filterAgentRankReputationEventFeedByMockScope(
    rawFeed,
    scope,
  );
  const reviewQueue = buildAgentRankReviewQueueSnapshot(scopedFeed.events);

  return (
    <FanletterAgentRankReviewPage
      eventScope={{
        raw: summarizeAgentRankEventMockScope(rawFeed.events),
        scope,
        scoped: summarizeAgentRankEventMockScope(scopedFeed.events),
      }}
      filters={{
        limit,
        memberEmail,
        scope,
        starId,
      }}
      locale={locale}
      reviewQueue={reviewQueue}
    />
  );
}
