import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Coins,
  Database,
  Download,
  Eye,
  FileJson,
  GitBranch,
  Heart,
  Network,
  Orbit,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import type {
  AgentRankCoverageSnapshot,
  AgentRankCoverageEventItem,
  AgentRankCoverageSourceItem,
} from "@/lib/agentrank/coverage";
import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import type {
  AgentRankReputationEvent,
  FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

type CoverageAuditScope = {
  limit: number;
  memberEmail?: string | null;
  starId?: string | null;
};

type CoverageCopy = ReturnType<typeof getCoverageAuditCopy>;

const eventIconMap = {
  ai_star_discovered: Eye,
  ai_star_spawned: Rocket,
  content_engaged: Heart,
  cp_earned: Coins,
  cp_pool_generated: Database,
  creator_unlock_evaluated: BadgeCheck,
  creator_unlocked: Sparkles,
  founder_joined: Users,
  referral_code_created: Network,
  referral_converted: GitBranch,
  source_universe_selected: ShieldCheck,
  universe_growth: Orbit,
  x402_mock_payment_intent: WalletCards,
} satisfies Record<AgentRankCoverageEventItem["type"], typeof Eye>;

const layerClass = {
  creator: "border-pink-100 bg-pink-50/80 text-pink-700",
  discovery: "border-blue-100 bg-blue-50/80 text-blue-700",
  economy: "border-emerald-100 bg-emerald-50/80 text-emerald-700",
  network: "border-violet-100 bg-violet-50/80 text-[#6d28d9]",
} satisfies Record<AgentRankCoverageEventItem["layer"], string>;

function getCoverageAuditCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      agentRank: "AgentRank",
      api: "JSON API",
      backToAgentRank: "AgentRank 보기",
      covered: "수집됨",
      csv: "CSV 내보내기",
      eventCoverage: "이벤트 타입 커버리지",
      eventLedger: "이벤트 원장",
      gaps: "우선 보강 신호",
      generated: "생성 시간",
      interactionCoverage: "CTA 소스 커버리지",
      latestEvents: "최근 감사 이벤트",
      missing: "대기",
      noCriticalGaps: "현재 핵심 갭이 없습니다.",
      oracleCoverage: "오라클 준비율",
      phase1Quality: "Phase 1 데이터 품질",
      priorityActionPlan: "우선 수집 액션",
      schemaCoverage: "스키마 준비율",
      scope: "감사 범위",
      subtitle:
        "FanLetter에서 발생한 발견, 파운더 참여, 초대, CP, 창업 이벤트가 AgentRank 평판 데이터로 충분히 쌓이고 있는지 점검합니다.",
      targetLayer: "대상 레이어",
      title: "Coverage Audit",
      totalEvents: "전체 이벤트",
      triggerEvent: "생성 이벤트",
      viewAction: "진행",
    };
  }

  return {
    agentRank: "AgentRank",
    api: "JSON API",
    backToAgentRank: "View AgentRank",
    covered: "Covered",
    csv: "Export CSV",
    eventCoverage: "Event Type Coverage",
    eventLedger: "Event Ledger",
    gaps: "Priority Gaps",
    generated: "Generated",
    interactionCoverage: "CTA Source Coverage",
    latestEvents: "Latest Audit Events",
    missing: "Pending",
    noCriticalGaps: "No critical gaps at the moment.",
    oracleCoverage: "Oracle-ready Coverage",
    phase1Quality: "Phase 1 Data Quality",
    priorityActionPlan: "Priority Collection Actions",
    schemaCoverage: "Schema Coverage",
    scope: "Audit Scope",
    subtitle:
      "Audits whether FanLetter discovery, founder, invite, CP, and creator events are becoming sufficient AgentRank reputation data.",
    targetLayer: "Target Layer",
    title: "Coverage Audit",
    totalEvents: "Total Events",
    triggerEvent: "Trigger Event",
    viewAction: "Open",
  };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEventTypeLabel(type: AgentRankReputationEvent["type"], locale: Locale) {
  if (locale !== "ko") {
    return type.replaceAll("_", " ");
  }

  const labels: Record<AgentRankReputationEvent["type"], string> = {
    ai_star_discovered: "AI 스타 발견",
    ai_star_spawned: "AI 스타 창업",
    content_engaged: "콘텐츠 반응",
    cp_earned: "CP 보상",
    cp_pool_generated: "CP Pool 생성",
    creator_unlock_evaluated: "권한 평가",
    creator_unlocked: "크리에이터 권한",
    founder_joined: "파운더 참여",
    referral_code_created: "추천 코드 생성",
    referral_converted: "추천 전환",
    source_universe_selected: "출처 유니버스 선택",
    universe_growth: "유니버스 성장",
    x402_mock_payment_intent: "x402 결제 의도",
  };

  return labels[type];
}

