import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Database,
  GitBranch,
  Network,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankEventDetailPageProps = {
  event: AgentRankReputationEvent;
  locale: Locale;
};

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      actor: "액터",
      agentGraph: "Agent Transaction Graph",
      back: "이벤트 원장",
      context: "Context",
      eventId: "이벤트 ID",
      formula: "ERS 반영 공식",
      heroBody:
        "FanLetter에서 발생한 단일 Reputation Event가 AgentRank 점수, Oracle 준비 상태, 향후 x402 경제 그래프로 어떻게 연결되는지 추적합니다.",
      heroEyebrow: "AgentRank Evidence",
      object: "대상",
      oracle: "Oracle 준비",
      pending: "대기",
      rawJson: "Raw Event JSON",
      ready: "준비됨",
      readiness: "AgentRank 호환성",
      schema: "스키마",
      source: "소스",
      sourceId: "소스 ID",
      title: "Reputation Event 상세 추적",
      viewAgentRank: "AgentRank 보기",
      x402: "x402 경제",
    };
  }

  return {
    actor: "Actor",
    agentGraph: "Agent Transaction Graph",
    back: "Event Ledger",
    context: "Context",
    eventId: "Event ID",
    formula: "ERS Impact Formula",
    heroBody:
      "Trace how one FanLetter Reputation Event contributes to AgentRank scoring, Oracle readiness, and the future x402 economy graph.",
    heroEyebrow: "AgentRank Evidence",
    object: "Object",
    oracle: "Oracle-ready",
    pending: "Pending",
    rawJson: "Raw Event JSON",
    ready: "Ready",
    readiness: "AgentRank Compatibility",
    schema: "Schema",
    source: "Source",
    sourceId: "Source ID",
    title: "Reputation Event Trace",
    viewAgentRank: "View AgentRank",
    x402: "x402 Economy",
  };
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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
}

function getActorLabel(actor: AgentRankReputationEvent["actor"] | null) {
  if (!actor) {
    return "-";
  }

  return actor.label ?? actor.id;
}

function getEventTypeLabel(type: AgentRankReputationEvent["type"], locale: Locale) {
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

function getImpactTotal(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.networkWeight +
    event.reputationSignals.economicWeight +
    event.reputationSignals.creatorWeight +
    event.reputationSignals.discoveryWeight
  );
}

function getReadinessItems(event: AgentRankReputationEvent, locale: Locale) {
  const copy = getCopy(locale);

  return [
    {
      body:
        locale === "ko"
          ? "AgentRank v1 이벤트 스키마로 정규화됨"
          : "Normalized into AgentRank v1 event schema",
      isReady: true,
      label: copy.schema,
    },
    {
      body:
        locale === "ko"
          ? "sourceId와 발생 시각으로 검증 가능"
          : "Verifiable through sourceId and timestamp",
      isReady: event.reputationSignals.oracleReady,
      label: copy.oracle,
    },
    {
      body:
        locale === "ko"
          ? "CP 기반 보상은 기록됨, 결제 레이어는 추후 연결"
          : "CP reward is recorded; payment layer comes later",
      isReady: event.economicLayer.x402Ready,
      label: copy.x402,
    },
    {
      body:
        locale === "ko"
          ? "Actor, Object, Star ID로 그래프 엣지 생성 가능"
          : "Actor, object, and Star ID can form graph edges",
      isReady: Boolean(event.actor.id && (event.object?.id || event.starId)),
      label: copy.agentGraph,
    },
  ];
}

function SignalTile({
  label,
  locale,
  value,
}: {
  label: string;
  locale: Locale;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#11132d]">
        {formatNumber(value, locale)}
      </p>
    </div>
  );
}

