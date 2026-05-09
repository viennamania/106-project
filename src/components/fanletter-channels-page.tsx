"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Clapperboard,
  Copy,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  MessageCircleHeart,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { useMemberSession } from "@/components/member-session-provider";
import type {
  ContentPostRecord,
  CreatorProfileRecord,
  CreatorProfileResponse,
  CreatorStudioPostsResponse,
} from "@/lib/content";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { smartWalletChain, thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type ChannelStatus = "error" | "idle" | "loading" | "ready";

type ChannelState = {
  error: string | null;
  member: MemberRecord | null;
  posts: ContentPostRecord[];
  profile: CreatorProfileRecord | null;
  profileConfigured: boolean;
  status: ChannelStatus;
};

const FANLETTER_CHANNELS_DISCONNECTED_GRACE_MS = 4500;
const CHANNEL_POSTS_PAGE_SIZE = 8;
const CHANNEL_BRAND_LOGOS = [
  {
    alt: "Instagram",
    src: "/brand/platforms/instagram.svg",
  },
  {
    alt: "YouTube Shorts",
    src: "/brand/platforms/youtube-shorts.svg",
  },
  {
    alt: "TikTok",
    src: "/brand/platforms/tiktok.svg",
  },
] as const;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          back: "스튜디오로 돌아가기",
          connect: "계정 연결하기",
          copyCaption: "캡션 복사",
          copied: "복사됨",
          create: "브이로그 만들기",
          openContent: "콘텐츠 보기",
          refresh: "다시 확인",
        },
        checklist: [
          "9:16 세로형 영상이 정상 재생되는지 확인",
          "제목과 요약을 팬이 읽는 문장으로 정리",
          "캡션과 해시태그를 복사해 릴스/쇼츠/틱톡에 업로드",
          "외부 게시 후 FanLetter 링크를 프로필이나 댓글에 연결",
        ],
        channels: [
          {
            body: "릴스 업로드용 캡션, 해시태그, FanLetter 링크를 한 번에 준비합니다.",
            meta: "수동 업로드",
            title: "Instagram Reels",
          },
          {
            body: "쇼츠 설명문과 고정 댓글에 넣을 FanLetter 링크를 정리합니다.",
            meta: "수동 업로드",
            title: "YouTube Shorts",
          },
          {
            body: "짧은 후킹 문장과 해시태그 세트를 만들어 틱톡 게시에 사용합니다.",
            meta: "수동 업로드",
            title: "TikTok",
          },
        ],
        connectRequired:
          "외부 채널 배포 관리는 FanLetter 계정 연결 후 사용할 수 있습니다.",
        connectTitle: "계정 연결이 필요합니다.",
        distributionBody:
          "아직 자동 게시 API를 붙이기 전 단계입니다. 대신 FanLetter 콘텐츠를 Instagram Reels, YouTube Shorts, TikTok에 바로 옮길 수 있는 게시 패키지를 준비합니다.",
        distributionTitle: "외부 숏폼 채널에 올릴 준비를 한 화면에서 끝냅니다.",
        emptyBody:
          "먼저 AI 캐릭터 브이로그를 만들면 외부 채널용 캡션과 링크 패키지가 자동으로 준비됩니다.",
        emptyTitle: "배포할 브이로그가 아직 없습니다.",
        eyebrow: "FanLetter Channel Distribution",
        labels: {
          account: "계정 상태",
          automaticLater: "자동 게시 연동은 다음 단계",
          caption: "외부 채널용 캡션",
          format: "권장 포맷",
          hashtags: "추천 해시태그",
          latestPackages: "최근 게시 패키지",
          manualPackage: "게시 패키지",
          mediaReady: "미디어 준비",
          platform: "채널",
          profile: "캐릭터 프로필",
          ready: "준비 완료",
          status: "상태",
        },
        loading: "외부 채널 배포 상태를 확인하고 있습니다.",
        paymentRequired:
          "가입 완료 회원만 외부 채널 배포 관리 화면을 사용할 수 있습니다.",
        paymentTitle: "가입 완료 확인이 필요합니다.",
        postTypes: {
          video: "동영상",
        },
        statusValues: {
          draft: "임시저장",
          published: "공개",
        },
        subtitle:
          "초기에는 자동 게시보다 실패가 적은 수동 배포 패키지가 더 실용적입니다. 콘텐츠가 쌓이면 Instagram API, 예약 게시, 성과 분석으로 확장할 수 있습니다.",
        title: "AI 캐릭터 브이로그 채널 배포 관리",
      }
    : {
        actions: {
          back: "Back to studio",
          connect: "Connect account",
          copyCaption: "Copy caption",
          copied: "Copied",
          create: "Create vlog",
          openContent: "Open content",
          refresh: "Check again",
        },
        checklist: [
          "Check that the 9:16 vertical video plays correctly",
          "Turn title and summary into a fan-facing caption",
          "Copy caption and hashtags into Reels, Shorts, or TikTok",
          "Add the FanLetter link to profile, description, or comments",
        ],
        channels: [
          {
            body: "Prepare caption, hashtags, and FanLetter link for Reels upload.",
            meta: "Manual upload",
            title: "Instagram Reels",
          },
          {
            body: "Prepare Shorts description and a pinned-comment FanLetter link.",
            meta: "Manual upload",
            title: "YouTube Shorts",
          },
          {
            body: "Create a short hook and hashtag set for TikTok publishing.",
            meta: "Manual upload",
            title: "TikTok",
          },
        ],
        connectRequired:
          "Channel distribution is available after connecting your FanLetter account.",
        connectTitle: "Account connection is required.",
        distributionBody:
          "This is the step before automatic publishing APIs. It prepares posting packages that move FanLetter content into Instagram Reels, YouTube Shorts, and TikTok.",
        distributionTitle: "Prepare external short-form publishing in one place.",
        emptyBody:
          "Create an AI character vlog first, then caption and link packages will appear here.",
        emptyTitle: "No vlogs are ready for distribution yet.",
        eyebrow: "FanLetter Channel Distribution",
        labels: {
          account: "Account state",
          automaticLater: "Automatic publishing comes later",
          caption: "External channel caption",
          format: "Recommended format",
          hashtags: "Suggested hashtags",
          latestPackages: "Recent posting packages",
          manualPackage: "Posting package",
          mediaReady: "Media ready",
          platform: "Channel",
          profile: "Character profile",
          ready: "Ready",
          status: "Status",
        },
        loading: "Checking channel distribution state.",
        paymentRequired:
          "Completed members can use the channel distribution manager.",
        paymentTitle: "Signup verification is required.",
        postTypes: {
          video: "Video",
        },
        statusValues: {
          draft: "Draft",
          published: "Published",
        },
        subtitle:
          "At the early stage, a manual posting package is more practical than full auto-publishing. Later this can grow into Instagram API publishing, scheduling, and insights.",
        title: "AI Character Vlog Channel Distribution",
      };
}

