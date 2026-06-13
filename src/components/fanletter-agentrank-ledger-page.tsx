import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  Bot,
  Clock3,
  Coins,
  Database,
  Download,
  GitBranch,
  Network,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";

import {
  agentRankReputationEventTypes,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankLedgerPageProps = {
  feed: FanletterAgentRankReputationEventFeed;
  filters: {
    limit: number;
    memberEmail: string | null;
    starId: string | null;
    type: AgentRankReputationEventType | null;
  };
  locale: Locale;
};

const eventTone = {
  ai_star_discovered: "border-blue-100 bg-blue-50 text-blue-700",
  ai_star_spawned: "border-pink-100 bg-pink-50 text-pink-700",
  content_engaged: "border-slate-100 bg-slate-50 text-slate-700",
  cp_earned: "border-emerald-100 bg-emerald-50 text-emerald-700",
  creator_unlocked: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
  founder_joined: "border-violet-100 bg-violet-50 text-[#6d28d9]",
  referral_code_created: "border-cyan-100 bg-cyan-50 text-cyan-700",
  referral_converted: "border-indigo-100 bg-indigo-50 text-indigo-700",
  universe_growth: "border-amber-100 bg-amber-50 text-amber-700",
} satisfies Record<AgentRankReputationEventType, string>;

const eventIconMap = {
  ai_star_discovered: Bot,
  ai_star_spawned: Sparkles,
  content_engaged: Clock3,
  cp_earned: Coins,
  creator_unlocked: BadgeCheck,
  founder_joined: Users,
  referral_code_created: Network,
  referral_converted: GitBranch,
  universe_growth: Database,
} satisfies Record<AgentRankReputationEventType, typeof Bot>;

function getLedgerCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      actor: "액터",
      all: "전체",
      api: "API 원본",
      back: "AgentRank로 돌아가기",
      cp: "CP",
      csv: "CSV 내보내기",
      details: "이벤트 상세",
      empty:
        "조건에 맞는 Reputation Event가 없습니다. 다른 스타, 멤버, 이벤트 타입으로 확인하세요.",
      event: "이벤트",
      eventId: "이벤트 ID",
      applyFilters: "필터 적용",
      clearFilters: "필터 초기화",
      filterByType: "이벤트 타입 필터",
      filters: "Ledger 필터",
      generated: "생성 시각",
      heroBody:
        "FanLetter에서 발생한 발견, 파운더 참여, 추천, CP, 크리에이터 생성 이벤트가 AgentRank v1 스키마로 정규화되는지 확인합니다.",
      heroEyebrow: "AgentRank Ledger",
      heroTitle: "Reputation Event Ledger",
      impact: "평판 영향",
      member: "멤버",
      networkEdges: "네트워크 엣지",
      needs: "보강 필요",
      oracleNeeds: "Oracle 보강 항목",
      oracleReady: "오라클 준비",
      openEvent: "상세 추적",
      ready: "준비됨",
      schema: "스키마",
      schemaReady: "스키마 준비",
      source: "소스",
      sourceId: "소스 ID",
      star: "AI 스타",
      limit: "표시 개수",
      totalEvents: "이벤트",
      uniqueMembers: "멤버",
      uniqueStars: "AI 스타",
      viewAll: "전체 보기",
    };
  }

  return {
    actor: "Actor",
    all: "All",
    api: "Raw API",
    back: "Back to AgentRank",
    cp: "CP",
    csv: "Export CSV",
    details: "Event Details",
    empty:
      "No matching Reputation Events. Try another Star, member, or event type.",
    event: "Event",
    eventId: "Event ID",
    applyFilters: "Apply filters",
    clearFilters: "Reset filters",
    filterByType: "Filter by event type",
    filters: "Ledger filters",
    generated: "Generated",
    heroBody:
      "Inspect how FanLetter discovery, founder, referral, CP, and creator launch actions normalize into the AgentRank v1 schema.",
    heroEyebrow: "AgentRank Ledger",
    heroTitle: "Reputation Event Ledger",
    impact: "Reputation Impact",
    member: "Member",
    networkEdges: "Network Edges",
    needs: "Needs data",
    oracleNeeds: "Oracle gaps",
    oracleReady: "Oracle-ready",
    openEvent: "Trace Event",
    ready: "Ready",
    schema: "Schema",
    schemaReady: "Schema-ready",
    source: "Source",
    sourceId: "Source ID",
    star: "AI Star",
    limit: "Limit",
    totalEvents: "Events",
    uniqueMembers: "Members",
    uniqueStars: "AI Stars",
    viewAll: "View all",
  };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatPercent(value: number, total: number, locale: Locale) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(percent / 100);
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
          creator_unlocked: "크리에이터 권한",
          founder_joined: "파운더 참여",
          referral_code_created: "추천 코드 생성",
          referral_converted: "추천 전환",
          universe_growth: "유니버스 성장",
        }
      : {
          ai_star_discovered: "AI Star Discovered",
          ai_star_spawned: "AI Star Spawned",
          content_engaged: "Content Engaged",
          cp_earned: "CP Earned",
          creator_unlocked: "Creator Unlocked",
          founder_joined: "Founder Joined",
          referral_code_created: "Referral Code Created",
          referral_converted: "Referral Converted",
          universe_growth: "Universe Growth",
        };

  return labels[type];
}

