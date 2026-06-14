import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Database,
  Download,
  FileCheck2,
  Fingerprint,
  GitBranch,
  Network,
  ShieldCheck,
} from "lucide-react";

import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import type { AgentRankEventEvidencePacket } from "@/lib/agentrank/evidence-packet";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankEvidencePacketPageProps = {
  coverageAction?: AgentRankCoverageActionContext | null;
  event: AgentRankReputationEvent;
  locale: Locale;
  packet: AgentRankEventEvidencePacket;
};

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      audit: "감사",
      backToEvent: "이벤트 상세",
      backToLedger: "이벤트 원장",
      canonical: "Canonical JSON",
      downloadJson: "JSON 다운로드",
      evidence: "증거",
      evidenceRoot: "Evidence Root",
      event: "Reputation Event",
      eventHash: "Event Evidence Hash",
      heroBody:
        "단일 Reputation Event가 AgentRank Oracle로 전달될 때 필요한 원본, 스키마, 감사 해시, 연결 이벤트를 사람이 검토할 수 있게 정리한 증거 패킷입니다.",
      heroEyebrow: "AgentRank Oracle Packet",
      heroTitle: "Evidence Packet Viewer",
      issuedAt: "발급 시각",
      linkedEvidence: "Linked Evidence",
      linkedEvidenceBody:
        "같은 AI 스타, 멤버, 추천 코드, Universe로 연결된 주변 이벤트 해시입니다.",
      object: "대상",
      packetHash: "Packet Hash",
      packetVersion: "Packet Version",
      quality: "품질",
      ready: "검증 가능",
      recordType: "Record Type",
      schema: "Schema",
      source: "Source",
      sourceId: "Source ID",
      trace: "검증 흐름",
      verifierNote:
        "검증자는 Event Evidence Hash와 Linked Evidence를 canonical JSON으로 다시 해시해 Evidence Root를 재현할 수 있습니다.",
    };
  }

  return {
    audit: "Audit",
    backToEvent: "Event Detail",
    backToLedger: "Event Ledger",
    canonical: "Canonical JSON",
    downloadJson: "Download JSON",
    evidence: "Evidence",
    evidenceRoot: "Evidence Root",
    event: "Reputation Event",
    eventHash: "Event Evidence Hash",
    heroBody:
      "A human-readable evidence packet showing the source record, schema, audit hash, and linked events required to pass one Reputation Event into the AgentRank Oracle.",
    heroEyebrow: "AgentRank Oracle Packet",
    heroTitle: "Evidence Packet Viewer",
    issuedAt: "Issued At",
    linkedEvidence: "Linked Evidence",
    linkedEvidenceBody:
      "Nearby event hashes connected by the same AI Star, member, referral code, or Universe.",
    object: "Object",
    packetHash: "Packet Hash",
    packetVersion: "Packet Version",
    quality: "Quality",
    ready: "Verifiable",
    recordType: "Record Type",
    schema: "Schema",
    source: "Source",
    sourceId: "Source ID",
    trace: "Verification Flow",
    verifierNote:
      "A verifier can reproduce the Evidence Root by hashing the Event Evidence Hash and Linked Evidence from the canonical JSON payload.",
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

function truncateHash(value: string, start = 14, end = 10) {
  if (value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function TraceStep({
  Icon,
  body,
  label,
  tone = "violet",
}: {
  Icon: typeof ShieldCheck;
  body: string;
  label: string;
  tone?: "cyan" | "emerald" | "slate" | "violet";
}) {
  const toneClass = {
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    slate: "border-slate-100 bg-slate-50 text-slate-600",
    violet: "border-violet-100 bg-violet-50 text-[#6d28d9]",
  }[tone];

  return (
    <div className={`min-w-0 rounded-lg border p-4 ${toneClass}`}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-white/80 shadow-sm">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-[#11132d]">
        {body}
      </p>
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-[#11132d]">
        {value}
      </p>
    </div>
  );
}

export function FanletterAgentRankEvidencePacketPage({
  coverageAction = null,
  event,
  locale,
  packet,
}: FanletterAgentRankEvidencePacketPageProps) {
  const copy = getCopy(locale);
  const ledgerParams = new URLSearchParams();
  const eventParams = new URLSearchParams();
  const downloadParams = new URLSearchParams({
    download: "1",
  });
  const starId = event.starId ?? event.object?.id ?? null;
  const linkedEvents = packet.evidence.linkedEvents;

  if (starId) {
    ledgerParams.set("starId", starId);
    eventParams.set("starId", starId);
    downloadParams.set("starId", starId);
  }

  if (coverageAction) {
    ledgerParams.set("coverageAction", coverageAction.action);
    eventParams.set("coverageAction", coverageAction.action);

    if (coverageAction.memberEmail) {
      ledgerParams.set("memberEmail", coverageAction.memberEmail);
      eventParams.set("memberEmail", coverageAction.memberEmail);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-[86rem] flex-col gap-5">
        <header className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#6d28d9]"
                href={`/${locale}/fanletter/agentrank/events${
                  ledgerParams.size ? `?${ledgerParams.toString()}` : ""
                }`}
              >
                <ArrowLeft className="size-4" />
                {copy.backToLedger}
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
                href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
                  event.eventId,
                )}${eventParams.size ? `?${eventParams.toString()}` : ""}`}
              >
                <GitBranch className="size-4" />
                {copy.backToEvent}
              </Link>
            </div>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#11132d] px-4 text-sm font-semibold text-white"
              href={`/api/fanletter/agentrank/events/${encodeURIComponent(
                event.eventId,
              )}/evidence?${downloadParams.toString()}`}
            >
              <Download className="size-4" />
              {copy.downloadJson}
            </a>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div className="min-w-0">
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
            <div className="rounded-lg bg-gradient-to-br from-[#11132d] via-[#4338ca] to-[#7c3aed] p-5 text-white">
              <p className="text-xs font-semibold uppercase text-white/60">
                {copy.packetHash}
              </p>
              <p className="mt-3 break-all font-mono text-xs font-semibold leading-6 text-white/90">
                {packet.integrity.packetHash}
              </p>
            </div>
          </div>
        </header>

        {coverageAction ? (
          <FanletterAgentRankCoverageActionNotice
            action={coverageAction}
            locale={locale}
          />
        ) : null}

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <ShieldCheck className="size-4" />
                {copy.trace}
              </p>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                {copy.verifierNote}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <BadgeCheck className="size-3.5" />
              {copy.ready}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TraceStep
              Icon={Database}
              body={`${packet.event.source} / ${packet.event.sourceId}`}
              label={copy.source}
            />
            <TraceStep
              Icon={ShieldCheck}
              body={packet.event.schemaVersion}
              label={copy.schema}
              tone="cyan"
            />
            <TraceStep
              Icon={Fingerprint}
              body={truncateHash(packet.evidence.eventEvidenceHash)}
              label={copy.eventHash}
              tone="emerald"
            />
            <TraceStep
              Icon={Network}
              body={`${linkedEvents.length} / ${packet.evidence.linkedEventCount}`}
              label={copy.linkedEvidence}
              tone="slate"
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <FileCheck2 className="size-4" />
              {copy.event}
            </p>
            <h2 className="mt-3 break-all font-mono text-lg font-semibold text-[#11132d]">
              {event.eventId}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoTile label={copy.event} value={getEventTypeLabel(event.type, locale)} />
              <InfoTile label={copy.issuedAt} value={formatDate(packet.issuedAt, locale)} />
              <InfoTile label={copy.sourceId} value={event.sourceId} />
              <InfoTile label={copy.object} value={getActorLabel(event.object ?? null)} />
              <InfoTile label={copy.audit} value={event.audit.status} />
              <InfoTile
                label={copy.quality}
                value={`${formatNumber(event.audit.qualityScore, locale)}/100`}
              />
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <Fingerprint className="size-4" />
              {copy.evidence}
            </p>
            <div className="mt-5 grid gap-3">
              <InfoTile label={copy.recordType} value={packet.recordType} />
              <InfoTile label={copy.packetVersion} value={packet.packetVersion} />
              <InfoTile label={copy.evidenceRoot} value={packet.integrity.evidenceRoot} />
              <InfoTile label={copy.packetHash} value={packet.integrity.packetHash} />
            </div>
          </article>
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <Network className="size-4" />
                {copy.linkedEvidence}
              </p>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                {copy.linkedEvidenceBody}
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
              {linkedEvents.length} / {packet.evidence.linkedEventCount}
            </span>
          </div>
          <div className="mt-5 grid gap-2">
            {linkedEvents.map((linkedEvent) => {
              const params = new URLSearchParams();

              if (starId) {
                params.set("starId", starId);
              }

              return (
                <Link
                  className="grid min-w-0 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm transition hover:border-violet-200 hover:bg-white sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_8rem]"
                  href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
                    linkedEvent.eventId,
                  )}${params.size ? `?${params.toString()}` : ""}`}
                  key={linkedEvent.eventId}
                >
                  <span className="min-w-0 truncate font-semibold text-[#11132d]">
                    {getEventTypeLabel(linkedEvent.type, locale)}
                  </span>
                  <span className="min-w-0 break-all font-mono text-[0.68rem] font-semibold text-slate-500">
                    {truncateHash(linkedEvent.evidenceHash, 16, 8)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9]">
                    {formatNumber(linkedEvent.qualityScore, locale)}/100
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <Database className="size-4" />
            {copy.canonical}
          </p>
          <pre className="mt-4 max-h-[34rem] overflow-auto rounded-lg bg-[#11132d] p-4 text-xs leading-6 text-violet-50">
            {JSON.stringify(packet, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
