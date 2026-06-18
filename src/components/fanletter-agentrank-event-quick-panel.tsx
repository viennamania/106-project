"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Database,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { Locale } from "@/lib/i18n";
import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";

function formatEventDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getImpactTotal(event: AgentRankReputationEvent) {
  return typeof event.context.reputationImpactTotal === "number"
    ? event.context.reputationImpactTotal
    : event.reputationSignals.creatorWeight +
        event.reputationSignals.discoveryWeight +
        event.reputationSignals.economicWeight +
        event.reputationSignals.networkWeight;
}

function readContextString(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getEventTypeLabel(event: AgentRankReputationEvent, locale: Locale) {
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
          creator_social_connected: "TikTok 채널 연결",
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
          creator_social_connected: "Creator Social Connected",
          founder_joined: "Founder Joined",
          referral_code_created: "Referral Code Created",
          referral_converted: "Referral Converted",
          source_universe_selected: "Source Universe Selected",
          universe_growth: "Universe Growth",
          x402_mock_payment_intent: "x402 Mock Payment Intent",
        };

  return labels[event.type];
}

function getNextActionLabel(event: AgentRankReputationEvent, locale: Locale) {
  const isKorean = locale === "ko";

  if (!event.audit.graphReady) {
    return isKorean ? "거래 그래프 연결 확인" : "Review transaction graph links";
  }

  if (!event.audit.impactReady) {
    return isKorean ? "점수 영향 신호 확인" : "Review score impact signal";
  }

  if (!event.reputationSignals.oracleReady) {
    return isKorean ? "Oracle 증거 패킷 보강" : "Enrich Oracle evidence packet";
  }

  if (event.audit.status !== "audit_ready") {
    return isKorean ? "감사 품질 점검" : "Review audit quality";
  }

  return isKorean ? "상세 추적으로 검증" : "Trace and verify event";
}

