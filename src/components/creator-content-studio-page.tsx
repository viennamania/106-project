"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  PenSquare,
  RefreshCcw,
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
import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentPostGenerateCoverResponse,
  ContentPostMutationResponse,
  ContentPostRecord,
  ContentPostUploadResponse,
  CreatorProfileResponse,
  CreatorProfileUploadResponse,
  CreatorStudioPostsResponse,
} from "@/lib/content";
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

type StudioView = "hub" | "new" | "profile";

const EMPTY_PROFILE = {
  displayName: "",
  heroImageUrl: "",
  intro: "",
  payoutWalletAddress: "",
};

const EMPTY_POST_FORM = {
  body: "",
  coverImageUrl: "",
  summary: "",
  title: "",
};

export function CreatorContentStudioPage({
  dictionary,
  locale,
  referralCode = null,
  view = "hub",
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  view?: StudioView;
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
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const currentStudioHref =
    view === "profile"
      ? profileHref
      : view === "new"
        ? newPostHref
        : studioHomeHref;
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
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isUploadingPostImage, setIsUploadingPostImage] = useState(false);
  const [isGeneratingPostImage, setIsGeneratingPostImage] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const isDisconnected = status !== "connected" || !accountAddress;
  const backHref = view === "hub" ? homeHref : studioHomeHref;
  const pageTitle =
    view === "profile"
      ? contentCopy.labels.creatorProfile
      : view === "new"
        ? contentCopy.actions.createPost
        : contentCopy.page.studioTitle;
  const pageDescription =
    view === "profile"
      ? contentCopy.hints.intro
      : view === "new"
        ? contentCopy.labels.studioNotice
        : contentCopy.page.studioDescription;

  const publishedCount = useMemo(() => {
    return state.posts.filter((post) => post.status === "published").length;
  }, [state.posts]);

  const draftCount = useMemo(() => {
    return state.posts.filter((post) => post.status === "draft").length;
  }, [state.posts]);

  const canUseWorkspace = !isDisconnected && state.member?.status === "completed";
  const recoverableStudioError =
    state.error && state.member?.status === "completed" ? state.error : null;
  const canGeneratePostCover = Boolean(
    postForm.title.trim() || postForm.summary.trim() || postForm.body.trim(),
  );

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
      const profileData = (await profileResponse.json()) as
        | CreatorProfileResponse
        | { error?: string };
      const postsData = (await postsResponse.json()) as
        | CreatorStudioPostsResponse
        | { error?: string };

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
          coverImageUrl: postForm.coverImageUrl || null,
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

  async function uploadProfileHeroImage(file: File) {
    try {
      setIsUploadingProfileImage(true);
      const email = await resolveMemberEmail();
      const body = new FormData();
      body.set("email", email);
      body.set("file", file);

      const response = await fetch("/api/content/profile/upload", {
        body,
        method: "POST",
      });
      const data = (await response.json()) as CreatorProfileUploadResponse | {
        error?: string;
      };

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.uploadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.uploadSuccess,
        profile: {
          ...current.profile,
          heroImageUrl: data.url,
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
    } finally {
      setIsUploadingProfileImage(false);
    }
  }

  async function uploadPostCoverImage(file: File) {
    try {
      setIsUploadingPostImage(true);
      const email = await resolveMemberEmail();
      const body = new FormData();
      body.set("email", email);
      body.set("file", file);

      const response = await fetch("/api/content/posts/upload", {
        body,
        method: "POST",
      });
      const data = (await response.json()) as ContentPostUploadResponse | {
        error?: string;
      };

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.uploadFailed,
        );
      }

      setPostForm((current) => ({
        ...current,
        coverImageUrl: data.url,
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.uploadSuccess,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
    } finally {
      setIsUploadingPostImage(false);
    }
  }

  async function generatePostCoverImage() {
    try {
      setIsGeneratingPostImage(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/posts/generate-cover", {
        body: JSON.stringify({
          body: postForm.body,
          email,
          summary: postForm.summary,
          title: postForm.title,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as ContentPostGenerateCoverResponse | {
        error?: string;
      };

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.uploadFailed,
        );
      }

      setPostForm((current) => ({
        ...current,
        coverImageUrl: data.url,
      }));
      setState((current) => ({
        ...current,
        error: null,
        notice: contentCopy.messages.imageGenerated,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.uploadFailed,
        notice: null,
      }));
    } finally {
      setIsGeneratingPostImage(false);
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

  function renderProfileCard() {
    const blockedState = renderBlockedState();

    return (
      <div className="glass-card rounded-[30px] p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UserRound className="size-5" />
          </div>
          <div>
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.labels.creatorProfile}
            </h2>
          </div>
        </div>

        {blockedState ? (
          blockedState
        ) : (
          <div className="mt-5 space-y-4">
            {recoverableStudioError ? (
              <MessageCard tone="error">{recoverableStudioError}</MessageCard>
            ) : null}
            <InputField
              hint={contentCopy.hints.displayName}
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
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-900">
                {contentCopy.fields.heroImage}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {contentCopy.hints.heroImage}
              </p>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void uploadProfileHeroImage(file);
                  }

                  event.target.value = "";
                }}
                ref={profileImageInputRef}
                type="file"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isUploadingProfileImage}
                  onClick={() => {
                    profileImageInputRef.current?.click();
                  }}
                  type="button"
                >
                  <ImagePlus className="size-4" />
                  {isUploadingProfileImage
                    ? contentCopy.actions.uploadingImage
                    : contentCopy.actions.uploadImage}
                </button>
                {state.profile.heroImageUrl ? (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    onClick={() => {
                      setState((current) => ({
                        ...current,
                        notice: null,
                        profile: {
                          ...current.profile,
                          heroImageUrl: "",
                        },
                      }));
                    }}
                    type="button"
                  >
                    {contentCopy.actions.removeImage}
                  </button>
                ) : null}
              </div>
              {state.profile.heroImageUrl ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900/90 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  <div
                    className="h-44 w-full bg-cover bg-center sm:h-56"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${state.profile.heroImageUrl})`,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={
                isSavingProfile || isDisconnected || isUploadingProfileImage
              }
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
    );
  }

  function renderComposerCard() {
    const blockedState = renderBlockedState();

    return (
      <div className="glass-card rounded-[30px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {contentCopy.actions.createPost}
            </h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900">
            {publishedCount} {contentCopy.labels.published}
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {contentCopy.labels.studioNotice}
        </p>

        {blockedState ? (
          blockedState
        ) : (
          <div className="mt-5 space-y-4">
            {recoverableStudioError ? (
              <MessageCard tone="error">{recoverableStudioError}</MessageCard>
            ) : null}
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
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-900">
                {contentCopy.fields.coverImage}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {contentCopy.hints.coverImage}
              </p>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void uploadPostCoverImage(file);
                  }

                  event.target.value = "";
                }}
                ref={postImageInputRef}
                type="file"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isUploadingPostImage || isGeneratingPostImage}
                  onClick={() => {
                    postImageInputRef.current?.click();
                  }}
                  type="button"
                >
                  <ImagePlus className="size-4" />
                  {isUploadingPostImage
                    ? contentCopy.actions.uploadingImage
                    : contentCopy.actions.uploadImage}
                </button>
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={
                    isUploadingPostImage ||
                    isGeneratingPostImage ||
                    !canGeneratePostCover
                  }
                  onClick={() => {
                    void generatePostCoverImage();
                  }}
                  type="button"
                >
                  <Sparkles className="size-4" />
                  {isGeneratingPostImage
                    ? contentCopy.actions.generatingAiCover
                    : contentCopy.actions.generateAiCover}
                </button>
                {postForm.coverImageUrl ? (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    onClick={() => {
                      setPostForm((current) => ({
                        ...current,
                        coverImageUrl: "",
                      }));
                    }}
                    type="button"
                  >
                    {contentCopy.actions.removeImage}
                  </button>
                ) : null}
              </div>
              {postForm.coverImageUrl ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900/90 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  <div
                    className="h-40 w-full bg-cover bg-center sm:h-52"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${postForm.coverImageUrl})`,
                    }}
                  />
                </div>
              ) : null}
            </div>
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
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={
                  isSavingPost ||
                  isDisconnected ||
                  isUploadingPostImage ||
                  isGeneratingPostImage
                }
                onClick={() => {
                  void createPost("draft");
                }}
                type="button"
              >
                {contentCopy.actions.saveDraft}
              </button>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={
                  isSavingPost ||
                  isDisconnected ||
                  isUploadingPostImage ||
                  isGeneratingPostImage
                }
                onClick={() => {
                  void createPost("published");
                }}
                type="button"
              >
                {contentCopy.actions.publish}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderRecentPostsPanel(options?: {
    compact?: boolean;
  }) {
    const compact = options?.compact ?? false;
    const posts = compact ? state.posts.slice(0, 4) : state.posts;

    return (
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
              <span className="max-w-[11rem] truncate sm:max-w-none">
                {state.notice}
              </span>
            </div>
          ) : null}
        </div>

        {isDisconnected ? (
          <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
        ) : state.status === "loading" ? (
          <MessageCard>{contentCopy.actions.refresh}...</MessageCard>
        ) : state.error && state.posts.length === 0 ? (
          <MessageCard tone="error">{state.error}</MessageCard>
        ) : posts.length === 0 ? (
          <MessageCard>{contentCopy.labels.feedEmpty}</MessageCard>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => (
              <article
                className="rounded-[24px] border border-white/80 bg-white/90 p-4"
                key={post.contentId}
              >
                {post.coverImageUrl ? (
                  <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-900/90">
                    <div
                      className="h-36 w-full bg-cover bg-center"
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                    href={setPathSearchParams(
                      buildPathWithReferral(
                        `/${locale}/content/${post.contentId}`,
                        referralCode,
                      ),
                      {
                        returnTo: currentStudioHref,
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
                      Archive
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderMobileHub() {
    const workspaceMessage = isDisconnected
      ? contentCopy.messages.connectRequired
      : state.status === "loading"
        ? `${contentCopy.actions.refresh}...`
        : state.error && state.member?.status !== "completed"
          ? state.error
          : contentCopy.page.studioDescription;

    return (
      <section className="grid gap-5 lg:hidden">
        <div className="glass-card rounded-[30px] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {contentCopy.page.studioTitle}
              </h2>
            </div>
            {state.notice ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                <Check className="size-4" />
                <span className="max-w-[9rem] truncate">{state.notice}</span>
              </div>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {workspaceMessage}
          </p>

          {state.error && state.member?.status !== "completed" ? (
            <div className="mt-3">
              <Link
                className="inline-flex text-sm font-semibold text-slate-950 underline"
                href={activateHref}
              >
                {dictionary.referralsPage.actions.completeSignup}
              </Link>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <WorkspaceMetric
              label={contentCopy.labels.published}
              value={String(publishedCount)}
            />
            <WorkspaceMetric
              label={contentCopy.labels.posts}
              value={String(state.posts.length)}
            />
            <WorkspaceMetric
              label={contentCopy.labels.draft}
              value={String(draftCount)}
            />
            <WorkspaceMetric
              label={contentCopy.labels.author}
              value={state.profile.displayName || "-"}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <WorkspaceLaunchCard
            description={contentCopy.hints.intro}
            disabled={!canUseWorkspace}
            href={profileHref}
            icon={<UserRound className="size-5" />}
            title={contentCopy.labels.creatorProfile}
          />
          <WorkspaceLaunchCard
            description={contentCopy.labels.studioNotice}
            disabled={!canUseWorkspace}
            href={newPostHref}
            icon={<PenSquare className="size-5" />}
            title={contentCopy.actions.createPost}
          />
        </div>

        {renderRecentPostsPanel({ compact: true })}
      </section>
    );
  }

  function renderSideRail(targetView: "new" | "profile") {
    const href = targetView === "profile" ? profileHref : newPostHref;
    const title =
      targetView === "profile"
        ? contentCopy.labels.creatorProfile
        : contentCopy.actions.createPost;
    const description =
      targetView === "profile"
        ? contentCopy.hints.intro
        : contentCopy.labels.studioNotice;
    const icon =
      targetView === "profile" ? (
        <UserRound className="size-5" />
      ) : (
        <PenSquare className="size-5" />
      );

    return (
      <div className="space-y-5">
        <WorkspaceLaunchCard
          description={description}
          disabled={!canUseWorkspace}
          href={href}
          icon={icon}
          title={title}
        />
        {renderRecentPostsPanel({ compact: true })}
      </div>
    );
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
            href={backHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="space-y-1">
            <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                {pageTitle}
              </h1>
              <p className="text-sm text-slate-600">{pageDescription}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <LanguageSwitcher
            label={dictionary.common.languageLabel}
            locale={locale}
          />
          {view !== "hub" ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
              href={studioHomeHref}
            >
              {contentCopy.page.studioTitle}
            </Link>
          ) : null}
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

      {view === "hub" ? (
        <>
          {renderMobileHub()}
          <section className="hidden gap-5 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              {renderProfileCard()}
              {renderComposerCard()}
            </div>
            {renderRecentPostsPanel()}
          </section>
        </>
      ) : view === "profile" ? (
        <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
          {renderProfileCard()}
          {renderSideRail("new")}
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          {renderComposerCard()}
          {renderSideRail("profile")}
        </section>
      )}
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

function WorkspaceMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function WorkspaceLaunchCard({
  description,
  disabled = false,
  href,
  icon,
  title,
}: {
  description: string;
  disabled?: boolean;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  const className =
    "glass-card rounded-[30px] p-5 transition " +
    (disabled
      ? "cursor-not-allowed opacity-70"
      : "hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(15,23,42,0.12)]");

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <div className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950">
          <ArrowRight className="size-4" />
        </div>
      </div>
      <div className="mt-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </>
  );

  if (disabled) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link className={className} href={href}>
      {body}
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "published"
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
