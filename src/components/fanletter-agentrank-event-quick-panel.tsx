"use client";

import Link from "next/link";
import { ArrowRight, Database, GitBranch, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
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
  const labels = isKorean
    ? {
        actor: "액터",
        audit: "감사 상태",
        close: "이벤트 빠른 상세 닫기",
        eventId: "이벤트 ID",
        events: "평판 신호",
        impact: "평판 영향",
        object: "대상",
        occurredAt: "생성 시각",
        quick: "빠른 상세",
        source: "소스",
      }
    : {
        actor: "Actor",
        audit: "Audit",
        close: "Close event quick detail",
        eventId: "Event ID",
        events: "Reputation Signals",
        impact: "Impact",
        object: "Object",
        occurredAt: "Generated",
        quick: "Quick detail",
        source: "Source",
      };
  const objectLabel =
    event.object?.label ?? event.subject?.label ?? event.starId ?? "-";
  const signalItems = [
    ["Network", event.reputationSignals.networkWeight],
    ["Economic", event.reputationSignals.economicWeight],
    ["Creator", event.reputationSignals.creatorWeight],
    ["Discovery", event.reputationSignals.discoveryWeight],
  ].filter(([, value]) => Number(value) > 0);

  return (
    <>
      <button
        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-[#11132d] px-3 text-xs font-semibold !text-white max-sm:ml-0"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {buttonLabel}
        <ArrowRight className="size-3.5" />
      </button>

      <FanletterResponsiveActionPanel
        closeLabel={labels.close}
        description={`${event.context.intent ?? event.sourceId}`}
        eyebrow={labels.quick}
        onClose={() => setIsOpen(false)}
        open={isOpen}
        title={event.type}
      >
        <div className="grid gap-4">
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {labels.impact}
                </p>
                <p className="mt-1 text-3xl font-semibold text-zinc-950">
                  {impactTotal.toFixed(1)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="size-3.5" />
                {event.audit.status}
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-zinc-500">
              {formatEventDate(event.occurredAt, locale)}
            </p>
          </section>

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
              {signalItems.map(([label, value]) => (
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
              ))}
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
        </div>
      </FanletterResponsiveActionPanel>
    </>
  );
}