function ReadinessCard({
  body,
  isReady,
  label,
  pendingLabel,
  readyLabel,
}: {
  body: string;
  isReady: boolean;
  label: string;
  pendingLabel: string;
  readyLabel: string;
}) {
  const Icon = isReady ? BadgeCheck : TriangleAlert;

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[#11132d]">{label}</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isReady
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <Icon className="size-3.5" />
          {isReady ? readyLabel : pendingLabel}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export function FanletterAgentRankEventDetailPage({
  event,
  locale,
}: FanletterAgentRankEventDetailPageProps) {
  const copy = getCopy(locale);
  const starId = event.starId ?? event.object?.id ?? null;
  const ledgerParams = new URLSearchParams();
  const impactTotal = getImpactTotal(event);
  const signalRows = [
    ["Network", event.reputationSignals.networkWeight],
    ["Economic", event.reputationSignals.economicWeight],
    ["Creator", event.reputationSignals.creatorWeight],
    ["Discovery", event.reputationSignals.discoveryWeight],
  ] as const;
  const contextEntries = Object.entries(event.context).filter(
    ([, value]) => value !== null && value !== "",
  );

  if (starId) {
    ledgerParams.set("starId", starId);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[86rem] gap-5">
        <header className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#6d28d9]"
              href={`/${locale}/fanletter/agentrank/events${
                ledgerParams.size ? `?${ledgerParams.toString()}` : ""
              }`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#11132d] px-4 text-sm font-semibold text-white"
              href={`/${locale}/fanletter/agentrank${
                starId ? `?starId=${encodeURIComponent(starId)}` : ""
              }`}
            >
              <ShieldCheck className="size-4" />
              {copy.viewAgentRank}
            </Link>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#11132d] sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-600">
                {copy.heroBody}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-[#11132d] via-[#4338ca] to-[#7c3aed] p-5 text-white">
              <p className="text-xs font-semibold uppercase text-white/60">
                {copy.formula}
              </p>
              <p className="mt-2 text-4xl font-semibold">
                {formatNumber(impactTotal, locale)}
              </p>
              <p className="mt-2 text-sm font-semibold text-white/70">
                Network + Economic + Creator + Discovery
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
                  <Bot className="size-4" />
                  {getEventTypeLabel(event.type, locale)}
                </p>
                <h2 className="mt-2 break-all font-mono text-lg font-semibold text-[#11132d]">
                  {event.eventId}
                </h2>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
                {event.phase}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [copy.eventId, event.eventId],
                [copy.sourceId, event.sourceId],
                [copy.source, event.source],
                ["Occurred", formatDate(event.occurredAt, locale)],
                [copy.actor, `${getActorLabel(event.actor)} (${event.actor.type})`],
                [
                  copy.object,
                  `${getActorLabel(event.object ?? null)}${
                    event.object?.type ? ` (${event.object.type})` : ""
                  }`,
                ],
              ].map(([label, value]) => (
                <div
                  className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-3"
                  key={label}
                >
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
              <GitBranch className="size-4" />
              {copy.agentGraph}
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase text-violet-500">
                  {copy.actor}
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-[#11132d]">
                  {getActorLabel(event.actor)}
                </p>
              </div>
              <div className="flex justify-center">
                <Network className="size-7 text-[#6d28d9]" />
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase text-emerald-600">
                  {copy.object}
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-[#11132d]">
                  {getActorLabel(event.object ?? null)}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="text-sm font-semibold uppercase text-[#6d28d9]">
              {copy.formula}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {signalRows.map(([label, value]) => (
                <SignalTile
                  key={label}
                  label={label}
                  locale={locale}
                  value={value}
                />
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="text-sm font-semibold uppercase text-[#6d28d9]">
              {copy.readiness}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {getReadinessItems(event, locale).map((item) => (
                <ReadinessCard
                  body={item.body}
                  isReady={item.isReady}
                  key={item.label}
                  label={item.label}
                  pendingLabel={copy.pending}
                  readyLabel={copy.ready}
                />
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <WalletCards className="size-4" />
              {copy.context}
            </p>
            <div className="mt-4 grid gap-2">
              {contextEntries.length ? (
                contextEntries.map(([key, value]) => (
                  <div
                    className="grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[12rem_1fr]"
                    key={key}
                  >
                    <p className="font-semibold text-slate-400">{key}</p>
                    <p className="break-words font-semibold text-slate-700">
                      {String(value)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">-</p>
              )}
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <Database className="size-4" />
              {copy.rawJson}
            </p>
            <pre className="mt-4 max-h-[34rem] overflow-auto rounded-lg bg-[#11132d] p-4 text-xs leading-6 text-violet-50">
              {JSON.stringify(event, null, 2)}
            </pre>
          </article>
        </section>
      </div>
    </main>
  );
}
