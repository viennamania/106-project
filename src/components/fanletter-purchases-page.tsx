"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Clapperboard,
  Coins,
  Loader2,
  MessageCircleHeart,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import type {
  ContentFeedItemRecord,
  ContentFeedLoadResponse,
} from "@/lib/content";
import { useFanletterAccountStatus } from "@/lib/fanletter-account-status";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { MemberRecord } from "@/lib/member";
import { thirdwebClient } from "@/lib/thirdweb";
import { getThirdwebUserEmail } from "@/lib/thirdweb-client";

type LoadStatus = "error" | "idle" | "loading" | "ready";

type PurchasesState = {
  error: string | null;
  items: ContentFeedItemRecord[];
  member: MemberRecord | null;
  status: LoadStatus;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountRequiredBody:
          "구매 내역은 연결된 FanLetter 계정 기준으로 확인합니다.",
        accountRequiredTitle: "계정 연결 후 구매한 콘텐츠를 확인하세요.",
        allFeed: "브이로그 피드",
        backToFeed: "브이로그 둘러보기",
        channel: "채널 보기",
        connect: "계정 연결",
        emptyBody:
          "팬 전용 브이로그를 결제하면 이곳에 모이고, 언제든 다시 볼 수 있습니다.",
        emptyTitle: "아직 구매한 팬 전용 브이로그가 없습니다.",
        errorBody: "구매한 콘텐츠를 불러오지 못했습니다.",
        eyebrow: "Fan-only Library",
        fanHome: "팬 홈",
        fullAccess: "전체 열람 가능",
        heroBody:
          "결제 완료한 팬 전용 브이로그를 한곳에서 다시 보고, 원래 캐릭터 채널로 이어갑니다.",
        heroTitle: "구매한 팬 전용",
        latestPurchase: "최근 구매",
        likes: "좋아요",
        loadMore: "더 보기",
        loading: "구매한 팬 전용 브이로그를 확인하는 중입니다.",
        navLabel: "FanLetter 구매 콘텐츠 메뉴",
        paid: "결제 완료",
        purchased: "구매함",
        purchasedCount: "구매 콘텐츠",
        retry: "다시 확인",
        replies: "댓글",
        start: "내 채널 만들기",
        statsCreators: "캐릭터",
        statsTotal: "누적 결제",
        studio: "스튜디오",
        unlockNote: "잠금 해제됨",
        view: "바로 보기",
        videoCount: "영상",
      }
    : {
        accountRequiredBody:
          "Purchases are loaded from your connected FanLetter account.",
        accountRequiredTitle: "Connect your account to see purchases.",
        allFeed: "Vlog feed",
        backToFeed: "Browse vlogs",
        channel: "View channel",
        connect: "Connect account",
        emptyBody:
          "Fan-only vlogs you unlock will appear here so you can replay them anytime.",
        emptyTitle: "No fan-only purchases yet.",
        errorBody: "Could not load purchased content.",
        eyebrow: "Fan-only Library",
        fanHome: "Fan home",
        fullAccess: "Full access",
        heroBody:
          "Replay paid fan-only vlogs in one place, then continue back to each character channel.",
        heroTitle: "Purchased fan-only",
        latestPurchase: "Latest purchase",
        likes: "Likes",
        loadMore: "Load more",
        loading: "Checking your purchased fan-only vlogs.",
        navLabel: "FanLetter purchased content navigation",
        paid: "Paid",
        purchased: "Purchases",
        purchasedCount: "Purchases",
        retry: "Retry",
        replies: "Replies",
        start: "Start my channel",
        statsCreators: "Characters",
        statsTotal: "Total paid",
        studio: "Studio",
        unlockNote: "Unlocked",
        view: "Watch now",
        videoCount: "Videos",
      };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(value);
}

