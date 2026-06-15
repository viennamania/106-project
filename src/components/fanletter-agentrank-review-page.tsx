import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  Database,
  Download,
  GitBranch,
  Network,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import type { AgentRankEventMockScope } from "@/lib/agentrank/mock-events";
import type { AgentRankReputationEventType } from "@/lib/agentrank/reputation-events";
import type {
  AgentRankProductActionCoverageItem,
  AgentRankReviewQueueCategory,
  AgentRankReviewQueueItem,
  AgentRankReviewQueueSnapshot,
  AgentRankReviewReasonCode,
} from "@/lib/agentrank/review-queue";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankReviewPageProps = {
  eventScope: {
    raw: {
      mockEvents: number;
      productEvents: number;
      totalEvents: number;
    };
    scope: AgentRankEventMockScope;
    scoped: {
      mockEvents: number;
      productEvents: number;
      totalEvents: number;
    };
  };
  filters: {
    limit: number;
    memberEmail: string | null;
    scope: AgentRankEventMockScope;
    starId: string | null;
  };
  locale: Locale;
  reviewQueue: AgentRankReviewQueueSnapshot;
};

function getReviewCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      actionCoverage: "제품 행동 커버리지",
      actionCoverageBody:
        "FanLetter Phase 1 행동이 AgentRank Reputation Event로 누락 없이 연결되는지 확인합니다.",
      actionMissing: "수집 대기",
      actionReady: "수집됨",
      api: "Review API",
      back: "AgentRank로 돌아가기",
      csv: "CSV",
      eventLedger: "Event Ledger",
      generated: "생성 시각",
      heroBody:
        "Reputation Event를 AgentRank Oracle로 보내기 전, 보강 필요 이벤트와 Packet 후보를 운영 큐로 분류합니다.",
      heroEyebrow: "AgentRank Operations",
      heroTitle: "Review Queue",
      impact: "기여도",
      ndjson: "NDJSON",
      nextAction: "다음 액션",
      openEvent: "이벤트 추적",
      productEvents: "운영 이벤트",
      quality: "품질",
      rawEvents: "전체 이벤트",
      ready: "준비됨",
      reviewFlow: "Review Flow",
      reviewFlowSteps: [
        "Reputation Event 수집",
        "Audit / Graph / Impact 보강",
        "Evidence Packet 후보화",
        "AgentRank Oracle 전송",
      ],
      scopedEvents: "현재 범위",
      summaryActionCoverage: "행동 커버리지",
      summaryHighImpact: "고기여",
      summaryNeedsOracle: "오라클 보강",
      summaryPacketReady: "Packet 후보",
    };
  }

  return {
    actionCoverage: "Product Action Coverage",
    actionCoverageBody:
      "Checks whether FanLetter Phase 1 actions are entering AgentRank as Reputation Events.",
    actionMissing: "Pending",
    actionReady: "Covered",
    api: "Review API",
    back: "Back to AgentRank",
    csv: "CSV",
    eventLedger: "Event Ledger",
    generated: "Generated",
    heroBody:
      "Groups Reputation Events into Oracle enrichment work, packet candidates, and high-impact review before they become AgentRank Oracle inputs.",
    heroEyebrow: "AgentRank Operations",
    heroTitle: "Review Queue",
    impact: "Impact",
    ndjson: "NDJSON",
    nextAction: "Next action",
    openEvent: "Trace event",
    productEvents: "Product events",
    quality: "Quality",
    rawEvents: "Raw events",
    ready: "Ready",
    reviewFlow: "Review Flow",
    reviewFlowSteps: [
      "Collect Reputation Events",
      "Enrich Audit / Graph / Impact",
      "Package Evidence candidates",
      "Send to AgentRank Oracle",
    ],
    scopedEvents: "Current scope",
    summaryActionCoverage: "Action coverage",
    summaryHighImpact: "High impact",
    summaryNeedsOracle: "Oracle gaps",
    summaryPacketReady: "Packet candidates",
  };
}

function toFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number | null | undefined, locale: Locale) {
  return new Intl.NumberFormat(locale).format(toFiniteNumber(value));
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEventTypeLabel(type: AgentRankReputationEventType, locale: Locale) {
  const labels =
    locale === "ko"
      ? {
          ai_star_discovered: "AI 스타 발견",
          ai_star_spawned: "AI 스타 생성",
          content_engaged: "콘텐츠 참여",
          cp_earned: "CP 획득",
          cp_pool_generated: "CP Pool 생성",
          creator_unlock_evaluated: "권한 평가",
          creator_unlocked: "크리에이터 권한",
          founder_joined: "파운더 참여",
          referral_code_created: "추천 코드 생성",
          referral_converted: "추천 전환",
          source_universe_selected: "출처 유니버스 선택",
          universe_growth: "유니버스 성장",
          x402_mock_payment_intent: "x402 결제 의도",
        }
      : {
          ai_star_discovered: "AI Star Discovered",
          ai_star_spawned: "AI Star Spawned",
          content_engaged: "Content Engaged",
          cp_earned: "CP Earned",
          cp_pool_generated: "CP Pool Generated",
          creator_unlock_evaluated: "Creator Unlock Evaluated",
          creator_unlocked: "Creator Unlocked",
          founder_joined: "Founder Joined",
          referral_code_created: "Referral Code Created",
          referral_converted: "Referral Converted",
          source_universe_selected: "Source Universe Selected",
          universe_growth: "Universe Growth",
          x402_mock_payment_intent: "x402 Mock Payment Intent",
        };

  return labels[type];
}

function getQueuePresentation(
  category: AgentRankReviewQueueCategory,
  locale: Locale,
) {
  const labels =
    locale === "ko"
      ? {
          high_impact: {
            body: "점수 기여가 큰 이벤트를 투자자 설명과 Oracle 후보로 우선 검토합니다.",
            label: "고기여 검토",
          },
          needs_oracle: {
            body: "Oracle, 거래 그래프, 감사, 영향 신호가 부족한 이벤트입니다.",
            label: "오라클 보강",
          },
          packet_ready: {
            body: "Evidence Packet으로 묶어 AgentRank Oracle에 전달할 후보입니다.",
            label: "Packet 후보",
          },
          quality_review: {
            body: "품질 점수 또는 필수 필드 기준으로 운영 점검이 필요합니다.",
            label: "품질 점검",
          },
        }
      : {
          high_impact: {
            body: "Prioritize events with strong score impact for investor and Oracle review.",
            label: "High-impact Review",
          },
          needs_oracle: {
            body: "Events missing Oracle, transaction graph, audit, or impact signals.",
            label: "Oracle Gaps",
          },
          packet_ready: {
            body: "Candidates ready to package for the AgentRank Oracle.",
            label: "Packet Candidates",
          },
          quality_review: {
            body: "Events requiring quality or required-field checks.",
            label: "Quality Review",
          },
        };
  const presentation = {
    high_impact: {
      Icon: Sparkles,
      tone: "border-blue-100 bg-blue-50",
    },
    needs_oracle: {
      Icon: AlertTriangle,
      tone: "border-amber-100 bg-amber-50",
    },
    packet_ready: {
      Icon: ShieldCheck,
      tone: "border-emerald-100 bg-emerald-50",
    },
    quality_review: {
      Icon: SlidersHorizontal,
      tone: "border-fuchsia-100 bg-fuchsia-50",
    },
  } satisfies Record<
    AgentRankReviewQueueCategory,
    {
      Icon: typeof AlertTriangle;
      tone: string;
    }
  >;

  return {
    ...labels[category],
    ...presentation[category],
  };
}

function getReasonLabel(reason: AgentRankReviewReasonCode, locale: Locale) {
  const labels =
    locale === "ko"
      ? {
          audit_gap: "감사 보강",
          graph_gap: "그래프 보강",
          impact_gap: "영향 보강",
          low_quality: "품질 점검",
          oracle_gap: "오라클 보강",
          packet_candidate: "Packet 후보",
        }
      : {
          audit_gap: "Audit gap",
          graph_gap: "Graph gap",
          impact_gap: "Impact gap",
          low_quality: "Quality review",
          oracle_gap: "Oracle gap",
          packet_candidate: "Packet candidate",
        };

  return labels[reason];
}

function getActionCoverageLabel(
  action: AgentRankProductActionCoverageItem,
  locale: Locale,
) {
  if (locale !== "ko") {
    return action.label;
  }

  const labels = {
    creator: "크리에이터 권한/AI 스타 생성",
    discovery: "AI 스타 발견",
    founder: "파운더 참여",
    payment: "x402 Mock/CP Pool",
    referral: "추천 코드/전환",
    star_detail: "AI 스타 상세/콘텐츠",
  } satisfies Record<AgentRankProductActionCoverageItem["key"], string>;

  return labels[action.key];
}

function getReviewActionLabel(item: AgentRankReviewQueueItem, locale: Locale) {
  if (locale !== "ko") {
    return item.actionLabel;
  }

  if (item.auditGaps.length > 0) {
    return `필드 보강: ${item.auditGaps.slice(0, 2).join(", ")}`;
  }

  if (item.reasonCodes.includes("oracle_gap")) {
    return "상위 Oracle 신호 검증";
  }

  if (item.reasonCodes.includes("graph_gap")) {
    return "거래 그래프 엣지 연결";
  }

  if (item.reasonCodes.includes("impact_gap")) {
    return "점수 영향 신호 검증";
  }

  if (item.reasonCodes.includes("low_quality")) {
    return "낮은 품질 점수 점검";
  }

  return "Oracle Packet 후보 검토";
}

function buildEventDetailHref({
  eventId,
  locale,
  starId,
}: {
  eventId: string;
  locale: Locale;
  starId?: string | null;
}) {
  const params = new URLSearchParams();

  if (starId) {
    params.set("starId", starId);
  }

  const query = params.toString();

  return `/${locale}/fanletter/agentrank/events/${encodeURIComponent(eventId)}${
    query ? `?${query}` : ""
  }`;
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#11132d]">{value}</p>
    </div>
  );
}

