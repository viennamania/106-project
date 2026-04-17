"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, PenSquare, RefreshCcw } from "lucide-react";
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
import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentPostMutationResponse,
  ContentPostRecord,
  CreatorProfileResponse,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
} from "@/lib/landing-branding";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import type { Dictionary, Locale } from "@/lib/i18n";

type StudioState = {
  error: string | null;
  member: MemberRecord | null;
  notice: string | null;
  posts: ContentPostRecord[];
  profile: {
    displayName: string;
    heroImageUrl: string;
    intro: string;
    payoutWalletAddress: string;
  };
  status: "idle" | "loading" | "ready" | "error";
};

const EMPTY_PROFILE = {
  displayName: "",
  heroImageUrl: "",
  intro: "",
  payoutWalletAddress: "",
};

const EMPTY_POST_FORM = {
  body: "",
  summary: "",
  title: "",
};

export function CreatorContentStudioPage({
  dictionary,
  locale,
  referralCode = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const [state, setState] = useState<StudioState>({
    error: null,
    member: null,
    notice: null,
    posts: [],
    profile: EMPTY_PROFILE,
    status: "idle",
  });
  const [postForm, setPostForm] = useState(EMPTY_POST_FORM);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const isDisconnected = status !== "connected" || !accountAddress;

  const publishedCount = useMemo(() => {
    return state.posts.filter((post) => post.status === "published").length;
  }, [state.posts]);

  const loadStudio = useCallback(async () => {
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
          posts: [],
          profile: EMPTY_PROFILE,
          status: "ready",
        });
        return;
      }

      if (member.status !== "completed") {
        setState({
          error: contentCopy.messages.paymentRequired,
          member,
          notice: null,
          posts: [],
          profile: EMPTY_PROFILE,
          status: "ready",
        });
        return;
      }

      const [profileResponse, postsResponse] = await Promise.all([
        fetch(`/api/content/profile?email=${encodeURIComponent(email)}`),
        fetch(`/api/content/posts?email=${encodeURIComponent(email)}`),
      ]);
      const profileData = (await profileResponse.json()) as CreatorProfileResponse | {
        error?: string;
      };
      const postsData = (await postsResponse.json()) as CreatorStudioPostsResponse | {
        error?: string;
      };

      if (
        !profileResponse.ok ||
        !("profile" in profileData) ||
        !postsResponse.ok ||
        !("posts" in postsData)
      ) {
        throw new Error(
          "error" in postsData && postsData.error
            ? postsData.error
            : "error" in profileData && profileData.error
              ? profileData.error
              : contentCopy.messages.studioLoadFailed,
        );
      }

      setState({
        error: null,
        member: postsData.member,
        notice: null,
        posts: postsData.posts,
        profile: {
          displayName: profileData.profile.displayName,
          heroImageUrl: profileData.profile.heroImageUrl ?? "",
          intro: profileData.profile.intro,
          payoutWalletAddress: profileData.profile.payoutWalletAddress ?? "",
        },
        status: "ready",
      });
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        member: null,
        notice: null,
        posts: [],
        profile: EMPTY_PROFILE,
        status: "error",
      });
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    contentCopy.messages.memberMissing,
    contentCopy.messages.paymentRequired,
    contentCopy.messages.studioLoadFailed,
    dictionary.member.errors.missingEmail,
    locale,
  ]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        error: null,
        member: null,
        notice: null,
        posts: [],
        profile: EMPTY_PROFILE,
        status: "idle",
      });
      return;
    }

    void loadStudio();
  }, [accountAddress, loadStudio, status]);

  async function resolveMemberEmail() {
    const email = await getUserEmail({ client: thirdwebClient });

    if (!email) {
      throw new Error(dictionary.member.errors.missingEmail);
    }

    return email;
  }

  async function saveProfile() {
    try {
      setIsSavingProfile(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile", {
        body: JSON.stringify({
          displayName: state.profile.displayName,
          email,
          heroImageUrl: state.profile.heroImageUrl || null,
          intro: state.profile.intro,
          payoutWalletAddress: state.profile.payoutWalletAddress || null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as CreatorProfileResponse | {
        error?: string;
      };

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.profileSaved,
        profile: {
          displayName: data.profile.displayName,
          heroImageUrl: data.profile.heroImageUrl ?? "",
          intro: data.profile.intro,
          payoutWalletAddress: data.profile.payoutWalletAddress ?? "",
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function createPost(statusToSave: "draft" | "published") {
    try {
      setIsSavingPost(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/posts", {
        body: JSON.stringify({
          body: postForm.body,
          email,
          priceType: "free",
          status: statusToSave,
          summary: postForm.summary,
          title: postForm.title,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
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

      setPostForm(EMPTY_POST_FORM);
      setState((current) => ({
        ...current,
        error: null,
        notice:
          statusToSave === "published"
            ? contentCopy.messages.publishSuccess
            : contentCopy.messages.saveDraftSuccess,
        posts: [data.content, ...current.posts],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    } finally {
      setIsSavingPost(false);
    }
  }

  async function updatePostStatus(
    post: ContentPostRecord,
    nextStatus: "published" | "archived",
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
            : contentCopy.messages.saveDraftSuccess,
        posts: current.posts.map((currentPost) =>
          currentPost.contentId === data.content.contentId
            ? data.content
            : currentPost,
        ),
      }));
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
            href={homeHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="space-y-1">
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                {contentCopy.page.studioTitle}
              </h1>
              <p className="text-sm text-slate-600">
                {contentCopy.page.studioDescription}
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
            href={feedHref}
          >
            {contentCopy.actions.openFeed}
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => {
              void loadStudio();
            }}
            type="button"
          >
            <RefreshCcw className="size-4" />
            {contentCopy.actions.refresh}
          </button>
          {status === "connected" && accountAddress ? (
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

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="glass-card rounded-[30px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <PenSquare className="size-5" />
              </div>
              <div>
                <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {contentCopy.labels.creatorProfile}
                </h2>
              </div>
            </div>

            {isDisconnected ? (
              <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
            ) : state.error && state.member?.status !== "completed" ? (
              <MessageCard tone="error">
                {state.error}
                <span className="mt-3 block">
                  <Link className="font-semibold text-slate-950 underline" href={activateHref}>
                    {dictionary.referralsPage.actions.completeSignup}
                  </Link>
                </span>
              </MessageCard>
            ) : (
              <div className="mt-5 space-y-4">
                <InputField
                  hint={contentCopy.hints.displayName ?? undefined}
                  label={contentCopy.fields.displayName}
                  onChange={(value) => {
                    setState((current) => ({
                      ...current,
                      profile: {
                        ...current.profile,
                        displayName: value,
                      },
                    }));
                  }}
                  value={state.profile.displayName}
                />
                <TextAreaField
                  hint={contentCopy.hints.intro}
                  label={contentCopy.fields.intro}
                  onChange={(value) => {
                    setState((current) => ({
                      ...current,
                      profile: {
                        ...current.profile,
                        intro: value,
                      },
                    }));
                  }}
                  rows={4}
                  value={state.profile.intro}
                />
                <InputField
                  hint={contentCopy.hints.payoutWalletAddress}
                  label={contentCopy.fields.payoutWalletAddress}
                  onChange={(value) => {
                    setState((current) => ({
                      ...current,
                      profile: {
                        ...current.profile,
                        payoutWalletAddress: value,
                      },
                    }));
                  }}
                  value={state.profile.payoutWalletAddress}
                />
                <InputField
                  label="Hero image URL"
                  onChange={(value) => {
                    setState((current) => ({
                      ...current,
                      profile: {
                        ...current.profile,
                        heroImageUrl: value,
                      },
                    }));
                  }}
                  value={state.profile.heroImageUrl}
                />
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingProfile || isDisconnected}
                  onClick={() => {
                    void saveProfile();
                  }}
                  type="button"
                >
                  {isSavingProfile
                    ? `${contentCopy.actions.saveProfile}...`
                    : contentCopy.actions.saveProfile}
                </button>
              </div>
            )}
          </div>

          <div className="glass-card rounded-[30px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {contentCopy.labels.posts}
                </h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900">
                {publishedCount} {contentCopy.labels.published}
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {contentCopy.labels.studioNotice}
            </p>

            <div className="mt-5 space-y-4">
              <InputField
                hint={contentCopy.hints.title}
                label={contentCopy.fields.title}
                onChange={(value) => {
                  setPostForm((current) => ({
                    ...current,
                    title: value,
                  }));
                }}
                value={postForm.title}
              />
              <TextAreaField
                hint={contentCopy.hints.summary}
                label={contentCopy.fields.summary}
                onChange={(value) => {
                  setPostForm((current) => ({
                    ...current,
                    summary: value,
                  }));
                }}
                rows={3}
                value={postForm.summary}
              />
              <TextAreaField
                hint={contentCopy.hints.body}
                label={contentCopy.fields.body}
                onChange={(value) => {
                  setPostForm((current) => ({
                    ...current,
                    body: value,
                  }));
                }}
                rows={7}
                value={postForm.body}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingPost || isDisconnected}
                  onClick={() => {
                    void createPost("draft");
                  }}
                  type="button"
                >
                  {contentCopy.actions.saveDraft}
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingPost || isDisconnected}
                  onClick={() => {
                    void createPost("published");
                  }}
                  type="button"
                >
                  {contentCopy.actions.publish}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[30px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {contentCopy.labels.recentPosts}
              </h2>
            </div>
            {state.notice ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                <Check className="size-4" />
                {state.notice}
              </div>
            ) : null}
          </div>

          {isDisconnected ? (
            <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
          ) : state.status === "loading" ? (
            <MessageCard>{contentCopy.actions.refresh}...</MessageCard>
          ) : state.error && state.posts.length === 0 ? (
            <MessageCard tone="error">{state.error}</MessageCard>
          ) : state.posts.length === 0 ? (
            <MessageCard>{contentCopy.labels.feedEmpty}</MessageCard>
          ) : (
            <div className="mt-4 space-y-3">
              {state.posts.map((post) => (
                <article
                  className="rounded-[24px] border border-white/80 bg-white/90 p-4"
                  key={post.contentId}
                >
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
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                      href={buildPathWithReferral(
                        `/${locale}/content/${post.contentId}`,
                        referralCode,
                      )}
                    >
                      {contentCopy.actions.viewDetail}
                    </Link>
                    {post.status !== "published" ? (
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
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
                        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                        onClick={() => {
                          void updatePostStatus(post, "archived");
                        }}
                        type="button"
                      >
                        Archive
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function InputField({
  hint,
  label,
  onChange,
  value,
}: {
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <input
        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        value={value}
      />
      {hint ? (
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({
  hint,
  label,
  onChange,
  rows,
  value,
}: {
  hint: string;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <textarea
        className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        rows={rows}
        value={value}
      />
      <span className="mt-2 block text-xs leading-5 text-slate-500">{hint}</span>
    </label>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label = status === "published"
    ? "Published"
    : status === "draft"
      ? "Draft"
      : status === "free"
        ? "Free"
        : status;

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-700">
      {label}
    </span>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
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
