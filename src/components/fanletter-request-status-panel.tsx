"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Inbox, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  FanletterFanRequestRecord,
  FanletterFanRequestsResponse,
  FanletterFanRequestStatus,
} from "@/lib/content";
import { readFanletterRequestReceiptIds } from "@/lib/fanletter-request-receipts";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type RequestStatusPanelStatus = "error" | "idle" | "loading" | "ready";

type FanletterRequestStatusPanelProps = {
  className?: string;
  creatorReferralCode: string | null;
  locale: Locale;
  referralCode: string | null;
  sourceContentId?: string | null;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        body: "이 기기에서 보낸 요청의 접수, 확인, 제작 반영 상태를 바로 확인합니다.",
        cta: "내 요청 전체 보기",
        empty: "아직 이 캐릭터에게 보낸 요청 영수증이 없습니다.",
        error: "요청 상태를 불러오지 못했습니다.",
        loading: "내 요청 상태 확인 중",
        sourceBody: "이 브이로그에서 남긴 요청 상태를 이 기기에서 바로 확인합니다.",
        statuses: {
          hidden: "숨김",
          new: "접수됨",
          reviewed: "확인됨",
          used: "제작 반영",
        } satisfies Record<FanletterFanRequestStatus, string>,
        title: "내 팬 요청 상태",
        type: {
          message: "응원 메시지",
          vlog_request: "브이로그 요청",
        },
      }
    : {
        body: "Track requests saved on this device from received to reviewed and produced.",
        cta: "View all my requests",
        empty: "No request receipts for this character are saved on this device yet.",
        error: "Could not load request status.",
        loading: "Checking my request status",
        sourceBody: "Track the request you left from this vlog on this device.",
        statuses: {
          hidden: "Hidden",
          new: "Received",
          reviewed: "Reviewed",
          used: "Produced",
        } satisfies Record<FanletterFanRequestStatus, string>,
        title: "My fan request status",
        type: {
          message: "Support message",
          vlog_request: "Vlog request",
        },
      };
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok || !data) {
    throw new Error(data?.error || fallback);
  }

  return data;
}

function getVisibleRequests({
  creatorReferralCode,
  requests,
  sourceContentId,
}: {
  creatorReferralCode: string | null;
  requests: FanletterFanRequestRecord[];
  sourceContentId?: string | null;
}) {
  return requests
    .filter((request) => {
      if (creatorReferralCode && request.creatorReferralCode !== creatorReferralCode) {
        return false;
      }

      if (!sourceContentId) {
        return true;
      }

      return (
        request.sourceContentId === sourceContentId ||
        request.usedContentId === sourceContentId
      );
    })
    .slice(0, 3);
}

function getStatusIcon(status: FanletterFanRequestStatus) {
  if (status === "used") {
    return CheckCircle2;
  }

  if (status === "reviewed") {
    return Clock3;
  }

  return Inbox;
}

export function FanletterRequestStatusPanel({
  className = "",
  creatorReferralCode,
  locale,
  referralCode,
  sourceContentId = null,
}: FanletterRequestStatusPanelProps) {
  const copy = getCopy(locale);
  const [status, setStatus] = useState<RequestStatusPanelStatus>("idle");
  const [requests, setRequests] = useState<FanletterFanRequestRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const visibleRequests = useMemo(
    () =>
      getVisibleRequests({
        creatorReferralCode,
        requests,
        sourceContentId,
      }),
    [creatorReferralCode, requests, sourceContentId],
  );
  const requestsHref = `${buildPathWithReferral(
    `/${locale}/fanletter/requests`,
    referralCode ?? creatorReferralCode,
  )}#fanletter-request-inbox`;

  useEffect(() => {
    const requestIds = readFanletterRequestReceiptIds();

    if (requestIds.length === 0) {
      return;
    }

    const controller = new AbortController();

    async function loadRequests() {
      try {
        setError(null);
        setStatus("loading");
        const data = await readApiJson<FanletterFanRequestsResponse>(
          await fetch("/api/fanletter/requests/receipts", {
            body: JSON.stringify({
              pageSize: 12,
              requestIds,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
            signal: controller.signal,
          }),
          copy.error,
        );

        setRequests(data.requests);
        setStatus("ready");
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : copy.error);
        setStatus("error");
      }
    }

    void loadRequests();

    return () => {
      controller.abort();
    };
  }, [copy.error]);

  if (status === "idle" || (status === "ready" && visibleRequests.length === 0)) {
    return null;
  }

  return (
    <section
      className={`rounded-lg border border-[#44f26e]/24 bg-[#07100b] p-4 text-white shadow-[0_18px_52px_rgba(0,0,0,0.22)] sm:p-5 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            {status === "loading" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Inbox className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              FanLetter Receipt
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal [word-break:keep-all]">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-white/58 [word-break:keep-all]">
              {sourceContentId ? copy.sourceBody : copy.body}
            </p>
          </div>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#44f26e]/28 px-3 text-sm font-semibold !text-[#b9ffc8] transition hover:bg-[#44f26e]/10"
          href={requestsHref}
        >
          {copy.cta}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {status === "loading" ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.055] p-3 text-sm font-medium text-white/56">
          {copy.loading}
        </p>
      ) : null}

      {status === "error" ? (
        <p className="mt-4 rounded-lg border border-red-300/20 bg-red-500/12 p-3 text-sm font-medium leading-6 text-red-100">
          {error ?? copy.error}
        </p>
      ) : null}

      {visibleRequests.length > 0 ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {visibleRequests.map((request) => {
            const Icon = getStatusIcon(request.status);

            return (
              <article
                className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
                key={request.requestId}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.66rem] font-semibold text-black">
                    <Icon className="size-3.5" />
                    {copy.statuses[request.status]}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[0.66rem] font-semibold text-white/42">
                    {copy.type[request.requestType]}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                  {request.body}
                </p>
              </article>
            );
          })}
        </div>
      ) : status === "ready" ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.055] p-3 text-sm font-medium text-white/56">
          {copy.empty}
        </p>
      ) : null}
    </section>
  );
}
