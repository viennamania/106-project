import Link from "next/link";
import {
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
      oracleCoverage: "오라클 준비율",
      phase1Quality: "Phase 1 데이터 품질",
      schemaCoverage: "스키마 준비율",
      scope: "감사 범위",
      subtitle:
        "FanLetter에서 발생한 발견, 파운더 참여, 초대, CP, 창업 이벤트가 AgentRank 평판 데이터로 충분히 쌓이고 있는지 점검합니다.",
      title: "Coverage Audit",
      totalEvents: "전체 이벤트",
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
    oracleCoverage: "Oracle-ready Coverage",
    phase1Quality: "Phase 1 Data Quality",
    schemaCoverage: "Schema Coverage",
    scope: "Audit Scope",
    subtitle:
      "Audits whether FanLetter discovery, founder, invite, CP, and creator events are becoming sufficient AgentRank reputation data.",
    title: "Coverage Audit",
    totalEvents: "Total Events",
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
                {copy.gaps}
              </p>
              <div className="mt-4 grid gap-2">
                {coverage.gaps.map((gap) => (
                  <div
                    className="rounded-xl border border-dashed border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-[#4c1d95]"
                    key={gap}
                  >
                    {getCoverageGapLabel(gap, locale)}
                  </div>
                ))}
              </div>
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