export function FanletterAgentRankReviewPage({
  eventScope,
  filters,
  locale,
  reviewQueue,
}: FanletterAgentRankReviewPageProps) {
  const copy = getReviewCopy(locale);
  const params = new URLSearchParams({
    limit: String(filters.limit),
  });

  if (filters.starId) {
    params.set("starId", filters.starId);
  }

  if (filters.memberEmail) {
    params.set("memberEmail", filters.memberEmail);
  }

  if (filters.scope !== "all") {
    params.set("scope", filters.scope);
  }

  const apiParams = new URLSearchParams(params);
  const csvParams = new URLSearchParams(params);
  const ndjsonParams = new URLSearchParams(params);
  csvParams.set("format", "csv");
  ndjsonParams.set("format", "ndjson");
  const agentRankHref = `/${locale}/fanletter/agentrank${
    filters.starId ? `?starId=${encodeURIComponent(filters.starId)}` : ""
  }`;
  const ledgerHref = `/${locale}/fanletter/agentrank/events?${params.toString()}`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-[92rem] flex-col gap-5">
        <header className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#6d28d9]"
              href={agentRankHref}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-white px-4 text-sm font-semibold text-[#6d28d9]"
                href={ledgerHref}
              >
                <Database className="size-4" />
                {copy.eventLedger}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#11132d] px-4 text-sm font-semibold text-white"
                href={`/api/fanletter/agentrank/review-queue?${apiParams.toString()}`}
              >
                <Database className="size-4" />
                {copy.api}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800"
                href={`/api/fanletter/agentrank/review-queue?${csvParams.toString()}`}
              >
                <Download className="size-4" />
                {copy.csv}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 text-sm font-semibold text-cyan-800"
                href={`/api/fanletter/agentrank/review-queue?${ndjsonParams.toString()}`}
              >
                <GitBranch className="size-4" />
                {copy.ndjson}
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.92fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-600">
                {copy.heroBody}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase text-slate-400">
                {copy.generated}: {formatDate(reviewQueue.generatedAt, locale)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryTile
                label={copy.rawEvents}
                value={formatNumber(eventScope.raw.totalEvents, locale)}
              />
              <SummaryTile
                label={copy.productEvents}
                value={formatNumber(eventScope.raw.productEvents, locale)}
              />
              <SummaryTile
                label={copy.scopedEvents}
                value={formatNumber(eventScope.scoped.totalEvents, locale)}
              />
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryTile
            label={copy.summaryNeedsOracle}
            value={formatNumber(reviewQueue.summary.needsOracleEvents, locale)}
          />
          <SummaryTile
            label={copy.summaryPacketReady}
            value={formatNumber(reviewQueue.summary.packetReadyEvents, locale)}
          />
          <SummaryTile
            label={copy.summaryHighImpact}
            value={formatNumber(reviewQueue.summary.highImpactEvents, locale)}
          />
          <SummaryTile
            label={copy.quality}
            value={formatNumber(reviewQueue.summary.lowQualityEvents, locale)}
          />
          <SummaryTile
            label={copy.summaryActionCoverage}
            value={`${formatNumber(
              reviewQueue.summary.actionCoverageReady,
              locale,
            )}/${formatNumber(reviewQueue.summary.actionCoverageTotal, locale)}`}
          />
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <Network className="size-4" />
                {copy.reviewFlow}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {copy.reviewFlowSteps.map((step, index) => (
              <div
                className="relative rounded-lg border border-violet-100 bg-violet-50/50 p-4"
                key={step}
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#6d28d9] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-semibold leading-5">{step}</p>
                {index < copy.reviewFlowSteps.length - 1 ? (
                  <ArrowRight className="absolute right-3 top-4 hidden size-4 text-[#6d28d9] md:block" />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {reviewQueue.queues.map((bucket) => {
            const { Icon, body, label, tone } = getQueuePresentation(
              bucket.category,
              locale,
            );

            return (
              <article
                className={`rounded-lg border p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)] ${tone}`}
                key={bucket.category}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#11132d]">
                      <Icon className="size-4" />
                      {label}
                    </p>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-600">
                      {body}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">
                    {formatNumber(bucket.total, locale)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {bucket.events.length ? (
                    bucket.events.map((item) => (
                      <Link
                        className="rounded-lg bg-white/82 p-3 text-sm transition hover:bg-white hover:shadow-[0_12px_24px_rgba(88,28,135,0.08)]"
                        href={buildEventDetailHref({
                          eventId: item.event.eventId,
                          locale,
                          starId: item.event.starId ?? filters.starId,
                        })}
                        key={item.event.eventId}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {getEventTypeLabel(item.event.type, locale)}
                            </p>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                              {getReviewActionLabel(item, locale)}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-xs font-semibold text-[#6d28d9]">
                            {item.impactTotal.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.reasonCodes.slice(0, 3).map((reason) => (
                            <span
                              className="rounded-full bg-violet-50 px-2 py-1 text-[0.68rem] font-semibold text-[#6d28d9]"
                              key={reason}
                            >
                              {getReasonLabel(reason, locale)}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                          <span>
                            {copy.quality} {item.qualityScore}
                          </span>
                          <span>
                            {copy.openEvent} <ArrowRight className="inline size-3" />
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-lg bg-white/72 px-3 py-2 text-xs font-semibold text-slate-500">
                      {copy.ready}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <BadgeCheck className="size-4" />
                {copy.actionCoverage}
              </p>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                {copy.actionCoverageBody}
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
              {formatNumber(reviewQueue.summary.actionCoverageReady, locale)}/
              {formatNumber(reviewQueue.summary.actionCoverageTotal, locale)}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {reviewQueue.actionCoverage.map((action) => (
              <Link
                className={`rounded-lg border p-3 transition hover:shadow-[0_14px_30px_rgba(88,28,135,0.08)] ${
                  action.covered
                    ? "border-emerald-100 bg-emerald-50/80"
                    : "border-amber-100 bg-amber-50/80"
                }`}
                href={`/${locale}/fanletter/agentrank/events?${new URLSearchParams({
                  ...Object.fromEntries(params.entries()),
                  type: action.eventType,
                }).toString()}`}
                key={action.key}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-[#11132d]">
                    {getActionCoverageLabel(action, locale)}
                  </p>
                  {action.covered ? (
                    <BadgeCheck className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-semibold ${
                    action.covered ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {action.covered ? copy.actionReady : copy.actionMissing}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
