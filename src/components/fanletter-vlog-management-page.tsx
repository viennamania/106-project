"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  Eye,
  Loader2,
  MessageCircleHeart,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
  Video,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { useMemberSession } from "@/components/member-session-provider";
import type {
  ContentPostMutationResponse,
  ContentPostRecord,
  ContentPostStatus,
  CreatorProfileRecord,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { smartWalletChain, thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type VlogStatusFilter = "all" | "archived" | "draft" | "published";

type VlogManagementState = {
  error: string | null;
  member: MemberRecord | null;
  notice: string | null;
  pageInfo: CreatorStudioPostsResponse["pageInfo"] | null;
  posts: ContentPostRecord[];
  profile: CreatorProfileRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  summary: CreatorStudioPostsResponse["summary"];
};

const FANLETTER_VLOG_DISCONNECTED_GRACE_MS = 4500;
const VLOGS_PAGE_SIZE = 18;
const EMPTY_SUMMARY: CreatorStudioPostsResponse["summary"] = {
  all: 0,
  archived: 0,
  draft: 0,
  published: 0,
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          archive: "보관",
          back: "스튜디오",
          channels: "채널 배포",
          connect: "계정 연결",
          create: "새 브이로그 만들기",
          detail: "상세 보기",
          feed: "피드 보기",
          next: "다음",
          previous: "이전",
          publish: "공개",
          refresh: "새로고침",
          search: "검색",
        },
        connectRequired:
          "FanLetter 계정을 연결하면 내 AI 캐릭터 브이로그를 관리할 수 있습니다.",
        emptyBody:
          "아직 관리할 브이로그가 없습니다. 오늘의 AI 캐릭터 브이로그를 만든 뒤 공개 상태를 관리해보세요.",
        emptyTitle: "첫 브이로그를 만들 시간입니다.",
        eyebrow: "FanLetter Vlog Manager",
        labels: {
          all: "전체",
          archived: "보관",
          author: "크리에이터",
          draft: "임시저장",
          free: "무료",
          page: "페이지",
          paid: "유료",
          published: "공개",
          results: "브이로그",
          status: "상태",
          updated: "수정일",
        },
        loading: "브이로그 목록을 불러오고 있습니다.",
        noMatching: "조건에 맞는 브이로그가 없습니다.",
        paymentRequired:
          "가입 완료 회원만 FanLetter 브이로그 전체 관리를 사용할 수 있습니다.",
        searchPlaceholder: "제목, 요약, 본문으로 검색",
        subtitle:
          "FanLetter에 올릴 AI 캐릭터 브이로그를 검색하고 공개, 임시저장, 보관 상태를 한 화면에서 정리합니다.",
        title: "브이로그 전체 관리",
      }
    : {
        actions: {
          archive: "Archive",
          back: "Studio",
          channels: "Channel distribution",
          connect: "Connect account",
          create: "Create new vlog",
          detail: "View detail",
          feed: "View feed",
          next: "Next",
          previous: "Previous",
          publish: "Publish",
          refresh: "Refresh",
          search: "Search",
        },
        connectRequired:
          "Connect your FanLetter account to manage your AI character vlogs.",
        emptyBody:
          "There are no vlogs to manage yet. Create today's AI character vlog, then manage its publishing state here.",
        emptyTitle: "Create your first vlog.",
        eyebrow: "FanLetter Vlog Manager",
        labels: {
          all: "All",
          archived: "Archived",
          author: "Creator",
          draft: "Drafts",
          free: "Free",
          page: "Page",
          paid: "Paid",
          published: "Published",
          results: "Vlogs",
          status: "Status",
          updated: "Updated",
        },
        loading: "Loading vlogs.",
        noMatching: "No vlogs match the current filters.",
        paymentRequired:
          "Completed members can manage all FanLetter vlogs.",
        searchPlaceholder: "Search by title, summary, or body",
        subtitle:
          "Search AI character vlogs for FanLetter and manage published, draft, and archived states from one focused page.",
        title: "Manage all vlogs",
      };
}