async function readApiJson<T>(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    const errorMessage =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : fallback;

    throw new Error(errorMessage);
  }

  return data as T;
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function resolvePostImage(post: ContentPostRecord) {
  return post.coverImageUrl ?? post.contentImageUrls[0] ?? null;
}

function resolvePostVideo(post: ContentPostRecord) {
  return post.contentVideoUrls[0] ?? null;
}

function getStatusLabel(
  status: ContentPostRecord["status"],
  copy: ReturnType<typeof getCopy>,
) {
  if (status === "published") {
    return copy.statusValues.published;
  }

  if (status === "draft") {
    return copy.statusValues.draft;
  }

  return status;
}

function buildHashtags(post: ContentPostRecord, locale: Locale) {
  const normalizedTags = post.tags
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const base =
    locale === "ko"
      ? ["FanLetter", "AI캐릭터", "브이로그", "숏폼영상"]
      : ["FanLetter", "AICharacter", "Vlog", "Shorts"];
  const uniqueTags = Array.from(new Set([...base, ...normalizedTags]));

  return uniqueTags.map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ");
}

function buildCaption({
  contentUrl,
  locale,
  post,
  profile,
}: {
  contentUrl: string;
  locale: Locale;
  post: ContentPostRecord;
  profile: CreatorProfileRecord | null;
}) {
  const author = profile?.displayName?.trim();
  const summary = post.summary || post.previewText || post.title;
  const hashtags = buildHashtags(post, locale);

  if (locale === "ko") {
    return [
      author ? `${author}의 새 AI 캐릭터 브이로그` : "새 AI 캐릭터 브이로그",
      post.title,
      summary,
      "FanLetter에서 전체 콘텐츠를 확인하세요.",
      contentUrl,
      hashtags,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    author ? `New AI character vlog from ${author}` : "New AI character vlog",
    post.title,
    summary,
    "Watch the full content on FanLetter.",
    contentUrl,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function StatusPanel({
  body,
  cta,
  href,
  loading,
  onRetry,
  title,
}: {
  body: string;
  cta?: string;
  href?: string;
  loading?: boolean;
  onRetry?: () => void;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#030504] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-3xl items-center">
        <section className="w-full rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            {loading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Share2 className="size-6" />
            )}
          </span>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm font-medium leading-6 text-white/62 sm:text-base">
            {body}
          </p>
          {href && cta ? (
            <Link
              className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#67ff88] sm:w-fit"
              href={href}
            >
              {cta}
            </Link>
          ) : null}
          {onRetry && cta ? (
            <button
              className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-6 text-sm font-semibold text-black transition hover:bg-[#67ff88] sm:w-fit"
              onClick={onRetry}
              type="button"
            >
              <RefreshCw className="size-4" />
              {cta}
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ChannelCard({
  body,
  logoAlt,
  logoSrc,
  meta,
  title,
}: {
  body: string;
  logoAlt: string;
  logoSrc: string;
  meta: string;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white p-2 shadow-[0_14px_32px_rgba(0,0,0,0.22)]">
          <Image
            alt={logoAlt}
            className="h-full w-full object-contain"
            height={40}
            src={logoSrc}
            width={40}
          />
        </span>
        <span className="rounded-full border border-white/12 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white/56">
          {meta}
        </span>
      </div>
      <h2 className="mt-5 text-xl font-semibold leading-tight tracking-normal">
        {title}
      </h2>
      <p className="mt-2 text-sm font-medium leading-6 text-white/58">
        {body}
      </p>
    </article>
  );
}

function PostingPackageCard({
  caption,
  copied,
  contentHref,
  copy,
  dateLabel,
  hashtags,
  imageUrl,
  locale,
  onCopy,
  post,
  videoUrl,
}: {
  caption: string;
  copied: boolean;
  contentHref: string;
  copy: ReturnType<typeof getCopy>;
  dateLabel: string | null;
  hashtags: string;
  imageUrl: string | null;
  locale: Locale;
  onCopy: () => void;
  post: ContentPostRecord;
  videoUrl: string | null;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_42px_rgba(8,18,12,0.06)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
        <div className="relative aspect-[4/5] bg-black lg:aspect-auto lg:min-h-full">
          {videoUrl ? (
            <video
              autoPlay
              className="h-full w-full object-cover"
              loop
              muted
              playsInline
              poster={imageUrl ?? undefined}
              preload="metadata"
              src={videoUrl}
              title={post.title}
            />
          ) : imageUrl ? (
            <Image
              alt={post.title}
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 34vw"
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/42">
              <ImageIcon className="size-9" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 to-transparent p-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-semibold uppercase text-black">
                {copy.postTypes.video}
              </span>
              <span className="rounded-full bg-black/62 px-2.5 py-1 text-[0.62rem] font-semibold uppercase text-white">
                {getStatusLabel(post.status, copy)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/42">
            <span>{dateLabel ?? "-"}</span>
            <span>·</span>
            <span>{copy.labels.manualPackage}</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-normal [word-break:keep-all]">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-black/54">
            {post.summary || post.previewText || post.title}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              ["9:16", copy.labels.format],
              [copy.postTypes.video, copy.labels.mediaReady],
              [post.priceType === "paid" ? `${post.priceUsdt ?? "1"} USDT` : locale === "ko" ? "무료 공개" : "Free", copy.labels.status],
            ].map(([value, label]) => (
              <div
                className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
                key={`${label}-${value}`}
              >
                <p className="text-base font-semibold text-black">{value}</p>
                <p className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-black/40">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(14rem,0.75fr)]">
            <div className="rounded-lg border border-black/10 bg-[#f6f8f4] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#16702e]">
                {copy.labels.caption}
              </p>
              <p className="mt-3 max-h-56 overflow-y-auto whitespace-pre-line break-words text-sm font-medium leading-6 text-black/62 [overflow-wrap:anywhere]">
                {caption}
              </p>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-black/42">
                {copy.labels.hashtags}
              </p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-black [overflow-wrap:anywhere]">
                {hashtags}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/82"
              onClick={onCopy}
              type="button"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? copy.actions.copied : copy.actions.copyCaption}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold !text-black transition hover:bg-black/5"
              href={contentHref}
            >
              <Link2 className="size-4" />
              {copy.actions.openContent}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function FanletterChannelsPage({
  locale,
  referralCode,
  returnToHref = null,
}: {
  locale: Locale;
  referralCode: string | null;
  returnToHref?: string | null;
}) {
  const copy = getCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: FANLETTER_CHANNELS_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_CHANNELS_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const studioHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const studioHref = returnToHref ?? studioHomeHref;
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: studioHref },
  );
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: studioHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: studioHref },
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [origin, setOrigin] = useState("");
  const [state, setState] = useState<ChannelState>({
    error: null,
    member: memberSession.member,
    posts: [],
    profile: null,
    profileConfigured: false,
    status: "idle",
  });
  const loadInFlightRef = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!copiedId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopiedId(null);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copiedId]);

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

  const loadChannels = useCallback(async () => {
    if (!accountAddress || loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const resolvedEmail = await resolveEmail();
      const encodedEmail = encodeURIComponent(resolvedEmail);
      const encodedWallet = encodeURIComponent(accountAddress);
      const profileUrl = `/api/content/profile?email=${encodedEmail}&walletAddress=${encodedWallet}`;
      let profileResponse = await fetch(profileUrl, { cache: "no-store" });

      if (!profileResponse.ok && profileResponse.status === 404) {
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
          updateMemberSession({
            email: syncData.member.email,
            member: syncData.member,
            walletAddress: accountAddress,
          });
        }

        if (syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        profileResponse = await fetch(profileUrl, { cache: "no-store" });
      }

      const profileData = await readApiJson<CreatorProfileResponse>(
        profileResponse,
        copy.connectRequired,
      );
      const postsUrl = `/api/content/posts?email=${encodedEmail}&walletAddress=${encodedWallet}&media=video&pageSize=${CHANNEL_POSTS_PAGE_SIZE}&status=all`;
      const postsData = await fetch(postsUrl, { cache: "no-store" }).then(
        (response) =>
          readApiJson<CreatorStudioPostsResponse>(
            response,
            copy.connectRequired,
          ),
      );
      const nextMember = profileData.member ?? postsData.member ?? null;

      if (nextMember) {
        updateMemberSession({
          email: nextMember.email,
          member: nextMember,
          walletAddress: accountAddress,
        });
      }

      setState({
        error: null,
        member: nextMember,
        posts: postsData.posts,
        profile: profileData.profile,
        profileConfigured: profileData.profileConfigured,
        status: "ready",
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : copy.connectRequired,
        status: "error",
      }));
    } finally {
      loadInFlightRef.current = false;
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    copy.connectRequired,
    locale,
    referralCode,
    resolveEmail,
    updateMemberSession,
  ]);

  useEffect(() => {
    if (!connection.isConnected) {
      return;
    }

    void loadChannels();
  }, [connection.isConnected, loadChannels]);

  const memberIsPendingPayment = state.member?.status === "pending_payment";
  const distributionPosts = useMemo(
    () =>
      state.posts
        .filter((post) => post.contentVideoCount > 0)
        .slice(0, 6),
    [state.posts],
  );

  const copyCaption = useCallback(async (contentId: string, caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedId(contentId);
    } catch {
      setCopiedId(null);
    }
  }, []);

  if (connection.isResolving) {
    return (
      <StatusPanel
        body={copy.loading}
        loading
        title={copy.loading}
      />
    );
  }

  if (connection.isDisconnected) {
    return (
      <StatusPanel
        body={copy.connectRequired}
        cta={copy.actions.connect}
        href={connectHref}
        title={copy.connectTitle}
      />
    );
  }

  if (memberIsPendingPayment) {
    return (
      <StatusPanel
        body={copy.paymentRequired}
        cta={copy.actions.connect}
        href={activateHref}
        title={copy.paymentTitle}
      />
    );
  }

  if (state.status === "error") {
    return (
      <StatusPanel
        body={state.error ?? copy.connectRequired}
        cta={copy.actions.refresh}
        onRetry={() => {
          void loadChannels();
        }}
        title={copy.connectTitle}
      />
    );
  }

  const isLoading = state.status === "idle" || state.status === "loading";

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="border-b border-white/10 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+0.85rem)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition hover:bg-white/10"
              href={studioHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link className="flex min-w-0 items-center gap-2" href={studioHref}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
              <Link
                className="hidden h-11 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 lg:inline-flex"
                href={studioHref}
              >
                {copy.actions.back}
              </Link>
            </div>
          </header>

          <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)] lg:items-end">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.55rem] font-semibold leading-[0.98] tracking-normal text-white [word-break:keep-all] sm:text-[4.8rem]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {copy.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
                  href={createHref}
                >
                  <Sparkles className="size-4" />
                  {copy.actions.create}
                </Link>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/8 px-6 text-sm font-semibold text-white"
                  type="button"
                >
                  <CalendarClock className="size-4" />
                  {copy.labels.automaticLater}
                </button>
              </div>
            </div>

            <aside className="rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                  <UploadCloud className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#44f26e]">
                    {copy.labels.ready}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                    {copy.distributionTitle}
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium leading-6 text-white/62">
                {copy.distributionBody}
              </p>
              <div className="mt-5 grid gap-2">
                {copy.checklist.map((item, index) => (
                  <div
                    className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/24 p-3 text-sm font-medium leading-6 text-white/66"
                    key={item}
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-xs font-semibold text-black">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="grid gap-3 pb-4 md:grid-cols-3">
            {copy.channels.map((channel, index) => (
              <ChannelCard
                body={channel.body}
                key={channel.title}
                logoAlt={CHANNEL_BRAND_LOGOS[index]?.alt ?? channel.title}
                logoSrc={CHANNEL_BRAND_LOGOS[index]?.src ?? CHANNEL_BRAND_LOGOS[0].src}
                meta={channel.meta}
                title={channel.title}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-8 text-black sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#16702e]">
                {copy.labels.platform}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal sm:text-5xl">
                {copy.labels.latestPackages}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/48">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2">
                <ShieldCheck className="size-4 text-[#16702e]" />
                {copy.labels.account}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2">
                <Clapperboard className="size-4 text-[#16702e]" />
                {copy.labels.mediaReady}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-4">
              {[0, 1, 2].map((item) => (
                <div
                  className="min-h-[26rem] animate-pulse rounded-lg bg-black/5"
                  key={item}
                />
              ))}
            </div>
          ) : distributionPosts.length > 0 ? (
            <div className="mt-6 grid gap-5">
              {distributionPosts.map((post) => {
                const imageUrl = resolvePostImage(post);
                const videoUrl = resolvePostVideo(post);
                const contentHref = buildPathWithReferral(
                  `/${locale}/fanletter/content/${post.contentId}`,
                  referralCode ?? post.authorReferralCode,
                );
                const contentUrl = `${origin}${contentHref}`;
                const hashtags = buildHashtags(post, locale);
                const caption = buildCaption({
                  contentUrl,
                  locale,
                  post,
                  profile: state.profile,
                });

                return (
                  <PostingPackageCard
                    caption={caption}
                    contentHref={contentHref}
                    copied={copiedId === post.contentId}
                    copy={copy}
                    dateLabel={formatDate(post.publishedAt ?? post.updatedAt, locale)}
                    hashtags={hashtags}
                    imageUrl={imageUrl}
                    key={post.contentId}
                    locale={locale}
                    onCopy={() => {
                      void copyCaption(post.contentId, caption);
                    }}
                    post={post}
                    videoUrl={videoUrl}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_42px_rgba(8,18,12,0.06)]">
              <FileText className="size-9 text-[#16702e]" />
              <h3 className="mt-4 text-2xl font-semibold">
                {copy.emptyTitle}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-black/54">
                {copy.emptyBody}
              </p>
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
                href={createHref}
              >
                {copy.actions.create}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