function getActorLabel(actor: AgentRankReputationEvent["actor"]) {
  return actor.label ?? actor.id;
}

function getObjectLabel(event: AgentRankReputationEvent) {
  return event.object?.label ?? event.object?.id ?? event.starId ?? "-";
}

function isValidIsoDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function getOracleReadinessGaps(
  event: AgentRankReputationEvent,
  locale: Locale,
) {
  const labels =
    locale === "ko"
      ? {
          actor: "액터 ID",
          source: "소스 ID",
          star: "AI 스타 ID",
          time: "발생 시각",
          upstream: "상위 검증 신호",
        }
      : {
          actor: "Actor ID",
          source: "Source ID",
          star: "AI Star ID",
          time: "Timestamp",
          upstream: "Upstream verification signal",
        };
  const gaps: string[] = [];

  if (!event.sourceId) {
    gaps.push(labels.source);
  }

  if (!isValidIsoDate(event.occurredAt)) {
    gaps.push(labels.time);
  }

  if (!event.actor.id || event.actor.id.startsWith("unknown-")) {
    gaps.push(labels.actor);
  }

  if (!event.starId && event.object?.type !== "ai_star") {
    gaps.push(labels.star);
  }

  if (!event.reputationSignals.oracleReady && gaps.length === 0) {
    gaps.push(labels.upstream);
  }

  return gaps;
}

function ReadinessPill({
  gaps,
  label,
}: {
  gaps: string[];
  label: string;
}) {
  const isReady = gaps.length === 0;
  const Icon = isReady ? BadgeCheck : AlertTriangle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
        isReady
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-amber-100 bg-amber-50 text-amber-700"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function buildLedgerHref({
  filters,
  locale,
  type,
}: {
  filters: FanletterAgentRankLedgerPageProps["filters"];
  locale: Locale;
  type: AgentRankReputationEventType | null;
}) {
  const params = new URLSearchParams();

  if (filters.starId) {
    params.set("starId", filters.starId);
  }

  if (filters.memberEmail) {
    params.set("memberEmail", filters.memberEmail);
  }

  if (type) {
    params.set("type", type);
  }

  if (filters.limit !== 120) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();

  return `/${locale}/fanletter/agentrank/events${query ? `?${query}` : ""}`;
}

