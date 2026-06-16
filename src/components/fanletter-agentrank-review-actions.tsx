"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  PackageCheck,
  X,
} from "lucide-react";

import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import type {
  AgentRankReviewAction,
  AgentRankReviewStatus,
} from "@/lib/agentrank/review-queue";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankReviewActionsProps = {
  eventId: string;
  initialStatus: AgentRankReviewStatus;
  locale: Locale;
  memberEmail?: string | null;
  scope: string;
  starId?: string | null;
};

type ReviewActionReceipt = {
  action: AgentRankReviewAction;
  event: {
    eventId: string;
    impactTotal: number;
    qualityScore: number;
    type: string;
  };
  issuedAt: string;
  previousStatus: AgentRankReviewStatus;
  recordType: string;
  reviewActionId: string;
  reviewActionHash: string;
  storage: {
    durable: boolean;
    mode: string;
    nextStep: string;
  };
  targetStatus: AgentRankReviewStatus;
};

const actionConfig = [
  {
    action: "mark_needs_enrichment",
    Icon: AlertTriangle,
  },
  {
    action: "mark_packet_ready",
    Icon: PackageCheck,
  },
  {
    action: "approve_event",
    Icon: Check,
  },
  {
    action: "reject_event",
    Icon: X,
  },
] satisfies Array<{
  action: AgentRankReviewAction;
  Icon: typeof AlertTriangle;
}>;

function getActionCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      actions: {
        approve_event: "승인",
        mark_needs_enrichment: "보강",
        mark_packet_ready: "Packet",
        reject_event: "제외",
      },
      failed: "액션 생성 실패",
      nextAction: "다음 행동",
      mock: "Mock receipt",
      receipt: "Review Receipt mock",
      receiptBody:
        "이 액션은 실제 운영 상태를 바꾸지 않고 AgentRank Review Ledger에 남길 mock receipt 구조를 미리 보여줍니다.",
      reviewEvent: "이벤트 추적",
      reviewEvidence: "증거 패킷 확인",
      saved: "액션 기록됨",
      statusChange: "상태 변경",
      statuses: {
        approved: "승인됨",
        needs_enrichment: "보강 필요",
        packet_ready: "Packet 준비",
        pending: "대기",
        rejected: "제외됨",
      },
    };
  }

  return {
    actions: {
      approve_event: "Approve",
      mark_needs_enrichment: "Enrich",
      mark_packet_ready: "Packet",
      reject_event: "Reject",
    },
    failed: "Action failed",
    nextAction: "Next Action",
    mock: "Mock receipt",
    receipt: "Review Receipt mock",
    receiptBody:
      "This action does not mutate live operations yet. It previews the mock receipt shape for the AgentRank Review Ledger.",
    reviewEvent: "Trace event",
    reviewEvidence: "Inspect evidence packet",
    saved: "Action recorded",
    statusChange: "Status change",
    statuses: {
      approved: "Approved",
      needs_enrichment: "Needs enrichment",
      packet_ready: "Packet ready",
      pending: "Pending",
      rejected: "Rejected",
    },
  };
}

function getStatusTone(status: AgentRankReviewStatus) {
  if (status === "approved") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }

  if (status === "packet_ready") {
    return "border-cyan-100 bg-cyan-50 text-cyan-700";
  }

  if (status === "needs_enrichment") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-slate-100 bg-slate-50 text-slate-600";
}

function getActionNextStep(status: AgentRankReviewStatus, locale: Locale) {
  const isKorean = locale === "ko";

  if (status === "packet_ready" || status === "approved") {
    return isKorean
      ? "Evidence Packet에서 Oracle 전달 준비를 확인합니다."
      : "Check Oracle handoff readiness in the Evidence Packet.";
  }

  if (status === "needs_enrichment") {
    return isKorean
      ? "이벤트 상세에서 보강 항목과 그래프 신호를 확인합니다."
      : "Review enrichment gaps and graph signals on the event detail page.";
  }

  if (status === "rejected") {
    return isKorean
      ? "이벤트 상세에서 제외 사유와 영향도를 다시 확인합니다."
      : "Review the rejection reason and impact on the event detail page.";
  }

  return isKorean
    ? "리뷰 큐에서 다음 이벤트를 계속 검토합니다."
    : "Continue reviewing the next event in the queue.";
}