function getInteractionSourceLabel(
  source: AgentRankInteractionSource,
  locale: Locale,
) {
  const labels: Record<AgentRankInteractionSource, string> =
    locale === "ko"
      ? {
          fanletter_agentrank: "AgentRank 페이지",
          fanletter_bridge: "연결/온보딩",
          fanletter_content: "콘텐츠/브이로그",
          fanletter_creator_unlock: "크리에이터 권한",
          fanletter_founder_universe: "파운더 네트워크",
          fanletter_home: "FanLetter 홈",
          fanletter_news: "뉴스/리포트",
          fanletter_star_detail: "AI 스타 상세",
        }
      : {
          fanletter_agentrank: "AgentRank Page",
          fanletter_bridge: "Connect / Onboarding",
          fanletter_content: "Content / Vlog",
          fanletter_creator_unlock: "Creator Unlock",
          fanletter_founder_universe: "Founder Network",
          fanletter_home: "FanLetter Home",
          fanletter_news: "News / Reports",
          fanletter_star_detail: "AI Star Detail",
        };

  return labels[source];
}

function getCoverageGapLabel(gap: string, locale: Locale) {
  const [kind, value] = gap.split(":");

  if (kind === "missing_event") {
    return locale === "ko"
      ? `이벤트 미수집: ${getEventTypeLabel(
          value as AgentRankReputationEvent["type"],
          locale,
        )}`
      : `Missing event: ${value.replaceAll("_", " ")}`;
  }

  if (kind === "missing_source") {
    return locale === "ko"
      ? `CTA 소스 미수집: ${getInteractionSourceLabel(
          value as AgentRankInteractionSource,
          locale,
        )}`
      : `Missing CTA source: ${getInteractionSourceLabel(
          value as AgentRankInteractionSource,
          locale,
        )}`;
  }

  if (gap === "pending:x402_economy") {
    return locale === "ko"
      ? "x402 결제 이벤트 연결 예정"
      : "x402 payment events pending";
  }

  if (gap === "pending:a2a_usage") {
    return locale === "ko"
      ? "A2A 호출 이벤트 연결 예정"
      : "A2A call events pending";
  }

  return gap;
}

function getLayerLabel(layer: AgentRankCoverageEventItem["layer"], locale: Locale) {
  if (locale !== "ko") {
    return layer;
  }

  const labels: Record<AgentRankCoverageEventItem["layer"], string> = {
    creator: "크리에이터",
    discovery: "발견",
    economy: "경제",
    network: "네트워크",
  };

  return labels[layer];
}

function buildQuery(scope: CoverageAuditScope, extra?: Record<string, string>) {
  const params = new URLSearchParams({
    limit: String(scope.limit),
    ...extra,
  });

  if (scope.starId) {
    params.set("starId", scope.starId);
  }

  if (scope.memberEmail) {
    params.set("memberEmail", scope.memberEmail);
  }

  return params.toString();
}

function getScopedStarId(scope: CoverageAuditScope) {
  return scope.starId || "minseo";
}