function formatUsdt(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function getDisplayName(item: ContentFeedItemRecord) {
  return (
    item.authorProfile?.characterPersona?.name?.trim() ||
    item.authorProfile?.displayName?.trim() ||
    item.authorReferralCode ||
    item.authorEmail
  );
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

function getPreviewText(item: ContentFeedItemRecord) {
  return item.previewText?.trim() || item.summary.trim();
}

function getPrimaryImageUrl(item: ContentFeedItemRecord) {
  return item.coverImageUrl ?? item.contentImageUrls[0] ?? null;
}

function mergeItems(
  currentItems: ContentFeedItemRecord[],
  nextItems: ContentFeedItemRecord[],
) {
  const map = new Map(currentItems.map((item) => [item.contentId, item]));

  nextItems.forEach((item) => {
    map.set(item.contentId, item);
  });

  return [...map.values()];
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

function PurchaseStatePanel({
  actionHref,
  actionLabel,
  body,
  icon,
  onRetry,
  secondaryActionHref,
  secondaryActionLabel,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  icon: "connect" | "empty" | "error" | "loading";
  onRetry?: () => void;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  title: string;
}) {
  const Icon =
    icon === "connect"
      ? WalletCards
      : icon === "loading"
        ? Loader2
        : icon === "error"
          ? RefreshCw
          : BookOpenCheck;

  return (
    <section className="rounded-lg border border-black/10 bg-white p-6 text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)]">
      <span className="flex size-12 items-center justify-center rounded-lg bg-[#44f26e] text-black">
        <Icon className={`size-6 ${icon === "loading" ? "animate-spin" : ""}`} />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-normal">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-black/58">
        {body}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {actionHref && actionLabel ? (
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
            href={actionHref}
          >
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
        {secondaryActionHref && secondaryActionLabel ? (
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/12 px-4 text-sm font-semibold !text-black transition hover:border-black/28"
            href={secondaryActionHref}
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
        {onRetry ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28"
            onClick={onRetry}
            type="button"
          >
            <RefreshCw className="size-4" />
            {actionLabel ?? "Retry"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function PurchaseCard({
  contentHref,
  copy,
  item,
  locale,
  profileHref,
}: {
  contentHref: string;
  copy: ReturnType<typeof getCopy>;
  item: ContentFeedItemRecord;
  locale: Locale;
  profileHref: string;
}) {
  const displayName = getDisplayName(item);
  const imageUrl = getPrimaryImageUrl(item);
  const publishedAt = formatDate(item.publishedAt ?? item.createdAt, locale);
  const previewText = getPreviewText(item);
  const priceLabel = `${item.priceUsdt ?? "1"} USDT`;
  const videoCount = Math.max(item.contentVideoCount, item.contentVideoUrls.length);

  return (
    <article className="grid overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)] md:grid-cols-[minmax(14rem,0.45fr)_minmax(0,1fr)]">
      <Link
        className="group relative block aspect-[4/5] overflow-hidden bg-[#07100b] md:aspect-auto"
        href={contentHref}
      >
        {imageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 768px) 42vw, 100vw"
            src={imageUrl}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/58">
            <PlayCircle className="size-12 text-[#44f26e]" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 to-transparent p-4 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#44f26e] px-3 py-1 text-xs font-bold text-black">
            <ShieldCheck className="size-3.5" />
            {copy.unlockNote}
          </div>
        </div>
      </Link>

      <div className="flex min-w-0 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1f7c38]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8fff0] px-3 py-1">
            <BadgeCheck className="size-3.5" />
            {copy.paid}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-black/58">
            <Coins className="size-3.5" />
            {priceLabel}
          </span>
        </div>

        <h2 className="mt-4 line-clamp-2 text-2xl font-semibold leading-tight tracking-normal [word-break:keep-all]">
          {item.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-black/58 [word-break:keep-all]">
          {previewText}
        </p>

        <div className="mt-5 flex items-center gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e] bg-cover bg-center text-sm font-semibold text-black"
            style={
              item.authorProfile?.avatarImageUrl
                ? { backgroundImage: `url(${item.authorProfile.avatarImageUrl})` }
                : undefined
            }
          >
            {item.authorProfile?.avatarImageUrl ? null : getInitial(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="text-xs font-medium text-black/46">
              {publishedAt ?? "FanLetter"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm font-semibold">
          <div className="rounded-lg border border-black/8 bg-black/[0.025] p-3">
            <p>{formatNumber(videoCount, locale)}</p>
            <p className="mt-1 text-xs text-black/44">{copy.videoCount}</p>
          </div>
          <div className="rounded-lg border border-black/8 bg-black/[0.025] p-3">
            <p>{formatNumber(item.social.likeCount, locale)}</p>
            <p className="mt-1 text-xs text-black/44">{copy.likes}</p>
          </div>
          <div className="rounded-lg border border-black/8 bg-black/[0.025] p-3">
            <p>{formatNumber(item.social.commentCount, locale)}</p>
            <p className="mt-1 text-xs text-black/44">{copy.replies}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:mt-auto sm:flex-row sm:pt-6">
          <Link
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-black/82"
            href={contentHref}
          >
            {copy.view}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-black/12 px-5 text-sm font-semibold !text-black transition hover:border-black/28"
            href={profileHref}
          >
            <UserRound className="size-4" />
            {copy.channel}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function FanletterPurchasesPage({
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
  const { accountAddress, connection, memberSession } = accountStatus;
  const { updateMemberSession } = memberSession;
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [emailSyncAttempted, setEmailSyncAttempted] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [state, setState] = useState<PurchasesState>({
    error: null,
    items: [],
    member: null,
    status: "idle",
  });

  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/purchases`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: purchasesHref },
  );
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    referralCode,
  );
  const followingHref = buildPathWithReferral(
    `/${locale}/fanletter/following`,
    referralCode,
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    referralCode,
  );

  const stats = useMemo(() => {
    const creatorCodes = new Set(
      state.items.map((item) => item.authorReferralCode || item.authorEmail),
    );
    const totalUsdt = state.items.reduce((sum, item) => {
      const parsed = Number.parseFloat(item.priceUsdt ?? "1");

      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
    const latest = state.items[0]
      ? formatDate(
          state.items[0].publishedAt ?? state.items[0].createdAt,
          locale,
        )
      : null;

    return [
      {
        icon: BookOpenCheck,
        label: copy.purchasedCount,
        value: formatNumber(state.items.length, locale),
      },
      {
        icon: UserRound,
        label: copy.statsCreators,
        value: formatNumber(creatorCodes.size, locale),
      },
      {
        icon: Coins,
        label: copy.statsTotal,
        value: `${formatUsdt(totalUsdt, locale)} USDT`,
      },
      {
        icon: Clapperboard,
        label: copy.latestPurchase,
        value: latest ?? "FanLetter",
      },
    ];
  }, [
    copy.latestPurchase,
    copy.purchasedCount,
    copy.statsCreators,
    copy.statsTotal,
    locale,
    state.items,
  ]);

  const loadPurchases = useCallback(
    async (options?: { append?: boolean; cursor?: string | null }) => {
      const append = Boolean(options?.append);
      const cursor = options?.cursor ?? null;

      if (!accountAddress) {
        setState({
          error: null,
          items: [],
          member: null,
          status: "idle",
        });
        setNextCursor(null);
        return;
      }

      if (append) {
        if (!cursor || isLoadingMoreRef.current) {
          return;
        }

        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      } else {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
        setState((current) => ({
          ...current,
          error: null,
          status: "loading",
        }));
        setNextCursor(null);
      }

      try {
        let resolvedEmail = memberSession.email ?? email;

        if (!resolvedEmail) {
          resolvedEmail = await getThirdwebUserEmail({ client: thirdwebClient });
        }

        setEmail(resolvedEmail ?? null);
        setEmailSyncAttempted(true);

        if (!resolvedEmail) {
          setState({
            error: null,
            items: [],
            member: null,
            status: "ready",
          });
          return;
        }

        const params = new URLSearchParams({
          email: resolvedEmail,
          locale,
          view: "purchases",
          walletAddress: accountAddress,
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const data = await readApiJson<ContentFeedLoadResponse>(
          await fetch(`/api/content/feed?${params.toString()}`, {
            cache: "no-store",
          }),
          copy.errorBody,
        );

        if (data.member) {
          updateMemberSession({
            email: data.member.email,
            member: data.member,
            walletAddress: accountAddress,
          });
        }

        setState((current) => ({
          error: null,
          items: append ? mergeItems(current.items, data.items) : data.items,
          member: data.member,
          status: "ready",
        }));
        setNextCursor(data.nextCursor);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : copy.errorBody;
        const readableMessage =
          message === "Completed signup is required."
            ? copy.accountRequiredBody
            : message;

        setState((current) => ({
          error: readableMessage,
          items: append ? current.items : [],
          member: append ? current.member : null,
          status: append && current.items.length > 0 ? "ready" : "error",
        }));

        if (!append) {
          setNextCursor(null);
        }
      } finally {
        if (append) {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      }
    },
    [
      accountAddress,
      copy.accountRequiredBody,
      copy.errorBody,
      email,
      locale,
      memberSession.email,
      updateMemberSession,
    ],
  );

  useEffect(() => {
    setEmailSyncAttempted(false);
    setEmail(null);
    setState({
      error: null,
      items: [],
      member: null,
      status: "idle",
    });
    setNextCursor(null);
  }, [accountAddress]);

  useEffect(() => {
    if (!connection.isConnected || state.status !== "idle") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadPurchases();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [connection.isConnected, loadPurchases, state.status]);

  const isDisconnectedGraceWithoutAccount =
    accountStatus.status === "checking" &&
    accountStatus.connectionStatus === "disconnected" &&
    !accountAddress &&
    !memberSession.email &&
    !memberSession.member;
  const isWaitingForAccount =
    !isDisconnectedGraceWithoutAccount &&
    (accountStatus.status === "checking" ||
      (connection.isConnected && !email && !emailSyncAttempted));
  const showConnect =
    !isWaitingForAccount &&
    (accountStatus.status === "disconnected" ||
      accountStatus.status === "setupMissing" ||
      accountStatus.status === "issue" ||
      accountStatus.status === "pendingPayment" ||
      !accountAddress ||
      !email);

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

            <nav
              aria-label={copy.navLabel}
              className="hidden items-center gap-7 text-sm font-semibold text-white/74 md:flex"
            >
              <Link href={feedHref}>{copy.allFeed}</Link>
              <Link className="text-[#44f26e]" href={purchasesHref}>
                {copy.purchased}
              </Link>
              <Link href={studioHref}>{copy.studio}</Link>
              <Link href={startHref}>{copy.start}</Link>
            </nav>

            <div className="flex items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden lg:inline-flex"
                locale={locale}
              />
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
            </div>
          </header>

          <div className="pt-14 sm:pt-24">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 max-w-5xl text-[2.6rem] font-semibold leading-[1.02] tracking-normal text-white [word-break:keep-all] sm:text-[4.6rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
              {copy.heroBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                href={feedHref}
              >
                <Sparkles className="size-4" />
                {copy.backToFeed}
              </Link>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-sm font-semibold text-white transition hover:bg-white/8"
                onClick={() => {
                  void loadPurchases();
                }}
                type="button"
              >
                <RefreshCw className="size-4" />
                {copy.retry}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          {isWaitingForAccount || state.status === "loading" ? (
            <PurchaseStatePanel
              body={copy.loading}
              icon="loading"
              title={copy.loading}
            />
          ) : showConnect ? (
            <PurchaseStatePanel
              actionHref={connectHref}
              actionLabel={copy.connect}
              body={copy.accountRequiredBody}
              icon="connect"
              secondaryActionHref={feedHref}
              secondaryActionLabel={copy.allFeed}
              title={copy.accountRequiredTitle}
            />
          ) : state.status === "error" ? (
            <PurchaseStatePanel
              actionLabel={copy.retry}
              body={state.error ?? copy.errorBody}
              icon="error"
              onRetry={() => {
                void loadPurchases();
              }}
              secondaryActionHref={followingHref}
              secondaryActionLabel={copy.fanHome}
              title={copy.errorBody}
            />
          ) : state.items.length === 0 ? (
            <PurchaseStatePanel
              actionHref={feedHref}
              actionLabel={copy.backToFeed}
              body={copy.emptyBody}
              icon="empty"
              secondaryActionHref={followingHref}
              secondaryActionLabel={copy.fanHome}
              title={copy.emptyTitle}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_12px_30px_rgba(8,18,12,0.08)]"
                      key={stat.label}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-black/44">
                        <Icon className="size-4 text-[#1f7c38]" />
                        {stat.label}
                      </div>
                      <p className="mt-3 truncate text-2xl font-semibold tracking-normal">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 grid gap-4 xl:grid-cols-2">
                {state.items.map((item) => {
                  const itemReferralCode =
                    item.authorReferralCode || referralCode;
                  const contentHref = setPathSearchParams(
                    buildPathWithReferral(
                      `/${locale}/fanletter/content/${item.contentId}`,
                      itemReferralCode,
                    ),
                    { returnTo: purchasesHref },
                  );
                  const profileHref = buildPathWithReferral(
                    `/${locale}/fanletter/creator/${item.authorReferralCode}`,
                    itemReferralCode,
                  );

                  return (
                    <PurchaseCard
                      contentHref={contentHref}
                      copy={copy}
                      item={item}
                      key={item.contentId}
                      locale={locale}
                      profileHref={profileHref}
                    />
                  );
                })}
              </div>

              {nextCursor ? (
                <div className="mt-8 flex justify-center">
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/82 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoadingMore}
                    onClick={() => {
                      void loadPurchases({ append: true, cursor: nextCursor });
                    }}
                    type="button"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    {copy.loadMore}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
