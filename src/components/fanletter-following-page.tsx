"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellPlus,
  Clapperboard,
  Grid2X2,
  Heart,
  Loader2,
  MessageCircleHeart,
  PlayCircle,
  RefreshCw,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import { useMemberSession } from "@/components/member-session-provider";
import type {
  FanletterFollowedCharacterRecord,
  FanletterFollowedCharactersResponse,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type LoadStatus = "error" | "idle" | "loading" | "ready";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        allFeed: "전체 피드",
        channel: "채널 보기",
        connect: "계정 연결",
        connectBody:
          "팔로우한 캐릭터 목록은 연결된 FanLetter 계정 기준으로 불러옵니다.",
        connectTitle: "연결 후 팔로우 목록을 확인하세요.",
        emptyBody:
          "마음에 드는 캐릭터 채널에서 팔로우를 누르면 이곳에 최신 브이로그가 모입니다.",
        emptyCta: "캐릭터 둘러보기",
        emptyTitle: "아직 팔로우한 캐릭터가 없습니다.",
        errorBody: "팔로우 목록을 불러오지 못했습니다.",
        eyebrow: "Following",
        feed: "브이로그 피드",
        followed: "팔로우 중",
        followers: "팔로워",
        followingCount: "팔로우한 캐릭터",
        latest: "최신 브이로그",
        loading: "팔로우한 캐릭터를 확인하는 중입니다.",
        openLatest: "최신 브이로그 보기",
        publicVlogs: "공개 브이로그",
        retry: "다시 확인",
        start: "채널 시작",
        studio: "스튜디오",
        summary:
          "내가 팔로우한 AI 캐릭터의 최신 공개 브이로그와 채널을 한 화면에서 이어봅니다.",
        title: "팔로우한 캐릭터",
        updated: "업데이트",
        videos: "브이로그",
      }
    : {
        allFeed: "Full feed",
        channel: "View channel",
        connect: "Connect account",
        connectBody:
          "Followed characters are loaded from your connected FanLetter account.",
        connectTitle: "Connect to see your following list.",
        emptyBody:
          "Follow a character channel you like, then its latest vlogs will appear here.",
        emptyCta: "Browse characters",
        emptyTitle: "You are not following any characters yet.",
        errorBody: "Could not load followed characters.",
        eyebrow: "Following",
        feed: "Vlog Feed",
        followed: "Following",
        followers: "followers",
        followingCount: "Followed characters",
        latest: "Latest vlog",
        loading: "Checking followed characters.",
        openLatest: "Open latest vlog",
        publicVlogs: "Public vlogs",
        retry: "Retry",
        start: "Start channel",
        studio: "Studio",
        summary:
          "Continue into the latest public vlogs and channels from AI characters you follow.",
        title: "Followed Characters",
        updated: "Updated",
        videos: "Vlogs",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(value);
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
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

function CharacterAvatar({
  imageUrl,
  name,
  sizeClassName = "size-12",
}: {
  imageUrl: string | null;
  name: string;
  sizeClassName?: string;
}) {
  return (
    <span
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full bg-[#44f26e] bg-cover bg-center text-sm font-semibold text-black ring-2 ring-white/70`}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {imageUrl ? null : getInitial(name)}
    </span>
  );
}

function FollowingHeader({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
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

  return (
    <header className="flex items-center justify-between gap-3">
      <Link className="flex min-w-0 items-center gap-2" href={homeHref}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
          <MessageCircleHeart className="size-5" />
        </span>
        <span className="truncate text-xl font-semibold tracking-normal">
          FanLetter
        </span>
      </Link>

      <nav className="hidden items-center gap-7 text-sm font-semibold text-white/74 md:flex">
        <Link href={feedHref}>{copy.feed}</Link>
        <Link className="text-[#44f26e]" href={followingHref}>
          {copy.title}
        </Link>
        <Link href={studioHref}>{copy.studio}</Link>
        <Link href={startHref}>{copy.start}</Link>
      </nav>

      <Link
        className="inline-flex h-10 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36"
        href={startHref}
      >
        {copy.start}
      </Link>
    </header>
  );
}

function FollowedCharacterCard({
  character,
  locale,
  referralCode,
}: {
  character: FanletterFollowedCharacterRecord;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/creator/${character.referralCode}`,
    referralCode ?? character.referralCode,
  );
  const latestHref = character.latestContent
    ? buildPathWithReferral(
        `/${locale}/fanletter/content/${character.latestContent.contentId}`,
        referralCode ?? character.referralCode,
      )
    : channelHref;
  const latest = character.latestContent;
  const metrics = [
    {
      label: copy.publicVlogs,
      value: character.publicContentCount,
    },
    {
      label: copy.followers,
      value: character.followerCount,
    },
  ];

  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)]">
      <Link className="group block" href={latestHref}>
        <div className="relative aspect-[9/13] overflow-hidden bg-[#07100b]">
          {latest?.primaryVideoUrl ? (
            <FanletterAutoplayVideo
              ariaHidden
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
              poster={latest.coverImageUrl ?? undefined}
              src={latest.primaryVideoUrl}
            />
          ) : latest?.coverImageUrl ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover transition duration-500 group-hover:scale-[1.025]"
              fill
              sizes="(max-width: 640px) 100vw, 26vw"
              src={latest.coverImageUrl}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#111b15_52%,#1b2d22)] text-white/72">
              <Clapperboard className="size-14 text-[#44f26e]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                FanLetter
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.18)_46%,rgba(0,0,0,0.82)_100%)]" />
          <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-black">
              <BellPlus className="size-3.5" />
              {copy.followed}
            </span>
            <span className="rounded-full border border-white/16 bg-black/38 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-white">
              {formatDate(character.updatedAt, locale) ?? copy.updated}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-3">
              <CharacterAvatar
                imageUrl={character.avatarImageUrl}
                name={character.characterName}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {character.characterName}
                </p>
                <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-white/64">
                  {latest?.title ?? character.referralCode}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold leading-tight tracking-normal [overflow-wrap:anywhere]">
              {character.characterName}
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#1f7c38]">
              {character.referralCode}
            </p>
          </div>
          <UsersRound className="mt-1 size-5 shrink-0 text-black/34" />
        </div>

        <p className="mt-3 line-clamp-3 min-h-[4.5rem] break-words text-sm font-medium leading-6 text-black/56 [overflow-wrap:anywhere]">
          {character.characterSummary}
        </p>

        {character.traits.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {character.traits.slice(0, 3).map((trait) => (
              <span
                className="rounded-full border border-black/10 bg-[#f6f8f4] px-3 py-1 text-[0.68rem] font-semibold text-black/58"
                key={trait}
              >
                {trait}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div
              className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
              key={metric.label}
            >
              <p className="text-xl font-semibold leading-none">
                {formatNumber(metric.value, locale)}
              </p>
              <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-black/42">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
            href={channelHref}
          >
            <UserRound className="size-4" />
            {copy.channel}
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28"
            href={latestHref}
          >
            <PlayCircle className="size-4" />
            {copy.openLatest}
          </Link>
        </div>
      </div>
    </article>
  );
}

function LatestVlogStrip({
  characters,
  locale,
  referralCode,
}: {
  characters: FanletterFollowedCharacterRecord[];
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const items = characters
    .filter((character) => character.latestContent)
    .slice(0, 6);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-normal">
          {copy.latest}
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((character) => {
          const latest = character.latestContent;
          const href = latest
            ? buildPathWithReferral(
                `/${locale}/fanletter/content/${latest.contentId}`,
                referralCode ?? character.referralCode,
              )
            : buildPathWithReferral(
                `/${locale}/fanletter/creator/${character.referralCode}`,
                referralCode ?? character.referralCode,
              );

          return (
            <Link
              className="group grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-black/10 bg-white p-3 text-black shadow-[0_14px_34px_rgba(8,18,12,0.08)] transition hover:border-[#29d85f]/60"
              href={href}
              key={character.referralCode}
            >
              <div className="relative aspect-[9/14] overflow-hidden rounded-lg bg-[#07100b]">
                {latest?.coverImageUrl ? (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="object-cover transition duration-500 group-hover:scale-[1.025]"
                    fill
                    sizes="6rem"
                    src={latest.coverImageUrl}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#101820] text-white/52">
                    <VideoFallbackIcon />
                  </div>
                )}
              </div>
              <div className="min-w-0 self-center">
                <p className="truncate text-sm font-semibold text-[#1f7c38]">
                  {character.characterName}
                </p>
                <p className="mt-1 line-clamp-2 break-words text-base font-semibold leading-tight [overflow-wrap:anywhere]">
                  {latest?.title ?? character.referralCode}
                </p>
                <p className="mt-2 text-xs font-medium text-black/46">
                  {formatDate(latest?.publishedAt ?? null, locale) ?? "FanLetter"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function VideoFallbackIcon() {
  return <PlayCircle className="size-8 text-[#44f26e]" />;
}

function StatePanel({
  actionHref,
  actionLabel,
  body,
  icon,
  onRetry,
  retryLabel,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  icon: "connect" | "empty" | "error" | "loading";
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
}) {
  const retryButtonLabel = retryLabel ?? "Retry";
  const Icon =
    icon === "connect"
      ? WalletCards
      : icon === "error"
        ? RefreshCw
        : icon === "loading"
          ? Loader2
          : Heart;

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
        {onRetry ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28"
            onClick={onRetry}
            type="button"
          >
            <RefreshCw className="size-4" />
            {retryButtonLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function FanletterFollowingPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: 3000,
    resolveGraceMs: 3000,
    status: connectionStatus,
  });
  const [characters, setCharacters] = useState<FanletterFollowedCharacterRecord[]>(
    [],
  );
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const followingHref = buildPathWithReferral(
    `/${locale}/fanletter/following`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: followingHref },
  );
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    referralCode,
  );
  const stats = useMemo(
    () => [
      {
        icon: UsersRound,
        label: copy.followingCount,
        value: characters.length,
      },
      {
        icon: Clapperboard,
        label: copy.publicVlogs,
        value: characters.reduce(
          (sum, character) => sum + character.publicContentCount,
          0,
        ),
      },
      {
        icon: Grid2X2,
        label: copy.videos,
        value: characters.reduce(
          (sum, character) => sum + character.videoContentCount,
          0,
        ),
      },
    ],
    [characters, copy.followingCount, copy.publicVlogs, copy.videos],
  );

  const loadFollowing = useCallback(async () => {
    if (!accountAddress) {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      let resolvedEmail = memberSession.email ?? email;

      if (!resolvedEmail) {
        resolvedEmail = await getThirdwebUserEmail({ client: thirdwebClient });
      }

      setEmail(resolvedEmail ?? null);

      if (!resolvedEmail) {
        setStatus("idle");
        return;
      }

      const params = new URLSearchParams({
        email: resolvedEmail,
        locale,
        pageSize: "50",
        walletAddress: accountAddress,
      });
      const data = await readApiJson<FanletterFollowedCharactersResponse>(
        await fetch(`/api/fanletter/follows/characters?${params.toString()}`, {
          cache: "no-store",
        }),
        copy.errorBody,
      );

      setCharacters(data.characters);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.errorBody);
      setStatus("error");
    }
  }, [accountAddress, copy.errorBody, email, locale, memberSession.email]);

  useEffect(() => {
    if (!connection.isConnected) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadFollowing();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [connection.isConnected, loadFollowing]);

  const showConnect =
    connection.isDisconnected || (!connection.isResolving && !accountAddress) || !email;

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="border-b border-white/10 px-4 pb-10 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FollowingHeader locale={locale} referralCode={referralCode} />
          <div className="pt-14 sm:pt-24">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 max-w-5xl text-[2.6rem] font-semibold leading-[1.02] tracking-normal text-white [word-break:keep-all] sm:text-[4.6rem]">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
              {copy.summary}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                href={feedHref}
              >
                <Sparkles className="size-4" />
                {copy.allFeed}
              </Link>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-sm font-semibold text-white transition hover:bg-white/8"
                onClick={() => {
                  void loadFollowing();
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
          {connection.isResolving || status === "loading" ? (
            <StatePanel
              body={copy.loading}
              icon="loading"
              title={copy.loading}
            />
          ) : showConnect ? (
            <StatePanel
              actionHref={connectHref}
              actionLabel={copy.connect}
              body={copy.connectBody}
              icon="connect"
              title={copy.connectTitle}
            />
          ) : status === "error" ? (
            <StatePanel
              actionHref={feedHref}
              actionLabel={copy.emptyCta}
              body={error ?? copy.errorBody}
              icon="error"
              onRetry={() => {
                void loadFollowing();
              }}
              retryLabel={copy.retry}
              title={copy.errorBody}
            />
          ) : characters.length === 0 ? (
            <StatePanel
              actionHref={feedHref}
              actionLabel={copy.emptyCta}
              body={copy.emptyBody}
              icon="empty"
              title={copy.emptyTitle}
            />
          ) : (
            <>
              <div className="mb-8 grid gap-3 md:grid-cols-3">
                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_14px_34px_rgba(8,18,12,0.08)]"
                      key={stat.label}
                    >
                      <Icon className="size-5 text-[#1f7c38]" />
                      <p className="mt-4 text-3xl font-semibold leading-none">
                        {formatNumber(stat.value, locale)}
                      </p>
                      <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-black/42">
                        {stat.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <LatestVlogStrip
                characters={characters}
                locale={locale}
                referralCode={referralCode}
              />

              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-normal">
                  {copy.followingCount}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {characters.map((character) => (
                  <FollowedCharacterCard
                    character={character}
                    key={character.referralCode}
                    locale={locale}
                    referralCode={referralCode}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
