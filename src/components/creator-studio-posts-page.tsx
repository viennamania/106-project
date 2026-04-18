"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LayoutGrid,
  PenSquare,
  RefreshCcw,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { LanguageSwitcher } from "@/components/language-switcher";
import type {
  ContentPostMutationResponse,
  ContentPostRecord,
  CreatorProfileRecord,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import { getContentCopy } from "@/lib/content-copy";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";

type PostVisibilityFilter = "all" | "archived" | "draft" | "published";

type PostsPageState = {
  error: string | null;
  member: MemberRecord | null;
  notice: string | null;
  pageInfo: CreatorStudioPostsResponse["pageInfo"] | null;
  posts: ContentPostRecord[];
  profile: CreatorProfileRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  summary: CreatorStudioPostsResponse["summary"];
};

const POSTS_PAGE_SIZE = 24;
const EMPTY_SUMMARY = {
  all: 0,
  archived: 0,
  draft: 0,
  published: 0,
};

function isPostVisibilityFilter(value: string | null): value is PostVisibilityFilter {
  return value === "all" || value === "archived" || value === "draft" || value === "published";
}

function normalizePageValue(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.max(1, Math.floor(parsed));
}

function formatDateLabel(locale: Locale, value: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function CreatorStudioPostsPage({
  dictionary,
  locale,
  referralCode = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const studioHomeHref = buildPathWithReferral(
    `/${locale}/creator/studio`,
    referralCode,
  );
  const profileHref = buildPathWithReferral(
    `/${locale}/creator/studio/profile`,
    referralCode,
  );
  const newPostHref = buildPathWithReferral(
    `/${locale}/creator/studio/new`,
    referralCode,
  );
  const postsManagerBaseHref = buildPathWithReferral(
    `/${locale}/creator/studio/posts`,
    referralCode,
  );
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const appliedQuery = searchParams.get("q")?.trim() ?? "";
  const appliedStatus = isPostVisibilityFilter(searchParams.get("status"))
    ? (searchParams.get("status") as PostVisibilityFilter)
    : "all";
  const appliedPage = normalizePageValue(searchParams.get("page"));
  const [searchInput, setSearchInput] = useState(appliedQuery);
  const [state, setState] = useState<PostsPageState>({
    error: null,
    member: null,
    notice: null,
    pageInfo: null,
    posts: [],
    profile: null,
    status: "idle",
    summary: EMPTY_SUMMARY,
  });
  const isDisconnected = connectionStatus !== "connected" || !accountAddress;
  const canUseWorkspace = !isDisconnected && state.member?.status === "completed";

  useEffect(() => {
    setSearchInput(appliedQuery);
  }, [appliedQuery]);

  const buildPostsHref = useCallback(
    (options?: {
      page?: number;
      query?: string;
      status?: PostVisibilityFilter;
    }) => {
      const page = options?.page ?? appliedPage;
      const query = options?.query ?? appliedQuery;
      const status = options?.status ?? appliedStatus;

      return setPathSearchParams(postsManagerBaseHref, {
        page: page > 1 ? String(page) : null,
        q: query || null,
        status: status !== "all" ? status : null,
      });
    },
    [appliedPage, appliedQuery, appliedStatus, postsManagerBaseHref],
  );

  const currentManagerHref = useMemo(() => {
    return buildPostsHref();
  }, [buildPostsHref]);

  const loadPosts = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      notice: null,
      status: "loading",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      const syncResponse = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const syncData = (await syncResponse.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!syncResponse.ok) {
        throw new Error(
          "error" in syncData && syncData.error
            ? syncData.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      const member = "member" in syncData ? syncData.member : null;

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      if ("validationError" in syncData && syncData.validationError) {
        setState({
          error: syncData.validationError,
          member,
          notice: null,
          pageInfo: null,
          posts: [],
          profile: null,
          status: "ready",
          summary: EMPTY_SUMMARY,
        });
        return;
      }

      if (member.status !== "completed") {
        setState({
          error: contentCopy.messages.paymentRequired,
          member,
          notice: null,
          pageInfo: null,
          posts: [],
          profile: null,
          status: "ready",
          summary: EMPTY_SUMMARY,
        });
        return;
      }

      const params = new URLSearchParams({
        email,
        page: String(appliedPage),
        pageSize: String(POSTS_PAGE_SIZE),
      });

      if (appliedQuery) {
        params.set("q", appliedQuery);
      }

      if (appliedStatus !== "all") {
        params.set("status", appliedStatus);
      }

      const response = await fetch(`/api/content/posts?${params.toString()}`);
      const data = (await response.json()) as CreatorStudioPostsResponse | {
        error?: string;
      };

      if (!response.ok || !("posts" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      if (
        data.pageInfo.totalCount > 0 &&
        data.pageInfo.totalPages < appliedPage &&
        pathname
      ) {
        router.replace(
          buildPostsHref({
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
      setState({
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        member: null,
        notice: null,
        pageInfo: null,
        posts: [],
        profile: null,
        status: "error",
        summary: EMPTY_SUMMARY,
      });
    }
  }, [
    accountAddress,
    appliedPage,
    appliedQuery,
    appliedStatus,
    buildPostsHref,
    chain.id,
    chain.name,
    contentCopy.messages.memberMissing,
    contentCopy.messages.paymentRequired,
    contentCopy.messages.studioLoadFailed,
    dictionary.member.errors.missingEmail,
    locale,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (connectionStatus !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        error: null,
        member: null,
        notice: null,
        pageInfo: null,
        posts: [],
        profile: null,
        status: "idle",
        summary: EMPTY_SUMMARY,
      });
      return;
    }

    void loadPosts();
  }, [accountAddress, connectionStatus, loadPosts]);

  async function resolveMemberEmail() {
    const email = await getUserEmail({ client: thirdwebClient });

    if (!email) {
      throw new Error(dictionary.member.errors.missingEmail);
    }

    return email;
  }

  async function updatePostStatus(
    post: ContentPostRecord,
    nextStatus: "archived" | "published",
  ) {
    try {
      const email = await resolveMemberEmail();
      const response = await fetch(`/api/content/posts/${post.contentId}`, {
        body: JSON.stringify({
          email,
          status: nextStatus,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = (await response.json()) as ContentPostMutationResponse | {
        error?: string;
      };

      if (!response.ok || !("content" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice:
          nextStatus === "published"
            ? contentCopy.messages.publishSuccess
            : null,
      }));
      await loadPosts();
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    }
  }

  function renderBlockedState() {
    if (isDisconnected) {
      return <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>;
    }

    if (state.status === "loading" && !state.member) {
      return <MessageCard>{contentCopy.actions.refresh}...</MessageCard>;
    }

    if (state.error && state.member?.status !== "completed") {
      return (
        <MessageCard tone="error">
          {state.error}
          <span className="mt-3 block">
            <Link
              className="font-semibold text-slate-950 underline"
              href={activateHref}
            >
              {dictionary.referralsPage.actions.completeSignup}
            </Link>
          </span>
        </MessageCard>
      );
    }

    if (state.error && !state.member) {
      return <MessageCard tone="error">{state.error}</MessageCard>;
    }

    return null;
  }

  const blockedState = renderBlockedState();
  const filterItems = [
    {
      count: state.summary.all,
      key: "all" as const,
      label: contentCopy.labels.allPosts,
    },
    {
      count: state.summary.published,
      key: "published" as const,
      label: contentCopy.labels.published,
    },
    {
      count: state.summary.draft,
      key: "draft" as const,
      label: contentCopy.labels.draft,
    },
    {
      count: state.summary.archived,
      key: "archived" as const,
      label: contentCopy.labels.archived,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            className="inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href={studioHomeHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="space-y-1">
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                {contentCopy.actions.managePosts}
              </h1>
              <p className="text-sm text-slate-600">
                {contentCopy.page.postsDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <LanguageSwitcher
            label={dictionary.common.languageLabel}
            locale={locale}
          />
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            href={newPostHref}
          >
            {contentCopy.actions.createPost}
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => {
              void loadPosts();
            }}
            type="button"
          >
            <RefreshCcw className="size-4" />
            {contentCopy.actions.refresh}
          </button>
          {connectionStatus === "connected" && accountAddress ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => {
                if (wallet) {
                  disconnect(wallet);
                }
              }}
              type="button"
            >
              {contentCopy.actions.disconnect}
            </button>
          ) : null}
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {[
          {
            href: studioHomeHref,
            isActive: false,
            label: contentCopy.labels.studioHome,
          },
          {
            href: profileHref,
            isActive: false,
            label: contentCopy.labels.creatorSettings,
          },
          {
            href: newPostHref,
            isActive: false,
            label: contentCopy.actions.createPost,
          },
          {
            href: postsManagerBaseHref,
            isActive: true,
            label: contentCopy.actions.managePosts,
          },
        ].map((tab) => (
          <Link
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
              tab.isActive
                ? "border border-slate-950 bg-slate-950 !text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)] [text-shadow:0_1px_12px_rgba(255,255,255,0.12)]"
                : "border border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
            }`}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-5">
          <div className="glass-card rounded-[30px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {contentCopy.actions.managePosts}
                </h2>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <LayoutGrid className="size-5" />
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isDisconnected
                ? contentCopy.messages.connectRequired
                : state.status === "loading"
                  ? `${contentCopy.actions.refresh}...`
                  : contentCopy.page.postsDescription}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <WorkspaceMetric
                label={contentCopy.labels.posts}
                value={String(state.summary.all)}
              />
              <WorkspaceMetric
                label={contentCopy.labels.published}
                value={String(state.summary.published)}
              />
              <WorkspaceMetric
                label={contentCopy.labels.draft}
                value={String(state.summary.draft)}
              />
              <WorkspaceMetric
                label={contentCopy.labels.author}
                value={state.profile?.displayName || "-"}
              />
            </div>

            {state.pageInfo ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status={`${state.pageInfo.totalCount} posts`} />
                <StatusBadge
                  status={`page ${state.pageInfo.page}/${state.pageInfo.totalPages}`}
                />
              </div>
            ) : null}
          </div>

          <div className="glass-card rounded-[30px] p-5">
            <div>
              <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {contentCopy.labels.quickActions}
              </h2>
            </div>
            <div className="mt-4 grid gap-3">
              <WorkspaceLaunchCard
                description={contentCopy.page.newDescription}
                disabled={!canUseWorkspace}
                href={newPostHref}
                icon={<PenSquare className="size-5" />}
                title={contentCopy.actions.createPost}
              />
              <WorkspaceLaunchCard
                description={contentCopy.page.profileDescription}
                disabled={!canUseWorkspace}
                href={profileHref}
                icon={<UserRound className="size-5" />}
                title={contentCopy.labels.creatorSettings}
              />
              <WorkspaceLaunchCard
                description={contentCopy.page.feedDescription}
                disabled={!canUseWorkspace}
                href={feedHref}
                icon={<Sparkles className="size-5" />}
                title={contentCopy.entry.viewerTitle}
              />
              <WorkspaceLaunchCard
                description={contentCopy.page.studioDescription}
                disabled={!canUseWorkspace}
                href={homeHref}
                icon={<ArrowLeft className="size-5" />}
                title={contentCopy.actions.backHome}
              />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[30px] p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {contentCopy.labels.posts}
                </h2>
              </div>
              {state.notice ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                  <Check className="size-4" />
                  <span>{state.notice}</span>
                </div>
              ) : null}
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                router.replace(
                  buildPostsHref({
                    page: 1,
                    query: searchInput.trim(),
                  }),
                );
              }}
            >
              <label className="flex-1">
                <span className="sr-only">{contentCopy.fields.searchPosts}</span>
                <div className="flex h-12 items-center gap-3 rounded-full border border-slate-200 bg-white px-4">
                  <Search className="size-4 text-slate-400" />
                  <input
                    className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                    }}
                    placeholder={contentCopy.messages.searchPlaceholder}
                    value={searchInput}
                  />
                </div>
              </label>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
                type="submit"
              >
                <Search className="size-4" />
                {contentCopy.fields.searchPosts}
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {filterItems.map((item) => (
                <Link
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    appliedStatus === item.key
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  href={buildPostsHref({
                    page: 1,
                    status: item.key,
                  })}
                  key={item.key}
                >
                  <span>{item.label}</span>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[0.7rem] ${
                      appliedStatus === item.key ? "bg-white/15" : "bg-slate-100"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {blockedState ? (
            blockedState
          ) : state.status === "loading" ? (
            <MessageCard>{contentCopy.actions.refresh}...</MessageCard>
          ) : state.error ? (
            <MessageCard tone="error">{state.error}</MessageCard>
          ) : state.posts.length === 0 ? (
            <MessageCard>{contentCopy.messages.noMatchingPosts}</MessageCard>
          ) : (
            <div className="mt-5 space-y-3">
              {state.posts.map((post) => (
                <article
                  className="rounded-[24px] border border-white/80 bg-white/90 p-4"
                  key={post.contentId}
                >
                  {post.coverImageUrl ? (
                    <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-900/90">
                      <div
                        className="h-40 w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${post.coverImageUrl})`,
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={post.status} />
                    <StatusBadge status={post.priceType} />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {post.summary}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {formatDateLabel(locale, post.updatedAt || post.createdAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                      href={setPathSearchParams(
                        buildPathWithReferral(
                          `/${locale}/content/${post.contentId}`,
                          referralCode,
                        ),
                        {
                          returnTo: currentManagerHref,
                        },
                      )}
                    >
                      {contentCopy.actions.viewDetail}
                    </Link>
                    {post.status !== "published" ? (
                      <button
                        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
                        onClick={() => {
                          void updatePostStatus(post, "published");
                        }}
                        type="button"
                      >
                        {contentCopy.actions.publish}
                      </button>
                    ) : null}
                    {post.status !== "archived" ? (
                      <button
                        className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                        onClick={() => {
                          void updatePostStatus(post, "archived");
                        }}
                        type="button"
                      >
                        {contentCopy.labels.archived}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}

              {state.pageInfo ? (
                <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    {state.pageInfo.totalCount} {contentCopy.labels.posts} ·{" "}
                    {state.pageInfo.page}/{state.pageInfo.totalPages}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {state.pageInfo.hasPreviousPage ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                        href={buildPostsHref({
                          page: state.pageInfo.page - 1,
                        })}
                      >
                        <ArrowLeft className="size-4" />
                        {contentCopy.actions.previousPage}
                      </Link>
                    ) : null}
                    {state.pageInfo.hasNextPage ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                        href={buildPostsHref({
                          page: state.pageInfo.page + 1,
                        })}
                      >
                        {contentCopy.actions.nextPage}
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function WorkspaceLaunchCard({
  description,
  disabled,
  href,
  icon,
  title,
}: {
  description: string;
  disabled?: boolean;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  const body = (
    <div className="glass-card flex min-h-[150px] flex-col justify-between rounded-[28px] p-5 transition hover:translate-y-[-1px] hover:border-white/85 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex size-14 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
          {icon}
        </div>
        <div className="flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm">
          <ArrowRight className="size-5" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );

  if (disabled) {
    return <div className="opacity-60">{body}</div>;
  }

  return (
    <Link className="block" href={href}>
      {body}
    </Link>
  );
}

function WorkspaceMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "published" || status === "completed"
      ? "Published"
      : status === "draft"
        ? "Draft"
        : status === "failed"
          ? "Failed"
          : status === "running"
            ? "Running"
            : status === "queued"
              ? "Queued"
              : status === "free"
                ? "Free"
                : status === "archived"
                  ? "Archived"
                  : status;
  const className =
    status === "failed"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "running"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "queued"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] ${className}`}
    >
      {label}
    </span>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900"
          : "mt-4 rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 text-sm leading-6 text-slate-600"
      }
    >
      {children}
    </div>
  );
}