function MetricTile({
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

function EventCard({
  event,
  locale,
}: {
  event: AgentRankReputationEvent;
  locale: Locale;
}) {
  const copy = getLedgerCopy(locale);
  const Icon = eventIconMap[event.type];
  const detailParams = new URLSearchParams();
  const impactTotal =
    typeof event.context.reputationImpactTotal === "number"
      ? event.context.reputationImpactTotal
      : event.reputationSignals.creatorWeight +
        event.reputationSignals.discoveryWeight +
        event.reputationSignals.economicWeight +
        event.reputationSignals.networkWeight;
  const oracleGaps = getOracleReadinessGaps(event, locale);

  if (event.starId) {
    detailParams.set("starId", event.starId);
  }

  return (
    <article className="rounded-lg border border-slate-100 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${eventTone[event.type]}`}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[#11132d]">
              {getEventTypeLabel(event.type, locale)}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {event.context.intent ?? event.sourceId}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
          {event.context.source ?? event.source}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.actor}
          </p>
          <p className="mt-1 truncate font-semibold text-slate-700">
            {getActorLabel(event.actor)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.star}
          </p>
          <p className="mt-1 truncate font-semibold text-slate-700">
            {getObjectLabel(event)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.impact}
          </p>
          <p className="mt-1 font-semibold text-slate-700">
            {impactTotal.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.schema}
          </p>
          <p className="mt-1 truncate font-semibold text-emerald-700">
            {event.schemaVersion}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        <ReadinessPill
          gaps={oracleGaps}
          label={
            oracleGaps.length === 0
              ? `${copy.oracleReady} ${copy.ready}`
              : `${copy.oracleReady} ${copy.needs}`
          }
        />
        <span>{formatDate(event.occurredAt, locale)}</span>
        <span className="text-slate-300">/</span>
        <span>{event.context.universeId ?? event.starId ?? "-"}</span>
        <span className="text-slate-300">/</span>
        <span>{event.eventId.slice(0, 20)}</span>
        <Link
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-[#11132d] px-3 text-xs font-semibold text-white"
          href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
            event.eventId,
          )}${detailParams.size ? `?${detailParams.toString()}` : ""}`}
        >
          {copy.openEvent}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        <summary className="cursor-pointer text-[#5b21b6]">
          {copy.details}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <p className="uppercase text-slate-400">{copy.eventId}</p>
            <p className="mt-1 break-all font-mono text-[0.68rem] text-slate-700">
              {event.eventId}
            </p>
          </div>
          <div className="min-w-0">
            <p className="uppercase text-slate-400">{copy.sourceId}</p>
            <p className="mt-1 break-all font-mono text-[0.68rem] text-slate-700">
              {event.sourceId}
            </p>
          </div>
          <div>
            <p className="uppercase text-slate-400">{copy.source}</p>
            <p className="mt-1 text-slate-700">{event.source}</p>
          </div>
          <div>
            <p className="uppercase text-slate-400">{copy.oracleNeeds}</p>
            <p className="mt-1 text-slate-700">
              {oracleGaps.length ? oracleGaps.join(", ") : copy.ready}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {[
            ["Network", event.reputationSignals.networkWeight],
            ["Economic", event.reputationSignals.economicWeight],
            ["Creator", event.reputationSignals.creatorWeight],
            ["Discovery", event.reputationSignals.discoveryWeight],
          ].map(([label, value]) => (
            <div className="rounded-md bg-white px-2.5 py-2" key={label}>
              <p className="text-slate-400">{label}</p>
              <p className="mt-1 text-sm text-[#11132d]">
                {Number(value).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}

export function FanletterAgentRankLedgerPage({
  feed,
  filters,
  locale,
}: FanletterAgentRankLedgerPageProps) {
  const copy = getLedgerCopy(locale);
  const apiParams = new URLSearchParams();

  if (filters.starId) {
    apiParams.set("starId", filters.starId);
  }

  if (filters.memberEmail) {
    apiParams.set("memberEmail", filters.memberEmail);
  }

  if (filters.type) {
    apiParams.set("types", filters.type);
  }

  apiParams.set("limit", String(filters.limit));
  const csvParams = new URLSearchParams(apiParams);
  csvParams.set("format", "csv");

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[92rem] gap-5">
        <header className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#6d28d9]"
              href={`/${locale}/fanletter/agentrank${
                filters.starId
                  ? `?starId=${encodeURIComponent(filters.starId)}`
                  : ""
              }`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#11132d] px-4 text-sm font-semibold text-white"
                href={`/api/fanletter/agentrank/events?${apiParams.toString()}`}
              >
                <Database className="size-4" />
                {copy.api}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800"
                href={`/api/fanletter/agentrank/events?${csvParams.toString()}`}
              >
                <Download className="size-4" />
                {copy.csv}
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#11132d] sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-600">
                {copy.heroBody}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricTile
                label={copy.totalEvents}
                value={formatNumber(feed.summary.totalEvents, locale)}
              />
              <MetricTile
                label={copy.uniqueMembers}
                value={formatNumber(feed.summary.uniqueMembers, locale)}
              />
              <MetricTile
                label={copy.uniqueStars}
                value={formatNumber(feed.summary.uniqueStars, locale)}
              />
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <SlidersHorizontal className="size-4" />
            {copy.filters}
          </div>
          <form
            action={`/${locale}/fanletter/agentrank/events`}
            className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_9rem_auto_auto]"
          >
            {filters.type ? (
              <input name="type" type="hidden" value={filters.type} />
            ) : null}
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.star}
              </span>
              <input
                className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-violet-300 focus:bg-white"
                defaultValue={filters.starId ?? ""}
                name="starId"
                placeholder="legacy-star-t7v7bayl"
              />
            </label>
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.member}
              </span>
              <input
                className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-violet-300 focus:bg-white"
                defaultValue={filters.memberEmail ?? ""}
                name="memberEmail"
                placeholder="member@example.com"
                type="email"
              />
            </label>
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.limit}
              </span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-violet-300 focus:bg-white"
                defaultValue={filters.limit}
                max={200}
                min={10}
                name="limit"
                type="number"
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-[#6d28d9] px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(109,40,217,0.18)]"
              type="submit"
            >
              <Search className="size-4" />
              {copy.applyFilters}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center self-end rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
              href={`/${locale}/fanletter/agentrank/events`}
            >
              {copy.clearFilters}
            </Link>
          </form>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={copy.schemaReady}
            value={formatPercent(
              feed.summary.schemaReadyEvents,
              feed.summary.totalEvents,
              locale,
            )}
          />
          <MetricTile
            label={copy.oracleReady}
            value={formatPercent(
              feed.summary.oracleReadyEvents,
              feed.summary.totalEvents,
              locale,
            )}
          />
          <MetricTile
            label={copy.networkEdges}
            value={formatNumber(feed.summary.networkEdges, locale)}
          />
          <MetricTile
            label={copy.cp}
            value={formatNumber(feed.summary.cpTotal, locale)}
          />
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.filterByType}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {copy.generated}: {formatDate(feed.generatedAt, locale)}
              </p>
            </div>
            <Link
              className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold ${
                filters.type
                  ? "border border-slate-200 bg-white text-slate-600"
                  : "bg-[#6d28d9] text-white"
              }`}
              href={buildLedgerHref({ filters, locale, type: null })}
            >
              {copy.viewAll}
            </Link>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {agentRankReputationEventTypes.map((type) => {
              const isActive = filters.type === type;
              const count = feed.summary.byType[type] ?? 0;

              return (
                <Link
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold ${
                    isActive
                      ? "bg-[#6d28d9] text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                  href={buildLedgerHref({ filters, locale, type })}
                  key={type}
                >
                  {getEventTypeLabel(type, locale)}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/18 text-white"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4">
          {feed.events.length > 0 ? (
            feed.events.map((event) => (
              <EventCard event={event} key={event.eventId} locale={locale} />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
              <ShieldCheck className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                {copy.empty}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
