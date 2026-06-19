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

import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterAgentRankReviewActions } from "@/components/fanletter-agentrank-review-actions";
import { getAgentRankEventTypeLabel } from "@/lib/agentrank/event-labels";
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
        "운영 이벤트 기준으로 FanLetter Phase 1 행동이 AgentRank Reputation Event로 누락 없이 연결되는지 확인합니다.",
      accessBadge: "Ops / Investor Console",
      accessBody:
        "이 화면은 일반 사용자 홈이 아니라 운영자와 투자자가 Reputation Event 검증 상태를 확인하는 도구입니다. 액션은 현재 mock receipt로만 기록됩니다.",
      actionMissing: "수집 대기",
      actionReady: "수집됨",
      api: "Review API",
      back: "AgentRank로 돌아가기",
      candidateEvents: "후보 이벤트",
      coverageScore: "커버리지 포함 점수",
      csv: "CSV",
      eventLedger: "Reputation Records",
      generated: "생성 시각",
      heroBody:
        "Reputation Event를 AgentRank Oracle로 보내기 전, 보강 필요 이벤트와 Packet 후보를 운영 큐로 분류합니다.",
      heroEyebrow: "AgentRank Operations",
      heroTitle: "Review Queue",
      impact: "기여도",
      mockBoundary: "Mock / Product 경계",
      mockCoverage: "Mock 커버리지",
      ndjson: "NDJSON",
      nextAction: "다음 액션",
      openEvent: "이벤트 추적",
      packetDraft: "Oracle Packet Draft",
      packetHash: "Packet Hash",
      productEvents: "운영 이벤트",
      productOnlyCoverage: "운영 이벤트 커버리지",
      productOnlyScore: "운영 점수",
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
      scoreHistory: "Score 변경 이력",
      scopedEvents: "현재 범위",
      summaryActionCoverage: "행동 커버리지",
      summaryHighImpact: "고기여",
      summaryNeedsOracle: "오라클 보강",
      summaryPacketReady: "Packet 후보",
      totalScore: "현재 점수",
    };
  }

  return {
    actionCoverage: "Product Action Coverage",
    actionCoverageBody:
      "Checks whether product events are entering AgentRank as Reputation Events.",
    accessBadge: "Ops / Investor Console",
    accessBody:
      "This is an operator and investor tool, not the public user home. Actions currently create mock receipts only.",
    actionMissing: "Pending",
    actionReady: "Covered",
    api: "Review API",
    back: "Back to AgentRank",
    candidateEvents: "Candidate events",
    coverageScore: "Coverage score",
    csv: "CSV",
    eventLedger: "Reputation Records",
    generated: "Generated",
    heroBody:
      "Groups Reputation Events into Oracle enrichment work, packet candidates, and high-impact review before they become AgentRank Oracle inputs.",
    heroEyebrow: "AgentRank Operations",
    heroTitle: "Review Queue",
    impact: "Impact",
    mockBoundary: "Mock / Product Boundary",
    mockCoverage: "Mock coverage",
    ndjson: "NDJSON",
    nextAction: "Next action",
    openEvent: "Trace event",
    packetDraft: "Oracle Packet Draft",
    packetHash: "Packet Hash",
    productEvents: "Product events",
    productOnlyCoverage: "Product event coverage",
    productOnlyScore: "Product score",
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
    scoreHistory: "Score Change History",
    scopedEvents: "Current scope",
    summaryActionCoverage: "Action coverage",
    summaryHighImpact: "High impact",
    summaryNeedsOracle: "Oracle gaps",
    summaryPacketReady: "Packet candidates",
    totalScore: "Current score",
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
  return getAgentRankEventTypeLabel(type, locale);
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

function getStatusLabel(
  status: AgentRankReviewQueueItem["status"],
  locale: Locale,
) {
  const labels =
    locale === "ko"
      ? {
          approved: "승인됨",
          needs_enrichment: "보강 필요",
          packet_ready: "Packet 준비",
          pending: "대기",
          rejected: "제외됨",
        }
      : {
          approved: "Approved",
          needs_enrichment: "Needs enrichment",
          packet_ready: "Packet ready",
          pending: "Pending",
          rejected: "Rejected",
        };

  return labels[status];
}

function getStatusTone(status: AgentRankReviewQueueItem["status"]) {
  if (status === "packet_ready") {
    return "bg-cyan-50 text-cyan-700";
  }

  if (status === "needs_enrichment") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-50 text-slate-600";
}

function getProvenanceLabel(
  provenance: AgentRankReviewQueueItem["provenance"],
  locale: Locale,
) {
  if (locale === "ko") {
    return provenance === "mock_coverage" ? "Mock" : "운영";
  }

  return provenance === "mock_coverage" ? "Mock" : "Product";
}

function getActionCoverageLabel(
  action: AgentRankProductActionCoverageItem,
  locale: Locale,
) {
  if (locale !== "ko") {
    return action.label;
  }

  const labels = {
    creator: "권한 활성화/AI 스타 생성",
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50/80 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#11132d]">{value}</p>
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
  const scopeLabel = filters.starId
    ? filters.starId
    : locale === "ko"
      ? "전체 AI 스타"
      : "All AI Stars";
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
  const primaryReviewBucket =
    reviewQueue.queues.find((bucket) => bucket.events.length > 0) ??
    reviewQueue.queues[0] ??
    null;
  const primaryReviewItem = primaryReviewBucket?.events[0] ?? null;
  const primaryReviewPresentation = primaryReviewBucket
    ? getQueuePresentation(primaryReviewBucket.category, locale)
    : null;
  const primaryReviewHref = primaryReviewItem
    ? buildEventDetailHref({
        eventId: primaryReviewItem.event.eventId,
        locale,
        starId: primaryReviewItem.event.starId ?? filters.starId,
      })
    : ledgerHref;
  const primaryReviewLabel = primaryReviewItem
    ? locale === "ko"
      ? "이 이벤트 검토"
      : "Review this event"
    : copy.eventLedger;

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-[92rem] flex-col gap-5">
        <FanletterActionGuide
          currentLabel={
            locale === "ko"
              ? `리뷰 큐 · ${scopeLabel}`
              : `Review queue · ${scopeLabel}`
          }
          metrics={[
            {
              label: copy.summaryNeedsOracle,
              value: formatNumber(reviewQueue.summary.needsOracleEvents, locale),
            },
            {
              label: copy.summaryPacketReady,
              value: formatNumber(reviewQueue.summary.packetReadyEvents, locale),
            },
          ]}
          primaryAction={{
            agentRank: {
              eventType: "creator_unlock_evaluated",
              intent: "agentrank_review_action_guide_queue",
              source: "fanletter_agentrank",
              starId: filters.starId,
            },
            eventName: "content_open",
            href: primaryReviewHref,
            label: primaryReviewLabel,
            metadata: {
              placement: "agentrank_review_action_guide_primary",
              reviewCategory: primaryReviewBucket?.category ?? null,
              scope: filters.scope,
            },
          }}
          reputationEventLabel={
            locale === "ko" ? "Review Receipt mock" : "Review receipt mock"
          }
          secondaryActions={[
            {
              agentRank: {
                eventType: "universe_growth",
                intent: "agentrank_review_action_guide_ledger",
                source: "fanletter_agentrank",
                starId: filters.starId,
              },
              eventName: "content_open",
              href: ledgerHref,
              label: copy.eventLedger,
              metadata: {
                placement: "agentrank_review_action_guide_ledger",
                scope: filters.scope,
              },
            },
          ]}
          steps={[
            { label: copy.reviewFlowSteps[0], status: "done" },
            { label: copy.reviewFlowSteps[1], status: "active" },
            {
              label: copy.reviewFlowSteps[2],
              status:
                reviewQueue.summary.packetReadyEvents > 0 ? "active" : "next",
            },
            { label: copy.reviewFlowSteps[3], status: "next" },
          ]}
          subtitle={
            locale === "ko"
              ? "오라클 보강, Packet 후보, 고기여 이벤트를 먼저 분류합니다. 액션은 현재 mock receipt로만 남습니다."
              : "Prioritize oracle enrichment, packet candidates, and high-impact events. Actions only create mock receipts."
          }
          title={
            locale === "ko"
              ? "다음 행동: 보강할 이벤트 검토"
              : "Next action: review events to enrich"
          }
        />
        <section className="rounded-[1.25rem] border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)] sm:hidden">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
            <SlidersHorizontal className="size-3.5 shrink-0" />
            <span className="truncate">
              {locale === "ko" ? "현재 위치: Event Review Queue" : "Now: Event Review Queue"}
            </span>
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-[#11132d] [word-break:keep-all]">
            {primaryReviewPresentation
              ? locale === "ko"
                ? `우선 검토: ${primaryReviewPresentation.label}`
                : `Review first: ${primaryReviewPresentation.label}`
              : locale === "ko"
                ? "검토 대기 이벤트 없음"
                : "No review events pending"}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="truncate text-[0.62rem] font-semibold uppercase text-amber-700/70">
                {copy.summaryNeedsOracle}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-amber-800">
                {formatNumber(reviewQueue.summary.needsOracleEvents, locale)}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <p className="truncate text-[0.62rem] font-semibold uppercase text-emerald-700/70">
                {copy.summaryPacketReady}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-emerald-800">
                {formatNumber(reviewQueue.summary.packetReadyEvents, locale)}
              </p>
            </div>
            <div className="rounded-lg bg-violet-50 px-3 py-2">
              <p className="truncate text-[0.62rem] font-semibold uppercase text-[#6d28d9]/70">
                {copy.impact}
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-[#5b21b6]">
                {primaryReviewItem?.impactTotal.toFixed(1) ?? "0"}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[0.62rem] font-semibold normal-case tracking-[0.08em] text-emerald-700/75">
              AgentRank 결과
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-tight text-emerald-950 [word-break:keep-all]">
              {copy.summaryPacketReady}{" "}
              {formatNumber(reviewQueue.summary.packetReadyEvents, locale)} ·{" "}
              {copy.summaryNeedsOracle}{" "}
              {formatNumber(reviewQueue.summary.needsOracleEvents, locale)}
            </p>
          </div>
          <Link
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#6d28d9] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(109,40,217,0.2)]"
            href={primaryReviewHref}
          >
            {primaryReviewItem
              ? locale === "ko"
                ? "이 이벤트 검토"
                : "Review this event"
              : copy.eventLedger}
            <ArrowRight className="size-4 shrink-0" />
          </Link>
        </section>
        <section className="hidden grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,0.9fr)] gap-3 sm:grid">
          <article className="min-w-0 rounded-[1rem] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
            <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold normal-case tracking-[0.08em] text-zinc-500">
              <SlidersHorizontal className="size-3.5 shrink-0" />
              {locale === "ko" ? "현재 위치" : "Current location"}
            </p>
            <p className="mt-2 truncate text-lg font-semibold text-zinc-950">
              Review Queue
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
              {scopeLabel}
            </p>
          </article>
          <article className="min-w-0 rounded-[1rem] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
            <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold normal-case tracking-[0.08em] text-zinc-500">
              <AlertTriangle className="size-3.5 shrink-0" />
              {copy.nextAction}
            </p>
            <p className="mt-2 truncate text-lg font-semibold text-zinc-950">
              {primaryReviewPresentation
                ? primaryReviewPresentation.label
                : locale === "ko"
                  ? "대기 이벤트 없음"
                  : "No pending events"}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
              {primaryReviewItem
                ? getReviewActionLabel(primaryReviewItem, locale)
                : locale === "ko"
                  ? "이벤트 원장에서 새 신호를 확인하세요."
                  : "Check the ledger for new signals."}
            </p>
          </article>
          <article className="min-w-0 rounded-[1rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-[0_14px_36px_rgba(15,23,42,0.045)]">
            <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold normal-case tracking-[0.08em] text-emerald-700/75">
              <BadgeCheck className="size-3.5 shrink-0" />
              AgentRank 결과
            </p>
            <p className="mt-2 truncate text-lg font-semibold">
              {copy.summaryPacketReady}{" "}
              {formatNumber(reviewQueue.summary.packetReadyEvents, locale)}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-emerald-800/70">
              {copy.summaryNeedsOracle}{" "}
              {formatNumber(reviewQueue.summary.needsOracleEvents, locale)}
            </p>
          </article>
        </section>
        <header className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#6d28d9]"
              href={agentRankHref}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-white px-4 text-sm font-semibold text-[#6d28d9]"
                href={ledgerHref}
              >
                <Database className="size-4" />
                {copy.eventLedger}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#11132d] px-4 text-sm font-semibold !text-white"
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
              <p className="mt-4 hidden max-w-3xl text-base font-medium leading-7 text-slate-600 sm:block">
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

        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <ShieldCheck className="size-4" />
              {copy.accessBadge}
            </p>
            <p className="mt-3 hidden text-sm font-medium leading-6 text-slate-600 sm:block">
              {copy.accessBody}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MiniStat
                label={copy.summaryNeedsOracle}
                value={formatNumber(
                  reviewQueue.operational.statusCounts.needs_enrichment,
                  locale,
                )}
              />
              <MiniStat
                label={copy.summaryPacketReady}
                value={formatNumber(
                  reviewQueue.operational.statusCounts.packet_ready,
                  locale,
                )}
              />
              <MiniStat
                label={copy.reviewFlow}
                value={
                  reviewQueue.operational.mockActionPersistence ? "Mock" : "Live"
                }
              />
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <Database className="size-4" />
              {copy.mockBoundary}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat
                label={copy.productEvents}
                value={formatNumber(reviewQueue.summary.productEvents, locale)}
              />
              <MiniStat
                label={copy.mockCoverage}
                value={formatNumber(reviewQueue.summary.mockEvents, locale)}
              />
              <MiniStat
                label={copy.productOnlyCoverage}
                value={`${formatNumber(
                  reviewQueue.coverageBreakdown.product.ready,
                  locale,
                )}/${formatNumber(
                  reviewQueue.coverageBreakdown.product.total,
                  locale,
                )}`}
              />
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border border-emerald-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-emerald-700">
                  <ShieldCheck className="size-4" />
                  {copy.packetDraft}
                </p>
                <p className="mt-2 font-mono text-xs font-semibold text-slate-400">
                  {reviewQueue.packetDraft.packetId}
                </p>
              </div>
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-800"
                href={`/api/fanletter/agentrank/review-queue?${new URLSearchParams({
                  ...Object.fromEntries(params.entries()),
                  format: "packet",
                }).toString()}`}
              >
                JSON
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat
                label={copy.candidateEvents}
                value={formatNumber(
                  reviewQueue.packetDraft.candidateEventIds.length,
                  locale,
                )}
              />
              <MiniStat
                label={copy.impact}
                value={reviewQueue.packetDraft.scoreImpact.total.toFixed(1)}
              />
              <MiniStat
                label={copy.quality}
                value={formatNumber(reviewQueue.packetDraft.qualityAverage, locale)}
              />
            </div>
            <p className="mt-4 truncate font-mono text-xs font-semibold text-slate-500">
              {copy.packetHash}: {reviewQueue.packetDraft.packetHash}
            </p>
          </article>

          <article className="rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-blue-700">
                  <Sparkles className="size-4" />
                  {copy.scoreHistory}
                </p>
              </div>
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-800"
                href={`/api/fanletter/agentrank/review-queue?${new URLSearchParams({
                  ...Object.fromEntries(params.entries()),
                  format: "score-history",
                }).toString()}`}
              >
                JSON
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat
                label={copy.totalScore}
                value={formatNumber(reviewQueue.scoreHistory.currentScore, locale)}
              />
              <MiniStat
                label={copy.productOnlyScore}
                value={formatNumber(
                  reviewQueue.scoreHistory.productOnlyScore,
                  locale,
                )}
              />
              <MiniStat
                label={copy.coverageScore}
                value={formatNumber(reviewQueue.scoreHistory.coverageScore, locale)}
              />
            </div>
            <div className="mt-4 grid gap-2">
              {reviewQueue.scoreHistory.topChanges.slice(0, 3).map((change) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-lg bg-blue-50/70 px-3 py-2 text-sm font-semibold text-[#11132d]"
                  href={buildEventDetailHref({
                    eventId: change.eventId,
                    locale,
                    starId: filters.starId,
                  })}
                  key={change.eventId}
                >
                  <span className="min-w-0 truncate">
                    {getEventTypeLabel(change.eventType, locale)}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-blue-700">
                    -{formatNumber(change.deltaIfExcluded, locale)}
                  </span>
                </Link>
              ))}
            </div>
          </article>
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

        <section className="grid gap-4 xl:grid-cols-4" id="review-queue-buckets">
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
                      <div
                        className="rounded-lg bg-white/82 p-3 text-sm transition hover:bg-white hover:shadow-[0_12px_24px_rgba(88,28,135,0.08)]"
                        key={item.event.eventId}
                      >
                        <Link
                          href={buildEventDetailHref({
                            eventId: item.event.eventId,
                            locale,
                            starId: item.event.starId ?? filters.starId,
                          })}
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
                        </Link>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-2 py-1 text-[0.68rem] font-semibold ${getStatusTone(
                              item.status,
                            )}`}
                          >
                            {getStatusLabel(item.status, locale)}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold text-slate-500">
                            {getProvenanceLabel(item.provenance, locale)}
                          </span>
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
                          <Link
                            href={buildEventDetailHref({
                              eventId: item.event.eventId,
                              locale,
                              starId: item.event.starId ?? filters.starId,
                            })}
                          >
                            {copy.openEvent} <ArrowRight className="inline size-3" />
                          </Link>
                        </div>
                        <FanletterAgentRankReviewActions
                          eventId={item.event.eventId}
                          initialStatus={item.status}
                          locale={locale}
                          memberEmail={filters.memberEmail}
                          scope={filters.scope}
                          starId={item.event.starId ?? filters.starId}
                        />
                      </div>
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
              {formatNumber(reviewQueue.coverageBreakdown.product.ready, locale)}/
              {formatNumber(reviewQueue.coverageBreakdown.product.total, locale)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              {copy.productOnlyCoverage}:{" "}
              {formatNumber(reviewQueue.coverageBreakdown.product.ready, locale)}/
              {formatNumber(reviewQueue.coverageBreakdown.product.total, locale)}
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-[#6d28d9]">
              {copy.coverageScore}:{" "}
              {formatNumber(reviewQueue.coverageBreakdown.all.ready, locale)}/
              {formatNumber(reviewQueue.coverageBreakdown.all.total, locale)}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">
              {copy.mockCoverage}:{" "}
              {formatNumber(reviewQueue.coverageBreakdown.mock.ready, locale)}/
              {formatNumber(reviewQueue.coverageBreakdown.mock.total, locale)}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {reviewQueue.coverageBreakdown.product.actions.map((action) => (
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
