"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Clock3,
  Inbox,
  Loader2,
  MessageCircleHeart,
  RefreshCw,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import type {
  FanletterFanRequestRecord,
  FanletterFanRequestStatus,
  FanletterFanRequestType,
  FanletterFanRequestsResponse,
} from "@/lib/content";
import { useFanletterAccountStatus } from "@/lib/fanletter-account-status";
import { readFanletterRequestReceiptIds } from "@/lib/fanletter-request-receipts";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { thirdwebClient } from "@/lib/thirdweb";
import { getThirdwebUserEmail } from "@/lib/thirdweb-client";

type LoadStatus = "error" | "idle" | "loading" | "ready";
type RequestStatusFilter = "all" | "open" | FanletterFanRequestStatus;
type RequestTypeFilter = "all" | FanletterFanRequestType;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountBody:
          "계정을 연결하면 이 기기에 저장된 요청 영수증도 내 계정 요청함에 함께 보관됩니다.",
        accountConnected: "연결된 계정으로 요청을 추적 중입니다.",
        accountEyebrow: "Account",
        accountTitle: "요청 추적 계정",
        all: "전체",
        allRequests: "전체 요청",
        connect: "계정 연결",
        emptyBody:
          "캐릭터 채널에서 보고 싶은 장면이나 응원 메시지를 남기면 이곳에서 접수부터 제작 완료까지 확인할 수 있습니다.",
        emptyCta: "캐릭터 둘러보기",
        emptyTitle: "아직 추적할 팬 요청이 없습니다.",
        error: "팬 요청 상태를 불러오지 못했습니다.",
        feed: "브이로그 피드",
        following: "팬 홈",
        heroBody:
          "내가 남긴 팬 요청을 접수됨, 검토 중, 제작 완료 단계로 모아보고 바로 다음 행동으로 이어갑니다.",
        heroEyebrow: "Fan request inbox",
        heroTitle: "내 팬 요청 인박스",
        localReceipts: "이 기기에 저장된 요청",
        loading: "팬 요청 상태를 확인하는 중입니다.",
        messageType: "응원 메시지",
        noFilterBody:
          "다른 상태나 검색어를 선택하면 숨겨진 요청을 다시 확인할 수 있습니다.",
        noFilterTitle: "조건에 맞는 요청이 없습니다.",
        open: "진행 중",
        produced: "제작 완료",
        producedCta: "제작된 브이로그 보기",
        received: "접수됨",
        refresh: "새로고침",
        requestAgain: "다음 요청 남기기",
        reviewing: "검토 중",
        search: "캐릭터명이나 요청 내용 검색",
        statusNewBody: "요청이 저장되어 크리에이터 스튜디오에 전달되었습니다.",
        statusReviewedBody: "크리에이터가 요청을 확인했고 콘텐츠 후보로 검토 중입니다.",
        statusUsedBody: "요청이 실제 공개 브이로그로 제작되었습니다.",
        summaryTitle: "요청 진행 요약",
        timeline: "진행 단계",
        typeAll: "모든 유형",
        typeMessage: "응원 메시지",
        typeVlog: "브이로그 요청",
        unknownDate: "FanLetter",
        vlogRequestType: "브이로그 요청",
      }
    : {
        accountBody:
          "Connect your account to keep request receipts from this device with your FanLetter inbox.",
        accountConnected: "Tracking requests with your connected account.",
        accountEyebrow: "Account",
        accountTitle: "Request tracking account",
        all: "All",
        allRequests: "All requests",
        connect: "Connect account",
        emptyBody:
          "Leave a scene idea or message on a character channel, then track it from received to produced here.",
        emptyCta: "Browse characters",
        emptyTitle: "No fan requests to track yet.",
        error: "Could not load fan request status.",
        feed: "Vlog Feed",
        following: "Following",
        heroBody:
          "Track your fan requests across received, reviewing, and produced stages, then continue with the right next action.",
        heroEyebrow: "Fan request inbox",
        heroTitle: "My fan request inbox",
        localReceipts: "Requests saved on this device",
        loading: "Checking fan request status.",
        messageType: "Message",
        noFilterBody:
          "Change the status, type, or search term to bring hidden requests back.",
        noFilterTitle: "No requests match this view.",
        open: "Open",
        produced: "Produced",
        producedCta: "Watch produced vlog",
        received: "Received",
        refresh: "Refresh",
        requestAgain: "Leave next request",
        reviewing: "Reviewing",
        search: "Search character or request",
        statusNewBody: "The request is saved and delivered to the creator studio.",
        statusReviewedBody:
          "The creator reviewed it and is considering it for a future vlog.",
        statusUsedBody: "The request became a public FanLetter vlog.",
        summaryTitle: "Request progress",
        timeline: "Timeline",
        typeAll: "All types",
        typeMessage: "Message",
        typeVlog: "Vlog request",
        unknownDate: "FanLetter",
        vlogRequestType: "Vlog request",
      };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(value);
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(data?.error || fallback);
  }

  if (!data) {
    throw new Error(fallback);
  }

  return data;
}

