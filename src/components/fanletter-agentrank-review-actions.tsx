"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, Check, PackageCheck, X } from "lucide-react";

import type {
  AgentRankReviewAction,
  AgentRankReviewStatus,
} from "@/lib/agentrank/review-queue";
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
  reviewActionId: string;
  storage: {
    durable: boolean;
    mode: string;
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
      mock: "Mock receipt",
      saved: "액션 기록됨",
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
    mock: "Mock receipt",
    saved: "Action recorded",
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
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<AgentRankReviewAction | null>(null);

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
      setReceiptId(receipt.reviewActionId);
    } catch {
      setError(copy.failed);
    } finally {
      setPendingAction(null);
    }
  }

  return (
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
        {receiptId ? (
          <span className="font-mono text-[0.65rem] font-semibold text-slate-400">
            {copy.mock}
          </span>
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
      {receiptId ? (
        <p className="mt-2 truncate text-[0.65rem] font-semibold text-emerald-700">
          {copy.saved}: {receiptId}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[0.65rem] font-semibold text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
