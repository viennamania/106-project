import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterAgentRankEventDetailPage } from "@/components/fanletter-agentrank-event-detail-page";
import {
  normalizeAgentRankCoverageAction,
  readFirstSearchParam,
} from "@/lib/agentrank/coverage-action";
import {
  filterAgentRankReputationEventFeedByMockScope,
  normalizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import {
  getFanletterAgentRankReputationEventFeed,
  type AgentRankReputationEvent,
} from "@/lib/agentrank/reputation-events";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type AgentRankEventDetailSearchParams = {
  coverageAction?: string | string[];
  memberEmail?: string | string[];
  scope?: string | string[];
  starId?: string | string[];
  view?: string | string[];
};

function readFirstParam(value?: string | string[]) {
  return readFirstSearchParam(value);
}

function normalizeEventId(value: string) {
  const normalized = value.trim();

  return /^[a-zA-Z0-9_-]{8,180}$/.test(normalized) ? normalized : null;
}

function normalizeMemberEmail(value?: string | string[]) {
  const normalized = readFirstParam(value)?.trim().toLowerCase();

  return normalized || null;
}

function normalizeDetailView(value?: string | string[]) {
  return readFirstParam(value) === "ops" ? "ops" : "user";
}

function getTraceKeys(event: AgentRankReputationEvent) {
  return new Set(
    [
      event.starId,
      event.actor.id,
      event.object?.id,
      event.subject?.id,
      event.context.sourceStarId,
      event.context.spawnedStarId,
      event.context.targetStarId,
      event.context.universeId,
      event.context.referralCode,
      event.context.relatedStarIds,
    ]
      .filter((value): value is string => typeof value === "string")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isRelatedTraceEvent(
  candidate: AgentRankReputationEvent,
  target: AgentRankReputationEvent,
) {
  if (candidate.eventId === target.eventId) {
    return false;
  }

  const targetKeys = getTraceKeys(target);

  for (const candidateKey of getTraceKeys(candidate)) {
    if (targetKeys.has(candidateKey)) {
      return true;
    }
  }

  return false;
}

function getEventDetailMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "FanLetter Reputation Event가 AgentRank 점수와 Oracle 준비 상태로 연결되는 과정을 추적합니다.",
      title: "AgentRank Event Trace | FanLetter",
    };
  }

  return {
    description:
      "Trace how a FanLetter Reputation Event contributes to AgentRank scoring and Oracle readiness.",
    title: "AgentRank Event Trace | FanLetter",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string; lang: string }>;
}): Promise<Metadata> {
  const { eventId, lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getEventDetailMeta(locale);

  return {
    title: `${meta.title} | ${eventId.slice(0, 18)}`,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/agentrank/events/${eventId}`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/agentrank/events/${eventId}`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterAgentRankEventDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; lang: string }>;
  searchParams: Promise<AgentRankEventDetailSearchParams>;
}) {
  const [{ eventId: rawEventId, lang }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const eventId = normalizeEventId(rawEventId);

  if (!eventId) {
    notFound();
  }

  const locale = lang as Locale;
  const starId = normalizeFanletterStarId(readFirstParam(query.starId) ?? null);
  const memberEmail = normalizeMemberEmail(query.memberEmail);
  const coverageAction = normalizeAgentRankCoverageAction(query.coverageAction);
  const view = normalizeDetailView(query.view);
  const eventScope = normalizeAgentRankEventMockScope(
    readFirstParam(query.scope),
  );
  const feed = await getFanletterAgentRankReputationEventFeed({
    limit: 250,
    memberEmail,
    starId,
  });
  const event = feed.events.find((candidate) => candidate.eventId === eventId);

  if (!event) {
    notFound();
  }

  const scopedFeed = filterAgentRankReputationEventFeedByMockScope(
    feed,
    eventScope,
  );
  const relatedEvents = scopedFeed.events
    .filter((candidate) => isRelatedTraceEvent(candidate, event))
    .slice(0, 24);

  return (
    <FanletterAgentRankEventDetailPage
      coverageAction={
        coverageAction
          ? {
              action: coverageAction,
              memberEmail,
              starId: event.starId ?? starId,
            }
          : null
      }
      event={event}
      eventScope={eventScope}
      locale={locale}
      relatedEvents={relatedEvents}
      view={view}
    />
  );
}