function mergeFanRequests(
  requestGroups: FanletterFanRequestRecord[][],
): FanletterFanRequestRecord[] {
  const requestsById = new Map<string, FanletterFanRequestRecord>();

  requestGroups.flat().forEach((request) => {
    requestsById.set(request.requestId, request);
  });

  return Array.from(requestsById.values()).sort(
    (left, right) =>
      toTimestamp(right.updatedAt || right.createdAt) -
      toTimestamp(left.updatedAt || left.createdAt),
  );
}

function getStatusLabel(status: FanletterFanRequestStatus, locale: Locale) {
  const copy = getCopy(locale);

  if (status === "used") {
    return copy.produced;
  }

  if (status === "reviewed") {
    return copy.reviewing;
  }

  return copy.received;
}

function getTypeLabel(type: FanletterFanRequestType, locale: Locale) {
  const copy = getCopy(locale);

  return type === "message" ? copy.messageType : copy.vlogRequestType;
}

function RequestTimeline({
  locale,
  status,
}: {
  locale: Locale;
  status: FanletterFanRequestStatus;
}) {
  const copy = getCopy(locale);
  const steps: Array<{
    body: string;
    key: FanletterFanRequestStatus;
    label: string;
  }> = [
    { body: copy.statusNewBody, key: "new", label: copy.received },
    { body: copy.statusReviewedBody, key: "reviewed", label: copy.reviewing },
    { body: copy.statusUsedBody, key: "used", label: copy.produced },
  ];
  const activeIndex = steps.findIndex((step) => step.key === status);

  return (
    <div aria-label={copy.timeline} className="mt-4 grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => {
        const isComplete = index <= activeIndex;
        const isCurrent = index === activeIndex;

        return (
          <div
            className={`rounded-lg border p-3 ${
              isComplete
                ? "border-[#44f26e]/38 bg-[#44f26e]/10"
                : "border-black/8 bg-white/70"
            }`}
            key={step.key}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold ${
                  isComplete ? "bg-[#44f26e] text-black" : "bg-black/8 text-black/44"
                }`}
              >
                {index + 1}
              </span>
              <p className="text-xs font-semibold text-black/72">{step.label}</p>
            </div>
            {isCurrent ? (
              <p className="mt-2 text-xs font-medium leading-5 text-black/52">
                {step.body}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RequestStatusBadge({
  locale,
  status,
}: {
  locale: Locale;
  status: FanletterFanRequestStatus;
}) {
  const Icon = status === "used" ? BadgeCheck : status === "reviewed" ? Clock3 : Inbox;
  const className =
    status === "used"
      ? "border-[#29d85f]/34 bg-[#44f26e] text-black"
      : status === "reviewed"
        ? "border-[#29d85f]/24 bg-[#44f26e]/12 text-[#1f7c38]"
        : "border-black/10 bg-white text-black/58";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${className}`}
    >
      <Icon className="size-3.5" />
      {getStatusLabel(status, locale)}
    </span>
  );
}

