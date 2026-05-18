"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  LayoutGrid,
  Search,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { CreatorStudioMobileNav } from "@/components/creator-studio-mobile-nav";
import {
  CreatorStudioHeader,
  CreatorStudioTabs,
} from "@/components/creator-studio-shell";
import type {
  CreatorStudioPostsLoadResponse,
  ContentPostMutationResponse,
  ContentPostRecord,
  CreatorProfileRecord,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import { getContentCopy } from "@/lib/content-copy";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import { getThirdwebUserEmail, useThirdwebConnectionState } from "@/lib/thirdweb-client";

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
  free: 0,
  paid: 0,
  published: 0,
  statusFilters: {
    all: 0,
    archived: 0,
    draft: 0,
    published: 0,
  },
};

function resolveManagerPostPreviewImage(
  post: Pick<ContentPostRecord, "coverImageUrl" | "contentImageUrls">,
) {
  return post.coverImageUrl ?? post.contentImageUrls[0] ?? null;
}

function resolveManagerPostPreviewVideo(
  post: Pick<ContentPostRecord, "contentVideoUrls">,
) {
  return post.contentVideoUrls[0] ?? null;
}

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
  returnToHref = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const studioHomeHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio`, referralCode),
    { returnTo: returnToHref },
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/profile`, referralCode),
    { returnTo: returnToHref },
  );
  const newPostHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/new`, referralCode),
    { returnTo: returnToHref },
  );
  const postsManagerBaseHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/posts`, referralCode),
    { returnTo: returnToHref },
  );
  const salesManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/sales`, referralCode),
    { returnTo: returnToHref },
  );
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const salesManagerLabel = locale === "ko" ? "판매 관리" : "Sales";
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
  const {
    isDisconnected,
    isResolving: isConnectionResolving,
  } = useThirdwebConnectionState({
    accountAddress,
    status: connectionStatus,
  });

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
      const email = await getThirdwebUserEmail({ client: thirdwebClient });

      if (!email) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      const query = new URLSearchParams({
        email,
        page: String(appliedPage),
        pageSize: String(POSTS_PAGE_SIZE),
        walletAddress: accountAddress,
      });

      if (appliedQuery) {
        query.set("q", appliedQuery);
      }

      if (appliedStatus !== "all") {
        query.set("status", appliedStatus);
      }

      let response = await fetch(`/api/content/posts/load?${query.toString()}`);
      let data = (await response.json()) as CreatorStudioPostsLoadResponse | {
        error?: string;
      };

      if (!response.ok && response.status === 404) {
        response = await fetch("/api/content/posts/load", {
          body: JSON.stringify({
            chainId: chain.id,
            chainName: chain.name ?? "BSC",
            email,
            locale,
            page: appliedPage,
            pageSize: POSTS_PAGE_SIZE,
            q: appliedQuery || null,
            status: appliedStatus !== "all" ? appliedStatus : null,
            syncMode: "light",
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        data = (await response.json()) as CreatorStudioPostsLoadResponse | {
          error?: string;
        };
      }

      if (!response.ok || !("posts" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      const member = data.member;

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      if (data.validationError) {
        setState({
          error: data.validationError,
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

      if (
        data.pageInfo &&
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
        member,
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
    if (isConnectionResolving) {
      return;
    }

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
  }, [accountAddress, connectionStatus, isConnectionResolving, loadPosts]);

  async function resolveMemberEmail() {
    const email = await getThirdwebUserEmail({ client: thirdwebClient });

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
          walletAddress: accountAddress,
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
    if (isConnectionResolving) {
      return <MessageCard>{contentCopy.messages.postsLoading}</MessageCard>;
    }

    if (isDisconnected) {
      return <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>;
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
  const isInitialLoading =
    state.status === "loading" &&
    !state.error &&
    !state.pageInfo &&
    state.posts.length === 0;
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
  const tabs = [
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
    {
      href: salesManagerHref,
      isActive: false,
      label: salesManagerLabel,
    },
  ];

  return (
    <>
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-0 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">

      <CreatorStudioHeader
        backHref={studioHomeHref}
        description={
          isDisconnected
            ? contentCopy.messages.connectRequired
            : isInitialLoading
              ? contentCopy.messages.postsLoading
              : contentCopy.page.postsDescription
        }
        eyebrow={contentCopy.page.studioEyebrow}
        refreshLabel={contentCopy.actions.refresh}
        refreshLoading={isInitialLoading}
        shortcutHref={newPostHref}
        shortcutLabel={contentCopy.actions.createPost}
        stats={[
          {
            label: contentCopy.labels.posts,
            loading: isInitialLoading,
            value: String(state.summary.all),
          },
          {
            label: contentCopy.labels.published,
            loading: isInitialLoading,
            value: String(state.summary.published),
          },
          {
            label: contentCopy.labels.draft,
            loading: isInitialLoading,
            value: String(state.summary.draft),
          },
          {
            label: contentCopy.labels.author,
            loading: isInitialLoading,
            value: state.profile?.displayName || "-",
          },
        ]}
        title={contentCopy.actions.managePosts}
        onRefresh={() => {
          void loadPosts();
        }}
      />

      <CreatorStudioTabs items={tabs} />

      <section className="grid gap-3 sm:gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="order-2 space-y-3 sm:space-y-5 xl:order-1">
          <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] sm:p-5 sm:shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
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
                : isInitialLoading
                  ? contentCopy.messages.postsLoading
                  : contentCopy.page.postsDescription}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <WorkspaceMetric
                label={contentCopy.labels.posts}
                loading={isInitialLoading}
                value={String(state.summary.all)}
              />
              <WorkspaceMetric
                label={contentCopy.labels.published}
                loading={isInitialLoading}
                value={String(state.summary.published)}
              />
              <WorkspaceMetric
                label={contentCopy.labels.draft}
                loading={isInitialLoading}
                value={String(state.summary.draft)}
              />
              <WorkspaceMetric
                label={contentCopy.labels.author}
                loading={isInitialLoading}
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

        </div>

        <div className="order-1 border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] sm:p-5 sm:shadow-[0_24px_60px_rgba(15,23,42,0.08)] xl:order-2">
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
                <div className="flex h-12 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                type="submit"
              >
                <Search className="size-4" />
                {contentCopy.fields.searchPosts}
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {filterItems.map((item) => (
                <Link
                  className={`inline-flex items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    appliedStatus === item.key
                      ? "border-slate-950 bg-slate-950 !text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)]"
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
                      appliedStatus === item.key
                        ? "bg-white text-slate-950"
                        : "bg-slate-100 text-slate-700"
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
          ) : isInitialLoading ? (
            <PostsLoadingSkeleton copy={contentCopy} />
          ) : state.error ? (
            <MessageCard tone="error">{state.error}</MessageCard>
          ) : state.posts.length === 0 ? (
            <MessageCard>{contentCopy.messages.noMatchingPosts}</MessageCard>
          ) : (
            <div className="mt-5 space-y-3">
              {state.posts.map((post) => {
                const previewImageUrl = resolveManagerPostPreviewImage(post);
                const previewVideoUrl = previewImageUrl
                  ? null
                  : resolveManagerPostPreviewVideo(post);
                const hasVideo = post.contentVideoUrls.length > 0;

                return (
                  <article
                    className="overflow-hidden rounded-[26px] border border-white/80 bg-white/94 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
                    key={post.contentId}
                  >
                  {previewImageUrl || previewVideoUrl ? (
                    <div className="relative overflow-hidden border-b border-slate-200/80 bg-slate-900/90">
                      {previewImageUrl ? (
                        <div
                          className="h-44 w-full bg-cover bg-center sm:h-40"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${previewImageUrl})`,
                          }}
                        />
                      ) : (
                        <video
                          autoPlay
                          className="h-44 w-full bg-black object-cover sm:h-40"
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          src={previewVideoUrl ?? undefined}
                        />
                      )}
                      {hasVideo ? (
                        <span className="absolute left-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-950/78 px-3 text-xs font-semibold text-white shadow-sm backdrop-blur">
                          <Film className="size-3.5" />
                          {locale === "ko" ? "동영상" : "Video"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="p-4 sm:p-5">
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
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {formatDateLabel(locale, post.updatedAt || post.createdAt)}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
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
                          className="inline-flex h-10 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
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
                          className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => {
                            void updatePostStatus(post, "archived");
                          }}
                          type="button"
                        >
                          {contentCopy.labels.archived}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  </article>
                );
              })}

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
    <CreatorStudioMobileNav
      active="posts"
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
    </>
  );
}

function WorkspaceMetric({
  label,
  loading = false,
  value,
}: {
  label: string;
  loading?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      {loading ? (
        <div className="mt-4 h-9 w-20 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
      )}
    </div>
  );
}

function PostsLoadingSkeleton({
  copy,
}: {
  copy: ReturnType<typeof getContentCopy>;
}) {
  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-500">
        {copy.messages.postsLoading}
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="overflow-hidden rounded-[26px] border border-white/80 bg-white/94 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
          key={index}
        >
          <div className="h-40 w-full bg-slate-200/80 motion-safe:animate-pulse" />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex gap-2">
              <div className="h-7 w-24 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
              <div className="h-7 w-16 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            </div>
            <div className="h-7 w-4/5 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
              <div className="h-4 w-2/3 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            </div>
            <div className="h-4 w-32 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="h-10 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
              <div className="h-10 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      ))}
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
          ? "mt-4 rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,#fff1f2,#ffe4e6)] px-4 py-4 text-sm leading-6 text-rose-900 shadow-[0_18px_44px_rgba(244,63,94,0.08)]"
          : "mt-4 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      }
    >
      {children}
    </div>
  );
}