function getGapAction(gap: string, locale: Locale, scope: CoverageAuditScope) {
  const [kind, value] = gap.split(":");
  const scopedStarId = encodeURIComponent(getScopedStarId(scope));
  const scopedQuery = buildQuery(scope, { coverageAction: value || kind });

  if (kind === "missing_event") {
    const eventType = value as AgentRankReputationEvent["type"];

    const eventActions: Partial<
      Record<
        AgentRankReputationEvent["type"],
        {
          description: string;
          href: string;
          layer: string;
          trigger: string;
        }
      >
    > =
      locale === "ko"
        ? {
            ai_star_spawned: {
              description:
                "크리에이터가 출처 스타 유니버스를 선택하고 새 AI 스타를 생성하는 흐름을 실행합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "AI 스타 창업",
            },
            creator_unlock_evaluated: {
              description:
                "크리에이터 권한 조건 평가를 기록해 창업 가능성 신호를 만듭니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "권한 평가",
            },
            creator_unlocked: {
              description:
                "조건을 충족한 멤버의 크리에이터 권한 전환 이벤트를 수집합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "크리에이터 권한",
            },
            source_universe_selected: {
              description:
                "새 AI 스타가 어느 스타 유니버스 성과에서 탄생했는지 출처를 고정합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Founder Network",
              trigger: "출처 유니버스 선택",
            },
            x402_mock_payment_intent: {
              description:
                "실결제 전 단계의 10 USDT 창업 의도 이벤트를 mock으로 수집합니다.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "x402 Economy",
              trigger: "x402 결제 의도",
            },
          }
        : {
            ai_star_spawned: {
              description:
                "Run the flow where a creator selects a source Star Universe and launches a new AI Star.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "AI Star Spawned",
            },
            creator_unlock_evaluated: {
              description:
                "Record creator eligibility checks as early creator journey signals.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "Creator Unlock Evaluated",
            },
            creator_unlocked: {
              description:
                "Collect the conversion event when an eligible member unlocks creator status.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Creator Journey",
              trigger: "Creator Unlocked",
            },
            source_universe_selected: {
              description:
                "Lock which Star Universe produced the new AI Star launch outcome.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "Founder Network",
              trigger: "Source Universe Selected",
            },
            x402_mock_payment_intent: {
              description:
                "Collect a mock 10 USDT launch intent before real payment integration.",
              href: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
              layer: "x402 Economy",
              trigger: "x402 Payment Intent",
            },
          };
    const action = eventActions[eventType] ?? {
      description:
        locale === "ko"
          ? "해당 이벤트가 발생하는 제품 흐름을 열고 사용자 행동 신호를 수집합니다."
          : "Open the product flow that can generate this missing event signal.",
      href: `/${locale}/fanletter/${scopedStarId}?${scopedQuery}`,
      layer: locale === "ko" ? "평판 이벤트" : "Reputation Event",
      trigger: getEventTypeLabel(eventType, locale),
    };

    return {
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      ...action,
    };
  }

  if (kind === "missing_source") {
    const source = value as AgentRankInteractionSource;
    const sourceRoutes: Partial<Record<AgentRankInteractionSource, string>> = {
      fanletter_agentrank: `/${locale}/fanletter/agentrank?${scopedQuery}`,
      fanletter_bridge: `/${locale}/fanletter/connect?${scopedQuery}`,
      fanletter_content: `/${locale}/fanletter/${scopedStarId}?${scopedQuery}`,
      fanletter_creator_unlock: `/${locale}/fanletter/creator-unlock?${scopedQuery}`,
      fanletter_founder_universe: `/${locale}/fanletter/${scopedStarId}/universe?${scopedQuery}`,
      fanletter_home: `/${locale}/fanletter?${scopedQuery}`,
      fanletter_news: `/${locale}/fanletter/news?${scopedQuery}`,
      fanletter_star_detail: `/${locale}/fanletter/${scopedStarId}?${scopedQuery}`,
    };

    return {
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      description:
        locale === "ko"
          ? "해당 CTA 출처에서 AgentRank 추적 이벤트가 실제로 쌓이는지 확인합니다."
          : "Verify that this CTA source is producing AgentRank tracking events.",
      href: sourceRoutes[source] ?? `/${locale}/fanletter/agentrank?${scopedQuery}`,
      layer: locale === "ko" ? "CTA 소스" : "CTA Source",
      trigger: getInteractionSourceLabel(source, locale),
    };
  }

  if (gap === "pending:x402_economy") {
    return {
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      description:
        locale === "ko"
          ? "실결제 전까지 창업 결제 의도와 CP Pool 생성을 mock 이벤트로 연결합니다."
          : "Connect mock launch payment intent and CP Pool generation before real payments.",
      href: `/${locale}/fanletter/creator-unlock?${buildQuery(scope, {
        coverageAction: "x402_economy",
      })}`,
      layer: "x402 Economy",
      trigger: locale === "ko" ? "mock 결제 의도" : "Mock Payment Intent",
    };
  }

  if (gap === "pending:a2a_usage") {
    return {
      key: gap,
      label: getCoverageGapLabel(gap, locale),
      description:
        locale === "ko"
          ? "현재는 Phase 1 데이터로 보류하고, 추후 Agent 호출 이벤트 스키마와 연결합니다."
          : "Keep this as a Phase 1 placeholder until agent-call event schema is connected.",
      href: `/${locale}/fanletter/agentrank/events?${buildQuery(scope, {
        coverageAction: "a2a_usage",
      })}`,
      layer: "A2A Usage",
      trigger: locale === "ko" ? "Agent 호출 이벤트" : "Agent Call Event",
    };
  }

  return {
    key: gap,
    label: getCoverageGapLabel(gap, locale),
    description:
      locale === "ko"
        ? "이 갭을 채울 수 있는 제품 흐름과 이벤트 스키마를 확인합니다."
        : "Review the product flow and event schema needed to fill this gap.",
    href: `/${locale}/fanletter/agentrank?${scopedQuery}`,
    layer: "AgentRank",
    trigger: gap,
  };
}

function CoverageMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.1rem] border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="text-2xl font-semibold text-[#6d28d9]">{value}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#16a34a]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function EventTypeCoverageCard({
  item,
  locale,
}: {
  item: AgentRankCoverageEventItem;
  locale: Locale;
}) {
  const Icon = eventIconMap[item.type];

  return (
    <div
      className={`min-w-0 rounded-[1rem] border p-4 ${
        item.covered ? layerClass[item.layer] : "border-slate-100 bg-slate-50 text-slate-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#11132d]">
              {getEventTypeLabel(item.type, locale)}
            </p>
            <p className="mt-1 text-xs font-semibold opacity-75">
              {getLayerLabel(item.layer, locale)}
            </p>
          </div>
        </div>
        {item.covered ? (
          <BadgeCheck className="size-5 shrink-0 text-emerald-600" />
        ) : (
          <ShieldAlert className="size-5 shrink-0 text-slate-300" />
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold text-[#11132d]">
        {formatNumber(item.count, locale)}
      </p>
    </div>
  );
}

function SourceCoverageCard({
  copy,
  locale,
  source,
}: {
  copy: CoverageCopy;
  locale: Locale;
  source: AgentRankCoverageSourceItem;
}) {
  return (
    <div
      className={`rounded-[1rem] border p-4 ${
        source.covered
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold text-[#11132d]">
          {getInteractionSourceLabel(source.source, locale)}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
            source.covered ? "bg-white text-emerald-700" : "bg-white text-slate-400"
          }`}
        >
          {formatNumber(source.count, locale)}
        </span>
      </div>
      <p
        className={`mt-3 text-xs font-semibold ${
          source.covered ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        {source.covered ? copy.covered : copy.missing}
      </p>
    </div>
  );
}

export function FanletterAgentRankCoverageAuditPage({
  coverage,
  eventFeed,
  generatedAt,
  locale,
  scope,
}: {
  coverage: AgentRankCoverageSnapshot;
  eventFeed: FanletterAgentRankReputationEventFeed;
  generatedAt: string;
  locale: Locale;
  scope: CoverageAuditScope;
}) {
  const copy = getCoverageAuditCopy(locale);
  const apiQuery = buildQuery(scope);
  const csvQuery = buildQuery(scope, { format: "csv" });
  const pageQuery = buildQuery(scope);
  const latestEvents = eventFeed.events.slice(0, 6);
  const gapActions = coverage.gaps.map((gap) =>
    getGapAction(gap, locale, scope),
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)] lg:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-[#6d28d9]">
                <ShieldCheck className="size-4" />
                {copy.agentRank} · {copy.phase1Quality}
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-[#11132d] md:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-3 max-w-4xl text-base font-medium leading-7 text-slate-600 md:text-lg">
                {copy.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-white px-4 text-sm font-semibold text-[#6d28d9]"
                href={`/${locale}/fanletter/agentrank?${pageQuery}`}
              >
                <Bot className="size-4" />
                {copy.backToAgentRank}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#5b21b6]"
                href={`/${locale}/fanletter/agentrank/events?${pageQuery}`}
              >
                <Database className="size-4" />
                {copy.eventLedger}
              </Link>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                href={`/api/fanletter/agentrank/coverage?${apiQuery}`}
              >
                <FileJson className="size-4" />
                {copy.api}
              </a>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                href={`/api/fanletter/agentrank/coverage?${csvQuery}`}
              >
                <Download className="size-4" />
                {copy.csv}
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.25rem] bg-gradient-to-br from-[#11132d] via-[#312e81] to-[#7c3aed] p-5 text-white">
              <p className="text-sm font-semibold uppercase text-white/65">
                {copy.phase1Quality}
              </p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-6xl font-semibold">
                  {coverage.phase1QualityScore}
                </p>
                <p className="pb-2 text-lg font-semibold text-white/60">/ 100</p>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
                  style={{ width: `${coverage.phase1QualityScore}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 rounded-[1.25rem] border border-violet-100 bg-violet-50/60 p-5">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {copy.scope}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#11132d]">
                  starId: {scope.starId || "all"} · member:{" "}
                  {scope.memberEmail || "all"} · limit {scope.limit}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {copy.generated}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#11132d]">
                  {formatDateTime(generatedAt, locale)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {copy.totalEvents}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#6d28d9]">
                  {formatNumber(coverage.totals.totalEvents, locale)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CoverageMetric
            label={copy.eventCoverage}
            value={coverage.eventTypeCoveragePercent}
          />
          <CoverageMetric
            label={copy.interactionCoverage}
            value={coverage.interactionSourceCoveragePercent}
          />
          <CoverageMetric
            label={copy.oracleCoverage}
            value={coverage.oracleCoveragePercent}
          />
          <CoverageMetric
            label={copy.schemaCoverage}
            value={coverage.schemaCoveragePercent}
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_24rem]">
          <div className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                  {copy.eventCoverage}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {coverage.totals.coveredEventTypes}/
                  {coverage.totals.eventTypes}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coverage.eventTypes.map((item) => (
                <EventTypeCoverageCard
                  item={item}
                  key={item.type}
                  locale={locale}
                />
              ))}
            </div>
          </div>

          <aside className="grid content-start gap-5">
            <div className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.priorityActionPlan}
              </p>
              {gapActions.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {gapActions.map((action) => (
                    <Link
                      className="group block rounded-xl border border-violet-100 bg-violet-50/70 p-3 transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-[0_14px_34px_rgba(88,28,135,0.08)]"
                      href={action.href}
                      key={action.key}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#4c1d95]">
                            {action.label}
                          </p>
                          <p className="mt-2 text-xs font-medium leading-5 text-slate-600">
                            {action.description}
                          </p>
                        </div>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-[#7c3aed] transition group-hover:translate-x-0.5" />
                      </div>
                      <div className="mt-3 grid gap-2 text-xs font-semibold sm:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-lg bg-white px-3 py-2 text-slate-500">
                          <span className="text-slate-400">
                            {copy.targetLayer}
                          </span>
                          <span className="mt-1 block truncate text-[#11132d]">
                            {action.layer}
                          </span>
                        </div>
                        <div className="rounded-lg bg-white px-3 py-2 text-slate-500">
                          <span className="text-slate-400">
                            {copy.triggerEvent}
                          </span>
                          <span className="mt-1 block truncate text-[#11132d]">
                            {action.trigger}
                          </span>
                        </div>
                      </div>
                      <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100">
                        {copy.viewAction}
                        <ArrowRight className="size-3.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
                  {copy.noCriticalGaps}
                </div>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.latestEvents}
              </p>
              <div className="mt-4 grid gap-3">
                {latestEvents.map((event) => (
                  <Link
                    className="block rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-violet-100 hover:bg-violet-50"
                    href={`/${locale}/fanletter/agentrank/events/${event.eventId}/evidence?${pageQuery}`}
                    key={event.eventId}
                  >
                    <p className="truncate text-sm font-semibold text-[#11132d]">
                      {getEventTypeLabel(event.type, locale)}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                      {event.eventId}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(88,28,135,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.interactionCoverage}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {coverage.totals.coveredInteractionSources}/
                {coverage.totals.interactionSources}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {coverage.sources.map((source) => (
              <SourceCoverageCard
                copy={copy}
                key={source.source}
                locale={locale}
                source={source}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