export function FanletterRequestsPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const accountStatus = useFanletterAccountStatus({
    disconnectedResolveGraceMs: 3000,
    resolveGraceMs: 3000,
  });
  const { accountAddress, memberSession } = accountStatus;
  const [accountRequests, setAccountRequests] = useState<
    FanletterFanRequestRecord[]
  >([]);
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [receiptRequestIds, setReceiptRequestIds] = useState<string[]>([]);
  const [receiptRequests, setReceiptRequests] = useState<
    FanletterFanRequestRecord[]
  >([]);
  const [receiptsClaimed, setReceiptsClaimed] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>("all");
  const requestsHref = buildPathWithReferral(
    `/${locale}/fanletter/requests`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: requestsHref },
  );
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const followingHref = buildPathWithReferral(
    `/${locale}/fanletter/following`,
    referralCode,
  );
  const allRequests = useMemo(
    () => mergeFanRequests([accountRequests, receiptRequests]),
    [accountRequests, receiptRequests],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRequests = useMemo(
    () =>
      allRequests.filter((request) => {
        const statusMatches =
          statusFilter === "all"
            ? true
            : statusFilter === "open"
              ? request.status !== "used"
              : request.status === statusFilter;
        const typeMatches =
          typeFilter === "all" ? true : request.requestType === typeFilter;
        const queryMatches = normalizedQuery
          ? `${request.characterName} ${request.creatorDisplayName} ${request.body}`
              .toLowerCase()
              .includes(normalizedQuery)
          : true;

        return statusMatches && typeMatches && queryMatches;
      }),
    [allRequests, normalizedQuery, statusFilter, typeFilter],
  );
  const stats = useMemo(
    () => [
      { key: "all", label: copy.allRequests, value: allRequests.length },
      {
        key: "new",
        label: copy.received,
        value: allRequests.filter((request) => request.status === "new").length,
      },
      {
        key: "reviewed",
        label: copy.reviewing,
        value: allRequests.filter((request) => request.status === "reviewed")
          .length,
      },
      {
        key: "used",
        label: copy.produced,
        value: allRequests.filter((request) => request.status === "used").length,
      },
    ],
    [allRequests, copy.allRequests, copy.produced, copy.received, copy.reviewing],
  );
  const statusFilters: Array<{ label: string; value: RequestStatusFilter }> = [
    { label: copy.all, value: "all" },
    { label: copy.open, value: "open" },
    { label: copy.received, value: "new" },
    { label: copy.reviewing, value: "reviewed" },
    { label: copy.produced, value: "used" },
  ];
  const typeFilters: Array<{ label: string; value: RequestTypeFilter }> = [
    { label: copy.typeAll, value: "all" },
    { label: copy.typeVlog, value: "vlog_request" },
    { label: copy.typeMessage, value: "message" },
  ];
  const isAccountConnected = Boolean(accountAddress && email);
  const isLoading = status === "loading" || accountStatus.status === "checking";

  const loadRequests = useCallback(async () => {
    const requestIds = readFanletterRequestReceiptIds();
    let nextAccountRequests: FanletterFanRequestRecord[] = [];
    let nextReceiptRequests: FanletterFanRequestRecord[] = [];
    let nextError: string | null = null;
    let nextReceiptsClaimed = false;

    setReceiptRequestIds(requestIds);
    setStatus("loading");
    setError(null);

    let resolvedEmail = memberSession.email ?? email;

    if (accountAddress && !resolvedEmail) {
      try {
        resolvedEmail = await getThirdwebUserEmail({ client: thirdwebClient });
      } catch {
        resolvedEmail = null;
      }
    }

    setEmail(resolvedEmail ?? null);

    if (requestIds.length > 0) {
      try {
        const receiptResponse =
          accountAddress && resolvedEmail
            ? await fetch("/api/fanletter/requests/receipts", {
                body: JSON.stringify({
                  email: resolvedEmail,
                  pageSize: 30,
                  requestIds,
                  walletAddress: accountAddress,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
                method: "PATCH",
              })
            : await fetch("/api/fanletter/requests/receipts", {
                body: JSON.stringify({
                  pageSize: 30,
                  requestIds,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
                method: "POST",
              });
        const receiptData = await readApiJson<FanletterFanRequestsResponse>(
          receiptResponse,
          copy.error,
        );

        nextReceiptRequests = receiptData.requests;
        nextReceiptsClaimed = Boolean(accountAddress && resolvedEmail);
      } catch (receiptError) {
        nextError =
          receiptError instanceof Error ? receiptError.message : copy.error;
      }
    }

    if (accountAddress && resolvedEmail) {
      try {
        const params = new URLSearchParams({
          email: resolvedEmail,
          pageSize: "30",
          walletAddress: accountAddress,
        });
        const accountData = await readApiJson<FanletterFanRequestsResponse>(
          await fetch(`/api/fanletter/requests/mine?${params.toString()}`, {
            cache: "no-store",
          }),
          copy.error,
        );

        nextAccountRequests = accountData.requests;
      } catch (accountError) {
        nextError =
          accountError instanceof Error ? accountError.message : copy.error;
      }
    }

    setAccountRequests(nextAccountRequests);
    setReceiptRequests(nextReceiptRequests);
    setReceiptsClaimed(nextReceiptsClaimed);
    setError(nextError);
    setStatus(
      nextError && nextAccountRequests.length === 0 && nextReceiptRequests.length === 0
        ? "error"
        : "ready",
    );
  }, [accountAddress, copy.error, email, memberSession.email]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadRequests]);

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="border-b border-white/10 px-4 pb-10 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="flex min-w-0 items-center gap-2"
              href={buildPathWithReferral(`/${locale}/fanletter`, referralCode)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <nav className="hidden items-center gap-2 text-sm font-semibold text-white/62 md:flex">
              <Link className="rounded-full px-3 py-2 transition hover:text-white" href={feedHref}>
                {copy.feed}
              </Link>
              <Link
                className="rounded-full px-3 py-2 transition hover:text-white"
                href={followingHref}
              >
                {copy.following}
              </Link>
            </nav>
            <FanletterAccountStatusLink
              compactOnMobile
              locale={locale}
              referralCode={referralCode}
            />
          </header>

          <div className="grid gap-8 pt-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:pt-20">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-4 max-w-4xl text-[2.6rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[4.25rem]">
                {copy.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {copy.heroBody}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isLoading}
                  onClick={() => {
                    void loadRequests();
                  }}
                  type="button"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {copy.refresh}
                </button>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                  href={feedHref}
                >
                  <Sparkles className="size-4" />
                  {copy.emptyCta}
                </Link>
              </div>
            </div>

            <aside className="rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                {copy.accountEyebrow}
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-normal">
                {copy.accountTitle}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-white/62">
                {isAccountConnected ? copy.accountConnected : copy.accountBody}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/58">
                <span className="rounded-full border border-white/12 px-3 py-1.5">
                  {copy.localReceipts} {formatNumber(receiptRequestIds.length, locale)}
                </span>
                {receiptsClaimed ? (
                  <span className="rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1.5 text-[#b9ffc8]">
                    {copy.accountConnected}
                  </span>
                ) : null}
              </div>
              {!isAccountConnected ? (
                <Link
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold !text-black transition hover:bg-white/86"
                  href={connectHref}
                >
                  <WalletCards className="size-4" />
                  {copy.connect}
                </Link>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section
        className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8"
        id="fanletter-request-inbox"
      >
        <div className="mx-auto max-w-[92rem]">
          <div className="mb-6 grid gap-3 md:grid-cols-4">
            {stats.map((stat) => (
              <button
                className={`rounded-lg border p-4 text-left shadow-[0_14px_34px_rgba(8,18,12,0.08)] transition ${
                  statusFilter === stat.key
                    ? "border-[#29d85f]/48 bg-[#44f26e]/18"
                    : "border-black/10 bg-white hover:border-[#29d85f]/54"
                }`}
                key={stat.key}
                onClick={() => {
                  if (
                    stat.key === "all" ||
                    stat.key === "new" ||
                    stat.key === "reviewed" ||
                    stat.key === "used"
                  ) {
                    setStatusFilter(stat.key);
                  }
                }}
                type="button"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-black/44">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-semibold leading-none">
                  {formatNumber(stat.value, locale)}
                </p>
              </button>
            ))}
          </div>

          <section className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.1)] sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/34" />
                <input
                  className="h-11 w-full rounded-full border border-black/10 bg-[#f6f8f4] pl-10 pr-4 text-sm font-semibold text-black outline-none transition placeholder:text-black/36 focus:border-[#29d85f]/60"
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  placeholder={copy.search}
                  type="search"
                  value={query}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <button
                    className={`h-10 rounded-full px-3 text-sm font-semibold transition ${
                      statusFilter === filter.value
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white text-black/62 hover:border-black/24"
                    }`}
                    key={filter.value}
                    onClick={() => {
                      setStatusFilter(filter.value);
                    }}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {typeFilters.map((filter) => (
                <button
                  className={`h-9 rounded-full px-3 text-xs font-semibold transition ${
                    typeFilter === filter.value
                      ? "bg-[#44f26e] text-black"
                      : "border border-black/10 bg-[#f6f8f4] text-black/56 hover:border-black/24"
                  }`}
                  key={filter.value}
                  onClick={() => {
                    setTypeFilter(filter.value);
                  }}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </section>

          {status === "loading" ? (
            <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_44px_rgba(8,18,12,0.1)]">
              <div className="flex items-center gap-3 text-sm font-semibold text-black/56">
                <Loader2 className="size-4 animate-spin text-[#1f7c38]" />
                {copy.loading}
              </div>
            </section>
          ) : status === "error" ? (
            <section className="mt-5 rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                {error ?? copy.error}
              </p>
              <button
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white"
                onClick={() => {
                  void loadRequests();
                }}
                type="button"
              >
                <RefreshCw className="size-4" />
                {copy.refresh}
              </button>
            </section>
          ) : allRequests.length === 0 ? (
            <section className="mt-5 grid gap-4 rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_44px_rgba(8,18,12,0.1)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  {copy.emptyTitle}
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-black/58">
                  {copy.emptyBody}
                </p>
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
                href={feedHref}
              >
                {copy.emptyCta}
                <ArrowRight className="size-4" />
              </Link>
            </section>
          ) : filteredRequests.length === 0 ? (
            <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_44px_rgba(8,18,12,0.1)]">
              <h2 className="text-xl font-semibold tracking-normal">
                {copy.noFilterTitle}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-black/56">
                {copy.noFilterBody}
              </p>
            </section>
          ) : (
            <div className="mt-5 grid gap-4">
              {filteredRequests.map((request) => {
                const actionHref = request.usedContentId
                  ? buildPathWithReferral(
                      `/${locale}/fanletter/content/${request.usedContentId}`,
                      referralCode ?? request.creatorReferralCode,
                    )
                  : `${buildPathWithReferral(
                      `/${locale}/fanletter/creator/${request.creatorReferralCode}`,
                      referralCode ?? request.creatorReferralCode,
                    )}#fan-requests`;
                const actionLabel = request.usedContentId
                  ? copy.producedCta
                  : copy.requestAgain;

                return (
                  <article
                    className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.09)] lg:grid-cols-[minmax(0,1fr)_17rem] lg:p-5"
                    key={request.requestId}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <RequestStatusBadge locale={locale} status={request.status} />
                        <span className="rounded-full border border-black/10 bg-[#f6f8f4] px-3 py-1 text-[0.72rem] font-semibold text-black/52">
                          {getTypeLabel(request.requestType, locale)}
                        </span>
                        <span className="text-xs font-semibold text-black/38">
                          {formatDate(request.updatedAt, locale) ??
                            formatDate(request.createdAt, locale) ??
                            copy.unknownDate}
                        </span>
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-normal [word-break:keep-all]">
                        {request.characterName}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-[#1f7c38]">
                        {request.creatorDisplayName}
                      </p>
                      <p className="mt-4 break-words text-base font-semibold leading-7 text-black/76 [overflow-wrap:anywhere]">
                        {request.body}
                      </p>
                      <RequestTimeline locale={locale} status={request.status} />
                    </div>

                    <aside className="rounded-lg border border-black/8 bg-[#f6f8f4] p-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-black/42">
                        {copy.summaryTitle}
                      </p>
                      <div className="mt-4 space-y-3 text-sm font-medium text-black/58">
                        <div className="flex items-center justify-between gap-3">
                          <span>{copy.received}</span>
                          <span className="font-semibold text-black/76">
                            {formatDate(request.createdAt, locale) ??
                              copy.unknownDate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>{copy.timeline}</span>
                          <span className="font-semibold text-black/76">
                            {getStatusLabel(request.status, locale)}
                          </span>
                        </div>
                      </div>
                      <Link
                        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
                        href={actionHref}
                      >
                        {actionLabel}
                        <ArrowRight className="size-4" />
                      </Link>
                    </aside>
                  </article>
                );
              })}
            </div>
          )}

          <Link
            className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 text-sm font-semibold !text-black transition hover:border-[#29d85f]/60"
            href={followingHref}
          >
            <ArrowLeft className="size-4" />
            {copy.following}
          </Link>
        </div>
      </section>
    </main>
  );
}