export function FanletterAgentRankReviewActions({
  eventId,
  initialStatus,
  locale,
  memberEmail,
  scope,
  starId,
}: FanletterAgentRankReviewActionsProps) {
  const copy = getActionCopy(locale);
  const [status, setStatus] = useState<AgentRankReviewStatus>(initialStatus);
  const [receipt, setReceipt] = useState<ReviewActionReceipt | null>(null);
  const [isReceiptPanelOpen, setIsReceiptPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<AgentRankReviewAction | null>(null);
  const eventParams = new URLSearchParams();

  if (starId) {
    eventParams.set("starId", starId);
  }

  if (scope !== "all") {
    eventParams.set("scope", scope);
  }

  if (memberEmail) {
    eventParams.set("memberEmail", memberEmail);
  }

  const eventQuery = eventParams.toString();
  const eventDetailHref = `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
    eventId,
  )}${eventQuery ? `?${eventQuery}` : ""}`;
  const evidenceHref = `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
    eventId,
  )}/evidence${eventQuery ? `?${eventQuery}` : ""}`;

  async function submitAction(action: AgentRankReviewAction) {
    setPendingAction(action);
    setError(null);

    try {
      const response = await fetch("/api/fanletter/agentrank/review-queue/actions", {
        body: JSON.stringify({
          action,
          eventId,
          memberEmail,
          scope,
          starId,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Review action failed: ${response.status}`);
      }

      const receipt = (await response.json()) as ReviewActionReceipt;
      setStatus(receipt.targetStatus);
      setReceipt(receipt);
      setIsReceiptPanelOpen(true);
      trackFunnelEvent("content_open", {
        agentRank: {
          eventType: "content_engaged",
          intent: "agentrank_review_action_receipt_opened",
          source: "fanletter_agentrank",
          starId,
        },
        metadata: {
          action,
          eventId,
          placement: "agentrank_review_action_receipt",
          receiptId: receipt.reviewActionId,
          scope,
          targetStatus: receipt.targetStatus,
        },
        targetHref:
          receipt.targetStatus === "packet_ready" ||
          receipt.targetStatus === "approved"
            ? evidenceHref
            : eventDetailHref,
      });
    } catch {
      setError(copy.failed);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <div className="mt-3 rounded-lg border border-white/80 bg-white/72 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${getStatusTone(
              status,
            )}`}
          >
            <BadgeCheck className="size-3" />
            {copy.statuses[status]}
          </span>
          {receipt ? (
            <button
              className="font-mono text-[0.65rem] font-semibold text-slate-500 underline-offset-2 hover:text-[#6d28d9] hover:underline"
              onClick={() => setIsReceiptPanelOpen(true)}
              type="button"
            >
              {copy.mock}
            </button>
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {actionConfig.map(({ action, Icon }) => (
            <button
              className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-violet-100 bg-white px-2 text-[0.68rem] font-semibold text-[#6d28d9] transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-55"
              disabled={pendingAction !== null}
              key={action}
              onClick={() => void submitAction(action)}
              type="button"
            >
              <Icon className="size-3" />
              {pendingAction === action ? "..." : copy.actions[action]}
            </button>
          ))}
        </div>
        {receipt ? (
          <button
            className="mt-2 flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-left text-[0.65rem] font-semibold text-emerald-800"
            onClick={() => setIsReceiptPanelOpen(true)}
            type="button"
          >
            <span className="min-w-0 truncate">
              {copy.saved}: {receipt.reviewActionId}
            </span>
            <ArrowRight className="size-3.5 shrink-0" />
          </button>
        ) : null}
        {error ? (
          <p className="mt-2 text-[0.65rem] font-semibold text-rose-600">
            {error}
          </p>
        ) : null}
      </div>

      {receipt ? (
        <FanletterResponsiveActionPanel
          closeLabel={
            locale === "ko" ? "리뷰 액션 결과 닫기" : "Close review action result"
          }
          description={copy.receiptBody}
          eyebrow="AgentRank"
          footer={
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-zinc-800"
                href={
                  receipt.targetStatus === "packet_ready" ||
                  receipt.targetStatus === "approved"
                    ? evidenceHref
                    : eventDetailHref
                }
              >
                {receipt.targetStatus === "packet_ready" ||
                receipt.targetStatus === "approved"
                  ? copy.reviewEvidence
                  : copy.reviewEvent}
                <ArrowRight className="size-4" />
              </Link>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
                onClick={() => setIsReceiptPanelOpen(false)}
                type="button"
              >
                {locale === "ko" ? "확인" : "Done"}
              </button>
            </div>
          }
          onClose={() => setIsReceiptPanelOpen(false)}
          open={isReceiptPanelOpen}
          title={copy.receipt}
        >
          <div className="grid gap-3">
            <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {copy.statusChange}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(
                    receipt.previousStatus,
                  )}`}
                >
                  {copy.statuses[receipt.previousStatus]}
                </span>
                <ArrowRight className="size-4 text-zinc-400" />
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(
                    receipt.targetStatus,
                  )}`}
                >
                  {copy.statuses[receipt.targetStatus]}
                </span>
              </div>
            </section>

            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold normal-case tracking-[0.08em] text-emerald-700/75">
                {copy.nextAction}
              </p>
              <p className="mt-1 break-words text-sm font-semibold leading-5 text-emerald-950 [word-break:keep-all]">
                {getActionNextStep(receipt.targetStatus, locale)}
              </p>
            </section>

            <section className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {locale === "ko" ? "평판 영향" : "Impact"}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-950">
                  {receipt.event.impactTotal.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {locale === "ko" ? "품질" : "Quality"}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-950">
                  {receipt.event.qualityScore}/100
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {copy.mock}
              </p>
              <p className="mt-1 break-all font-mono text-xs font-semibold leading-5 text-zinc-700">
                {receipt.reviewActionId}
              </p>
              <p className="mt-2 break-all font-mono text-[0.68rem] font-semibold leading-5 text-zinc-500">
                {receipt.reviewActionHash}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                  {receipt.recordType}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                  {receipt.storage.mode}
                </span>
              </div>
            </section>
          </div>
        </FanletterResponsiveActionPanel>
      ) : null}
    </>
  );
}