function isVlogStatusFilter(value: string | null): value is VlogStatusFilter {
  return (
    value === "all" ||
    value === "archived" ||
    value === "draft" ||
    value === "published"
  );
}

function normalizePageValue(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function formatDateLabel(locale: Locale, value: string | null) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getPostVideoUrl(post: Pick<ContentPostRecord, "contentVideoUrls">) {
  return post.contentVideoUrls[0] ?? null;
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  const error =
    payload && typeof payload === "object" && "error" in payload
      ? payload.error
      : null;

  if (!response.ok || !payload) {
    throw new Error(error || fallback);
  }

  return payload as T;
}

function getStatusLabel(
  copy: ReturnType<typeof getCopy>,
  status: ContentPostStatus | "all",
) {
  if (status === "published") {
    return copy.labels.published;
  }

  if (status === "draft") {
    return copy.labels.draft;
  }

  if (status === "archived") {
    return copy.labels.archived;
  }

  return copy.labels.all;
}

function getPriceLabel(copy: ReturnType<typeof getCopy>, post: ContentPostRecord) {
  if (post.priceType === "paid") {
    return `${copy.labels.paid}${post.priceUsdt ? ` · ${post.priceUsdt} USDT` : ""}`;
  }

  return copy.labels.free;
}

export function FanletterVlogManagementPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: FANLETTER_VLOG_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_VLOG_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const managerBaseHref = buildPathWithReferral(
    `/${locale}/fanletter/studio/vlogs`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: managerBaseHref },
  );
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const channelsHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/channels`, referralCode),
    { returnTo: managerBaseHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: managerBaseHref },
  );
  const appliedQuery = searchParams.get("q")?.trim() ?? "";
  const appliedStatus = isVlogStatusFilter(searchParams.get("status"))
    ? (searchParams.get("status") as VlogStatusFilter)
    : "all";
  const appliedPage = normalizePageValue(searchParams.get("page"));
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [searchInput, setSearchInput] = useState(appliedQuery);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [state, setState] = useState<VlogManagementState>({
    error: null,
    member: memberSession.member,
    notice: null,
    pageInfo: null,
    posts: [],
    profile: null,
    status: "idle",
    summary: EMPTY_SUMMARY,
  });

  useEffect(() => {
    setSearchInput(appliedQuery);
  }, [appliedQuery]);

  const buildManagerHref = useCallback(
    (options?: {
      page?: number;
      query?: string;
      status?: VlogStatusFilter;
    }) => {
      const page = options?.page ?? appliedPage;
      const query = options?.query ?? appliedQuery;
      const status = options?.status ?? appliedStatus;

      return setPathSearchParams(managerBaseHref, {
        page: page > 1 ? String(page) : null,
        q: query || null,
        status: status !== "all" ? status : null,
      });
    },
    [appliedPage, appliedQuery, appliedStatus, managerBaseHref],
  );
  const currentManagerHref = useMemo(() => buildManagerHref(), [buildManagerHref]);
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: currentManagerHref },
  );

  const resolveEmail = useCallback(async () => {
    const resolved =
      email ??
      memberSession.email ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!resolved) {
      throw new Error(copy.connectRequired);
    }

    setEmail(resolved);
    return resolved;
  }, [copy.connectRequired, email, memberSession.email]);

  const loadVlogs = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      notice: null,
      status: "loading",
    }));

    let nextMember: MemberRecord | null = memberSession.member;

    try {
      const resolvedEmail = await resolveEmail();
      const encodedEmail = encodeURIComponent(resolvedEmail);
      const encodedWallet = encodeURIComponent(accountAddress);
      const params = new URLSearchParams({
        email: resolvedEmail,
        media: "video",
        page: String(appliedPage),
        pageSize: String(VLOGS_PAGE_SIZE),
        status: appliedStatus,
        walletAddress: accountAddress,
      });

      if (appliedQuery) {
        params.set("q", appliedQuery);
      }

      const postsUrl = `/api/content/posts?${params.toString()}`;
      let response = await fetch(postsUrl, { cache: "no-store" });

      if (response.status === 404) {
        const syncData = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email: resolvedEmail,
          locale,
          referredByCode: referralCode,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!syncData.ok) {
          throw new Error(syncData.error || copy.connectRequired);
        }

        if (syncData.member) {
          nextMember = syncData.member;
          updateMemberSession({
            email: syncData.member.email,
            member: syncData.member,
            walletAddress: accountAddress,
          });
        }

        if (syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        response = await fetch(
          `/api/content/posts?email=${encodedEmail}&walletAddress=${encodedWallet}&media=video&page=${appliedPage}&pageSize=${VLOGS_PAGE_SIZE}&status=${appliedStatus}${appliedQuery ? `&q=${encodeURIComponent(appliedQuery)}` : ""}`,
          { cache: "no-store" },
        );
      }

      const data = await readApiJson<CreatorStudioPostsResponse>(
        response,
        copy.loading,
      );
      nextMember = data.member;

      if (
        data.pageInfo.totalCount > 0 &&
        data.pageInfo.totalPages < appliedPage
      ) {
        router.replace(
          buildManagerHref({
            page: data.pageInfo.totalPages,
          }),
        );
        return;
      }

      setState({
        error: null,
        member: data.member,
        notice: null,
        pageInfo: data.pageInfo,
        posts: data.posts,
        profile: data.profile,
        status: "ready",
        summary: data.summary,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : copy.loading;
      setState((current) => ({
        error:
          errorMessage === "Completed signup is required."
            ? copy.paymentRequired
            : errorMessage,
        member: nextMember,
        notice: null,
        pageInfo: null,
        posts: [],
        profile: current.profile,
        status: "error",
        summary: EMPTY_SUMMARY,
      }));
    }
  }, [
    accountAddress,
    appliedPage,
    appliedQuery,
    appliedStatus,
    buildManagerHref,
    chain.id,
    chain.name,
    copy.connectRequired,
    copy.loading,
    copy.paymentRequired,
    locale,
    referralCode,
    resolveEmail,
    router,
    memberSession.member,
    updateMemberSession,
  ]);

  useEffect(() => {
    if (connection.isResolving) {
      return;
    }

    if (connectionStatus !== "connected" || !accountAddress) {
      setState({
        error: null,
        member: memberSession.member,
        notice: null,
        pageInfo: null,
        posts: [],
        profile: null,
        status: "idle",
        summary: EMPTY_SUMMARY,
      });
      return;
    }

    void loadVlogs();
  }, [
    accountAddress,
    connection.isResolving,
    connectionStatus,
    loadVlogs,
    memberSession.member,
  ]);

  async function resolveMemberEmail() {
    return resolveEmail();
  }

  async function updatePostStatus(
    post: ContentPostRecord,
    nextStatus: "archived" | "published",
  ) {
    if (!accountAddress) {
      return;
    }

    setUpdatingPostId(post.contentId);

    try {
      const resolvedEmail = await resolveMemberEmail();
      const successNotice =
        nextStatus === "published"
          ? locale === "ko"
            ? "브이로그가 공개되었습니다."
            : "The vlog has been published."
          : locale === "ko"
            ? "브이로그가 보관되었습니다."
            : "The vlog has been archived.";
      const response = await fetch(`/api/content/posts/${post.contentId}`, {
        body: JSON.stringify({
          email: resolvedEmail,
          status: nextStatus,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      await readApiJson<ContentPostMutationResponse>(response, copy.loading);
      await loadVlogs();
      setState((current) => ({
        ...current,
        error: null,
        notice: successNotice,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.loading,
        notice: null,
      }));
    } finally {
      setUpdatingPostId(null);
    }
  }

  const isInitialLoading =
    state.status === "loading" &&
    !state.pageInfo &&
    state.posts.length === 0 &&
    !state.error;
  const filterItems = [
    {
      count: state.summary.all,
      key: "all" as const,
      label: copy.labels.all,
    },
    {
      count: state.summary.published,
      key: "published" as const,
      label: copy.labels.published,
    },
    {
      count: state.summary.draft,
      key: "draft" as const,
      label: copy.labels.draft,
    },
    {
      count: state.summary.archived,
      key: "archived" as const,
      label: copy.labels.archived,
    },
  ];

  function renderBlockedState() {
    if (connection.isResolving) {
      return <MessagePanel>{copy.loading}</MessagePanel>;
    }

    if (connection.isDisconnected) {
      return (
        <MessagePanel>
          {copy.connectRequired}
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
            href={connectHref}
          >
            <WalletCards className="size-4" />
            {copy.actions.connect}
          </Link>
        </MessagePanel>
      );
    }

    const signupRequired =
      state.error &&
      (state.error === copy.paymentRequired ||
        (state.member ? state.member.status !== "completed" : false));

    if (signupRequired) {
      return (
        <MessagePanel tone="error">
          {state.error || copy.paymentRequired}
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
            href={activateHref}
          >
            <ShieldCheck className="size-4" />
            {locale === "ko" ? "가입 완료하기" : "Complete signup"}
          </Link>
        </MessagePanel>
      );
    }

    return null;
  }

  const blockedState = renderBlockedState();

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="px-4 pb-8 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] transition hover:bg-white/[0.08]"
              href={studioHref}
              title={copy.actions.back}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link
              className="flex min-w-0 items-center gap-2"
              href={buildPathWithReferral(`/${locale}/fanletter`, referralCode)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-sm font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden xl:inline-flex"
                locale={locale}
              />
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
              <button
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] transition hover:bg-white/[0.08] disabled:opacity-50"
                disabled={isInitialLoading}
                onClick={() => {
                  void loadVlogs();
                }}
                title={copy.actions.refresh}
                type="button"
              >
                <RefreshCw
                  className={`size-5 ${isInitialLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </header>

          <div className="mt-4 flex xl:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-end lg:py-14">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/62">
                {copy.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#6cff89]"
                  href={createHref}
                >
                  <Plus className="size-4" />
                  {copy.actions.create}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-4 text-sm font-semibold !text-white transition hover:bg-white/[0.08]"
                  href={feedHref}
                >
                  <Eye className="size-4" />
                  {copy.actions.feed}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-4 text-sm font-semibold !text-white transition hover:bg-white/[0.08]"
                  href={channelsHref}
                >
                  <Sparkles className="size-4" />
                  {copy.actions.channels}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric
                label={copy.labels.all}
                loading={isInitialLoading}
                value={formatNumber(state.summary.all, locale)}
              />
              <HeroMetric
                label={copy.labels.published}
                loading={isInitialLoading}
                value={formatNumber(state.summary.published, locale)}
              />
              <HeroMetric
                label={copy.labels.draft}
                loading={isInitialLoading}
                value={formatNumber(state.summary.draft, locale)}
              />
              <HeroMetric
                label={copy.labels.archived}
                loading={isInitialLoading}
                value={formatNumber(state.summary.archived, locale)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-8 text-black sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_42px_rgba(8,18,12,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
                  {copy.labels.status}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                  {state.profile?.displayName || copy.title}
                </h2>
              </div>
              <span className="flex size-11 items-center justify-center rounded-lg bg-black text-white">
                <Clapperboard className="size-5" />
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              <SideMetric
                Icon={Video}
                label={copy.labels.results}
                loading={isInitialLoading}
                value={formatNumber(state.summary.all, locale)}
              />
              <SideMetric
                Icon={ShieldCheck}
                label={copy.labels.published}
                loading={isInitialLoading}
                value={formatNumber(state.summary.published, locale)}
              />
              <SideMetric
                Icon={Archive}
                label={copy.labels.archived}
                loading={isInitialLoading}
                value={formatNumber(state.summary.archived, locale)}
              />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
                    {copy.labels.results}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                    {getStatusLabel(copy, appliedStatus)}
                  </h2>
                </div>
                {state.notice ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#44f26e]/40 bg-[#44f26e]/12 px-3 py-2 text-sm font-semibold text-[#0c5f24]">
                    <Check className="size-4" />
                    <span>{state.notice}</span>
                  </div>
                ) : null}
              </div>

              <form
                className="mt-5 flex flex-col gap-3 md:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  router.replace(
                    buildManagerHref({
                      page: 1,
                      query: searchInput.trim(),
                    }),
                  );
                }}
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{copy.actions.search}</span>
                  <div className="flex h-12 items-center gap-3 rounded-full border border-black/10 bg-[#f6f8f4] px-4">
                    <Search className="size-4 text-black/36" />
                    <input
                      className="w-full min-w-0 border-0 bg-transparent text-sm font-medium text-black outline-none placeholder:text-black/36"
                      onChange={(event) => {
                        setSearchInput(event.target.value);
                      }}
                      placeholder={copy.searchPlaceholder}
                      value={searchInput}
                    />
                  </div>
                </label>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/82"
                  type="submit"
                >
                  <Search className="size-4" />
                  {copy.actions.search}
                </button>
              </form>

              <div className="mt-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                {filterItems.map((item) => (
                  <Link
                    className={`inline-flex min-h-11 items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                      appliedStatus === item.key
                        ? "border-black bg-black !text-white"
                        : "border-black/10 bg-white text-black hover:border-black/20 hover:bg-[#f6f8f4]"
                    }`}
                    href={buildManagerHref({
                      page: 1,
                      status: item.key,
                    })}
                    key={item.key}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[0.72rem] ${
                        appliedStatus === item.key
                          ? "bg-white text-black"
                          : "bg-black/[0.06] text-black/62"
                      }`}
                    >
                      {formatNumber(item.count, locale)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {blockedState ? (
              <div className="mt-5">{blockedState}</div>
            ) : isInitialLoading ? (
              <VlogsLoadingSkeleton copy={copy} />
            ) : state.error ? (
              <div className="mt-5">
                <MessagePanel tone="error">{state.error}</MessagePanel>
              </div>
            ) : state.posts.length === 0 ? (
              <div className="mt-5">
                <MessagePanel>
                  {appliedQuery || appliedStatus !== "all" ? (
                    copy.noMatching
                  ) : (
                    <>
                      <span className="block text-lg font-semibold">
                        {copy.emptyTitle}
                      </span>
                      <span className="mt-2 block">{copy.emptyBody}</span>
                    </>
                  )}
                </MessagePanel>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {state.posts.map((post) => (
                  <VlogManagerCard
                    copy={copy}
                    currentManagerHref={currentManagerHref}
                    isUpdating={updatingPostId === post.contentId}
                    key={post.contentId}
                    locale={locale}
                    onArchive={() => {
                      void updatePostStatus(post, "archived");
                    }}
                    onPublish={() => {
                      void updatePostStatus(post, "published");
                    }}
                    post={post}
                    referralCode={referralCode}
                  />
                ))}

                {state.pageInfo ? (
                  <div className="flex flex-col gap-3 border-t border-black/10 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-black/50">
                      {formatNumber(state.pageInfo.totalCount, locale)}{" "}
                      {copy.labels.results} · {copy.labels.page}{" "}
                      {state.pageInfo.page}/{state.pageInfo.totalPages}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {state.pageInfo.hasPreviousPage ? (
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
                          href={buildManagerHref({
                            page: state.pageInfo.page - 1,
                          })}
                        >
                          <ArrowLeft className="size-4" />
                          {copy.actions.previous}
                        </Link>
                      ) : null}
                      {state.pageInfo.hasNextPage ? (
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
                          href={buildManagerHref({
                            page: state.pageInfo.page + 1,
                          })}
                        >
                          {copy.actions.next}
                          <ArrowRight className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({
  label,
  loading,
  value,
}: {
  label: string;
  loading: boolean;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/42">
        {label}
      </p>
      {loading ? (
        <div className="mt-4 h-8 w-16 rounded-full bg-white/10 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-normal text-white">
          {value}
        </p>
      )}
    </div>
  );
}

function SideMetric({
  Icon,
  label,
  loading,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  loading: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-[#f6f8f4] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#16702e]">
          <Icon className="size-4" />
        </span>
        <p className="truncate text-sm font-semibold text-black/58">{label}</p>
      </div>
      {loading ? (
        <div className="h-6 w-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
      ) : (
        <p className="text-xl font-semibold tracking-normal">{value}</p>
      )}
    </div>
  );
}

function VlogManagerCard({
  copy,
  currentManagerHref,
  isUpdating,
  locale,
  onArchive,
  onPublish,
  post,
  referralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  currentManagerHref: string;
  isUpdating: boolean;
  locale: Locale;
  onArchive: () => void;
  onPublish: () => void;
  post: ContentPostRecord;
  referralCode: string | null;
}) {
  const videoUrl = getPostVideoUrl(post);
  const detailHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/content/${post.contentId}`,
      referralCode,
    ),
    {
      returnTo: currentManagerHref,
    },
  );

  return (
    <article className="grid overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_42px_rgba(8,18,12,0.06)] md:grid-cols-[12rem_minmax(0,1fr)]">
      <div className="relative min-h-[16rem] bg-black md:min-h-full">
        {videoUrl ? (
          <video
            autoPlay
            className="absolute inset-0 h-full w-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
            src={videoUrl}
          />
        ) : (
          <div className="flex h-full min-h-[16rem] items-center justify-center bg-black text-white/40">
            <Video className="size-9" />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-black/74 px-3 text-xs font-semibold text-white backdrop-blur">
          <Clapperboard className="size-3.5" />
          {copy.labels.results}
        </span>
      </div>

      <div className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={post.status}>
            {getStatusLabel(copy, post.status)}
          </StatusPill>
          <StatusPill status={post.priceType}>{getPriceLabel(copy, post)}</StatusPill>
        </div>
        <h3 className="mt-3 text-xl font-semibold tracking-normal text-black">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-black/58">
          {post.summary}
        </p>
        <div className="mt-4 grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/38 sm:grid-cols-2">
          <span>
            {copy.labels.updated} ·{" "}
            {formatDateLabel(locale, post.updatedAt || post.createdAt)}
          </span>
          <span>
            {post.publishedAt
              ? `${copy.labels.published} · ${formatDateLabel(locale, post.publishedAt)}`
              : getStatusLabel(copy, post.status)}
          </span>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
            href={detailHref}
          >
            <Eye className="size-4" />
            {copy.actions.detail}
          </Link>
          {post.status !== "published" ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-3 text-sm font-semibold text-white transition hover:bg-black/82 disabled:opacity-50"
              disabled={isUpdating}
              onClick={onPublish}
              type="button"
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {copy.actions.publish}
            </button>
          ) : null}
          {post.status !== "archived" ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4] disabled:opacity-50"
              disabled={isUpdating}
              onClick={onArchive}
              type="button"
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Archive className="size-4" />
              )}
              {copy.actions.archive}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatusPill({
  children,
  status,
}: {
  children: ReactNode;
  status: string;
}) {
  const className =
    status === "published"
      ? "border-[#44f26e]/40 bg-[#44f26e]/12 text-[#0c5f24]"
      : status === "draft"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "archived"
          ? "border-black/10 bg-black/[0.06] text-black/54"
          : "border-black/10 bg-white text-black/58";

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function VlogsLoadingSkeleton({
  copy,
}: {
  copy: ReturnType<typeof getCopy>;
}) {
  return (
    <div className="mt-5 grid gap-3">
      <MessagePanel>{copy.loading}</MessagePanel>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="grid overflow-hidden rounded-lg border border-black/10 bg-white md:grid-cols-[12rem_minmax(0,1fr)]"
          key={index}
        >
          <div className="min-h-[16rem] bg-black/10 motion-safe:animate-pulse" />
          <div className="space-y-4 p-5">
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-8 w-20 rounded-full bg-black/10 motion-safe:animate-pulse" />
            </div>
            <div className="h-7 w-4/5 rounded-full bg-black/10 motion-safe:animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-4 w-2/3 rounded-full bg-black/10 motion-safe:animate-pulse" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="h-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
              <div className="h-10 rounded-full bg-black/10 motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagePanel({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={`rounded-lg border p-5 text-sm font-medium leading-6 ${
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-black/10 bg-white text-black/58"
      }`}
    >
      {children}
    </div>
  );
}