export function FanletterAgentRankEventQuickPanel({
  buttonLabel,
  detailHref,
  detailLabel,
  event,
  evidenceHref,
  evidenceLabel,
  locale,
}: {
  buttonLabel: string;
  detailHref: string;
  detailLabel: string;
  event: AgentRankReputationEvent;
  evidenceHref: string;
  evidenceLabel: string;
  locale: Locale;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isKorean = locale === "ko";
  const impactTotal = getImpactTotal(event);
  const eventTypeLabel = getEventTypeLabel(event, locale);
  const nextActionLabel = getNextActionLabel(event, locale);
  const intentLabel = readContextString(event, "intent") ?? event.sourceId;
  const labels = isKorean
    ? {
        actor: "액터",
        agentRankResult: "AgentRank 결과",
        audit: "감사 상태",
        close: "이벤트 빠른 상세 닫기",
        connectedCreator: "연결한 Creator",
        eventId: "이벤트 ID",
        events: "평판 신호",
        handle: "TikTok handle",
        impact: "평판 영향",
        now: "현재 위치",
        nextAction: "다음 행동",
        object: "대상",
        occurredAt: "생성 시각",
        platform: "플랫폼",
        quick: "빠른 상세",
        socialChannel: "채널 연결",
        source: "소스",
        targetAiStar: "대상 AI 스타",
      }
    : {
        actor: "Actor",
        agentRankResult: "AgentRank Result",
        audit: "Audit",
        close: "Close event quick detail",
        connectedCreator: "Connected Creator",
        eventId: "Event ID",
        events: "Reputation Signals",
        handle: "TikTok handle",
        impact: "Impact",
        now: "Current Position",
        nextAction: "Next Action",
        object: "Object",
        occurredAt: "Generated",
        platform: "Platform",
        quick: "Quick detail",
        socialChannel: "Channel Connection",
        source: "Source",
        targetAiStar: "Target AI Star",
      };
  const objectLabel =
    event.object?.label ?? event.subject?.label ?? event.starId ?? "-";
  const socialChannelSummary =
    event.type === "creator_social_connected"
      ? {
          connectedCreator:
            readContextString(event, "actorMemberName") ?? event.actor.label,
          handle: readContextString(event, "handle"),
          platform: readContextString(event, "platform") ?? "tiktok",
          targetAiStar:
            readContextString(event, "starName") ??
            event.object?.label ??
            event.starId,
        }
      : null;
  const signalItems = [
    ["Network", event.reputationSignals.networkWeight],
    ["Economic", event.reputationSignals.economicWeight],
    ["Creator", event.reputationSignals.creatorWeight],
    ["Discovery", event.reputationSignals.discoveryWeight],
  ].filter(([, value]) => Number(value) > 0);
  const handleOpen = () => {
    setIsOpen(true);
    trackFunnelEvent("content_open", {
      agentRank: {
        eventType: event.type,
        intent: "agentrank_event_quick_panel_opened",
        source: "fanletter_agentrank",
        starId: event.starId ?? event.object?.id ?? null,
      },
      metadata: {
        auditStatus: event.audit.status,
        eventId: event.eventId,
        eventType: event.type,
        graphReady: event.audit.graphReady,
        impactReady: event.audit.impactReady,
        impactTotal,
        oracleReady: event.reputationSignals.oracleReady,
        placement: "agentrank_event_quick_panel",
      },
      targetHref: detailHref,
    });
  };

  return (
    <>
      <button
        className="ml-auto inline-flex min-h-8 max-w-full items-center justify-center gap-1.5 rounded-full bg-[#11132d] px-3 py-1 text-xs font-semibold leading-tight !text-white max-sm:ml-0"
        onClick={handleOpen}
        type="button"
      >
        <span className="truncate">{buttonLabel}</span>
        <ArrowRight className="size-3.5" />
      </button>

      <FanletterResponsiveActionPanel
        closeLabel={labels.close}
        description={intentLabel}
        eyebrow={labels.quick}
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-zinc-800"
              href={detailHref}
            >
              {detailLabel}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
              href={evidenceHref}
            >
              <Database className="size-4" />
              {evidenceLabel}
            </Link>
          </div>
        }
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={eventTypeLabel}
      >
        <div className="grid gap-4">
          <section className="grid gap-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {labels.now}
              </p>
              <p className="mt-1 break-words text-sm font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
                {objectLabel}
              </p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                {formatEventDate(event.occurredAt, locale)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {labels.nextAction}
              </p>
              <p className="mt-1 break-words text-sm font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
                {nextActionLabel}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700/75">
                {labels.agentRankResult}
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold text-emerald-950">
                  {impactTotal.toFixed(1)}
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <ShieldCheck className="size-3.5" />
                  {event.audit.status}
                </span>
              </div>
            </div>
          </section>

          {socialChannelSummary ? (
            <section className="rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                {labels.socialChannel}
              </p>
              <p className="mt-2 break-words text-lg font-semibold leading-tight [word-break:keep-all]">
                {socialChannelSummary.handle ?? "TikTok"}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  [labels.platform, socialChannelSummary.platform],
                  [labels.connectedCreator, socialChannelSummary.connectedCreator],
                  [labels.targetAiStar, socialChannelSummary.targetAiStar],
                ].map(([label, value]) => (
                  <div
                    className="min-w-0 rounded-lg border border-white/10 bg-white/8 p-2"
                    key={label}
                  >
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white/45">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-white">
                      {value ?? "-"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-2 sm:grid-cols-2">
            {[
              [labels.actor, event.actor.label ?? event.actor.id],
              [labels.object, objectLabel],
              [labels.source, event.source],
              [labels.audit, `${event.audit.qualityScore}/100`],
            ].map(([label, value]) => (
              <div
                className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3"
                key={label}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {labels.events}
            </p>
            <div className="mt-3 grid gap-2">
              {signalItems.length ? (
                signalItems.map(([label, value]) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                    key={String(label)}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-zinc-800">
                      <GitBranch className="size-4 shrink-0 text-zinc-500" />
                      {label}
                    </span>
                    <span className="font-mono text-sm font-semibold text-zinc-950">
                      {Number(value).toFixed(1)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-500">
                  <BadgeCheck className="size-4" />
                  0.0
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {labels.eventId}
            </p>
            <p className="mt-1 break-all font-mono text-xs font-semibold leading-5 text-zinc-700">
              {event.eventId}
            </p>
          </section>
        </div>
      </FanletterResponsiveActionPanel>
    </>
  );
}
