"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellPlus,
  Clapperboard,
  Clock3,
  Grid2X2,
  Heart,
  Inbox,
  Loader2,
  MessageCircleHeart,
  PlayCircle,
  RefreshCw,
  Sparkles,
  UserMinus,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import type {
  FanletterFanRequestRecord,
  FanletterFanRequestsResponse,
  FanletterFollowedCharacterRecord,
  FanletterFollowedCharactersResponse,
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
        homeBody:
          "팔로우한 캐릭터의 최신 브이로그와 다음 장면 요청을 한 화면에서 이어갑니다.",
        homeEyebrow: "Fan home",
        homeTitle: "오늘 이어볼 팬 홈",
        latest: "최신 브이로그",
        latestFrom: "최신 공개 브이로그",
        loading: "팔로우한 캐릭터를 확인하는 중입니다.",
        messageType: "응원 메시지",
        myProducedBody:
          "팬이 남긴 요청이 실제 공개 브이로그로 제작되었습니다. 바로 결과를 확인하고 다음 장면도 이어서 요청할 수 있습니다.",
        myProducedCta: "제작된 브이로그 보기",
        myProducedEyebrow: "제작 완료 알림",
        myProducedMore: "더 많은 제작 완료 요청",
        myProducedRequest: "요청 원문",
        myProducedTitle: "내 요청이 브이로그가 됐어요",
        myRequestsAdd: "다음 요청",
        myRequestsBody:
          "계정으로 남긴 요청과 이 기기에 저장된 요청 영수증을 함께 확인합니다.",
        myRequestsClaimed:
          "이 기기에 저장된 요청 영수증을 연결된 계정에 함께 보관합니다.",
        myRequestsEmptyBody:
          "캐릭터 채널에서 보고 싶은 장면을 요청하면 이곳에 진행 상태가 쌓입니다.",
        myRequestsEmptyTitle: "아직 보낸 팬 요청이 없습니다.",
        myRequestsError: "내 팬 요청 상태를 불러오지 못했습니다.",
        myRequestsLoading: "팬 요청 상태를 확인하는 중입니다.",
        myRequestsLocalNote:
          "로그인 없이 남긴 요청도 이 기기에 저장된 영수증으로 상태를 확인합니다.",
        myRequestsRetry: "요청 상태 새로고침",
        myRequestsTitle: "내 요청 상태",
        myRequestsWatch: "제작된 브이로그",
        noLatest:
          "아직 공개 브이로그가 없으면 캐릭터 채널에서 다음 장면을 먼저 요청할 수 있습니다.",
        openLatest: "최신 브이로그 보기",
        publicVlogs: "공개 브이로그",
        quickActions: "바로 이어가기",
        retry: "다시 확인",
        requestBody:
          "보고 싶은 룩, 장소, 상황을 남기면 크리에이터가 스튜디오 요청함에서 바로 확인합니다.",
        requestCta: "장면 요청",
        requestExamples: ["새로운 룩", "오늘의 장소", "팬 질문 답변"],
        requestQueue: "요청 가능한 캐릭터",
        requestTitle: "다음 브이로그를 요청하세요",
        statusNew: "접수됨",
        statusReviewed: "검토 중",
        statusUsed: "제작 완료",
        start: "채널 시작",
        studio: "스튜디오",
        summary:
          "내가 팔로우한 AI 캐릭터의 최신 공개 브이로그, 팬 요청, 채널 이동을 한 화면에서 이어봅니다.",
        title: "팬 홈",
        updated: "업데이트",
        unfollow: "팔로우 해제",
        unfollowError: "팔로우를 해제하지 못했습니다.",
        unfollowing: "해제 중",
        videos: "브이로그",
        vlogRequestType: "브이로그 요청",
        watchNow: "지금 보기",
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
        homeBody:
          "Continue into latest vlogs and next-scene requests from characters you follow.",
        homeEyebrow: "Fan home",
        homeTitle: "Your fan home today",
        latest: "Latest vlog",
        latestFrom: "Latest public vlog",
        loading: "Checking followed characters.",
        messageType: "Message",
        myProducedBody:
          "A fan request became a published vlog. Watch the result now, then leave the next scene request.",
        myProducedCta: "Watch produced vlog",
        myProducedEyebrow: "Produced alert",
        myProducedMore: "More produced requests",
        myProducedRequest: "Original request",
        myProducedTitle: "Your request became a vlog",
        myRequestsAdd: "Next request",
        myRequestsBody:
          "Track requests from your account together with receipts saved on this device.",
        myRequestsClaimed:
          "Request receipts saved on this device are now kept with your connected account.",
        myRequestsEmptyBody:
          "Request a scene from a character channel, then its progress will appear here.",
        myRequestsEmptyTitle: "No fan requests sent yet.",
        myRequestsError: "Could not load your fan request status.",
        myRequestsLoading: "Checking fan request status.",
        myRequestsLocalNote:
          "Requests left without signing in can still be tracked from receipts saved on this device.",
        myRequestsRetry: "Refresh requests",
        myRequestsTitle: "My request status",
        myRequestsWatch: "Produced vlog",
        noLatest:
          "If there is no public vlog yet, open the character channel and request the next scene first.",
        openLatest: "Open latest vlog",
        publicVlogs: "Public vlogs",
        quickActions: "Continue",
        retry: "Retry",
        requestBody:
          "Leave the look, place, or situation you want to see, and the creator can pick it up in the studio inbox.",
        requestCta: "Request scene",
        requestExamples: ["New look", "Today's place", "Fan Q&A"],
        requestQueue: "Characters open for requests",
        requestTitle: "Request the next vlog",
        statusNew: "Received",
        statusReviewed: "Reviewing",
        statusUsed: "Produced",
        start: "Start channel",
        studio: "Studio",
        summary:
          "Continue into latest public vlogs, fan requests, and channels from AI characters you follow.",
        title: "Fan Home",
        updated: "Updated",
        unfollow: "Unfollow",
        unfollowError: "Could not unfollow this character.",
        unfollowing: "Unfollowing",
        videos: "Vlogs",
        vlogRequestType: "Vlog Request",
        watchNow: "Watch now",
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

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
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

      <div className="flex items-center gap-2">
        <FanletterAccountStatusLink locale={locale} referralCode={referralCode} />
        <Link
          className="hidden h-10 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 lg:inline-flex"
          href={startHref}
        >
          {copy.start}
        </Link>
      </div>
    </header>
  );
}

function FollowedCharacterCard({
  character,
  isUpdating,
  locale,
  onUnfollow,
  referralCode,
}: {
  character: FanletterFollowedCharacterRecord;
  isUpdating: boolean;
  locale: Locale;
  onUnfollow: (character: FanletterFollowedCharacterRecord) => void;
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
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            disabled={isUpdating}
            onClick={() => {
              onUnfollow(character);
            }}
            type="button"
          >
            {isUpdating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserMinus className="size-4" />
            )}
            {isUpdating ? copy.unfollowing : copy.unfollow}
          </button>
        </div>
      </div>
    </article>
  );
}

function FanHomeDashboard({
  characters,
  locale,
  referralCode,
}: {
  characters: FanletterFollowedCharacterRecord[];
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const sortedByLatest = [...characters].sort(
    (left, right) =>
      toTimestamp(right.latestContent?.publishedAt ?? right.updatedAt) -
      toTimestamp(left.latestContent?.publishedAt ?? left.updatedAt),
  );
  const featured = sortedByLatest[0] ?? characters[0];

  if (!featured) {
    return null;
  }

  const latest = featured.latestContent;
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/creator/${featured.referralCode}`,
    referralCode ?? featured.referralCode,
  );
  const requestHref = `${channelHref}#fan-requests`;
  const watchHref = latest
    ? buildPathWithReferral(
        `/${locale}/fanletter/content/${latest.contentId}`,
        referralCode ?? featured.referralCode,
      )
    : channelHref;
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    referralCode,
  );
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    referralCode,
  );
  const requestCharacters = sortedByLatest.slice(0, 4);
  const quickActions = [
    {
      href: watchHref,
      icon: PlayCircle,
      label: copy.watchNow,
    },
    {
      href: requestHref,
      icon: MessageCircleHeart,
      label: copy.requestCta,
    },
    {
      href: feedHref,
      icon: Sparkles,
      label: copy.allFeed,
    },
    {
      href: startHref,
      icon: Clapperboard,
      label: copy.start,
    },
  ];

  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
      <article className="overflow-hidden rounded-lg bg-[#07100b] text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)]">
        <div className="grid min-h-[26rem] md:grid-cols-[minmax(0,0.72fr)_minmax(0,0.88fr)]">
          <Link className="group relative min-h-[22rem] bg-black" href={watchHref}>
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
                sizes="(max-width: 768px) 100vw, 42vw"
                src={latest.coverImageUrl}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#102015_58%,#1b2d22)] text-white/70">
                <Clapperboard className="size-14 text-[#44f26e]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  FanLetter
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.16)_48%,rgba(0,0,0,0.76)_100%)]" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-black">
              <PlayCircle className="size-3.5" />
              {copy.latestFrom}
            </span>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
              <CharacterAvatar
                imageUrl={featured.avatarImageUrl}
                name={featured.characterName}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {featured.characterName}
                </p>
                <p className="mt-1 text-xs font-medium text-white/58">
                  {formatDate(latest?.publishedAt ?? null, locale) ??
                    formatDate(featured.updatedAt, locale) ??
                    "FanLetter"}
                </p>
              </div>
            </div>
          </Link>

          <div className="flex min-w-0 flex-col justify-between p-5 sm:p-6">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                {copy.homeEyebrow}
              </p>
              <h2 className="mt-3 break-words text-[2.05rem] font-semibold leading-[1.05] tracking-normal [overflow-wrap:anywhere] sm:text-[2.75rem] sm:[word-break:keep-all]">
                {latest?.title ?? copy.homeTitle}
              </h2>
              <p className="mt-4 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
                {copy.homeBody}
              </p>
              <p className="mt-3 text-sm font-medium leading-6 text-white/48">
                {latest?.summary || copy.noLatest}
              </p>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/38">
                {copy.quickActions}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                      href={action.href}
                      key={action.label}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{action.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </article>

      <aside className="rounded-lg border border-black/10 bg-white p-5 text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            <MessageCircleHeart className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#1f7c38]">
              Fan Request
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-normal [word-break:keep-all]">
              {copy.requestTitle}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-black/58">
              {copy.requestBody}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {copy.requestExamples.map((example) => (
            <span
              className="rounded-full border border-black/10 bg-[#f6f8f4] px-3 py-1 text-xs font-semibold text-black/56"
              key={example}
            >
              {example}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-black/42">
            {copy.requestQueue}
          </p>
          <div className="mt-3 grid gap-2">
            {requestCharacters.map((character) => {
              const itemChannelHref = buildPathWithReferral(
                `/${locale}/fanletter/creator/${character.referralCode}`,
                referralCode ?? character.referralCode,
              );
              const itemRequestHref = `${itemChannelHref}#fan-requests`;

              return (
                <Link
                  className="group flex min-w-0 items-center gap-3 rounded-lg border border-black/10 bg-[#f6f8f4] p-3 transition hover:border-[#29d85f]/60 hover:bg-white"
                  href={itemRequestHref}
                  key={character.referralCode}
                >
                  <CharacterAvatar
                    imageUrl={character.avatarImageUrl}
                    name={character.characterName}
                    sizeClassName="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {character.characterName}
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-black/48">
                      {character.latestContent?.title ?? character.referralCode}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-black/32 transition group-hover:text-[#1f7c38]" />
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </section>
  );
}

function ProducedRequestHighlight({
  locale,
  referralCode,
  requests,
}: {
  locale: Locale;
  referralCode: string | null;
  requests: FanletterFanRequestRecord[];
}) {
  const copy = getCopy(locale);
  const producedRequests = requests
    .filter((request) => request.status === "used" && request.usedContentId)
    .slice(0, 3);
  const featuredRequest = producedRequests[0] ?? null;

  if (!featuredRequest?.usedContentId) {
    return null;
  }

  const featuredHref = buildPathWithReferral(
    `/${locale}/fanletter/content/${featuredRequest.usedContentId}`,
    referralCode ?? featuredRequest.creatorReferralCode,
  );

  return (
    <section className="mb-8 overflow-hidden rounded-lg bg-[#07100b] text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.46fr)]">
        <div className="p-5 sm:p-6 lg:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
              <BadgeCheck className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                {copy.myProducedEyebrow}
              </p>
              <h2 className="mt-3 break-words text-[2rem] font-semibold leading-[1.05] tracking-normal [overflow-wrap:anywhere] sm:text-[2.75rem] sm:[word-break:keep-all]">
                {copy.myProducedTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
                {copy.myProducedBody}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/8 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#44f26e] px-3 py-1 text-[0.68rem] font-semibold text-black">
                {copy.myProducedRequest}
              </span>
              <span className="text-xs font-semibold text-white/38">
                {formatDate(featuredRequest.updatedAt, locale) ??
                  formatDate(featuredRequest.createdAt, locale) ??
                  "FanLetter"}
              </span>
            </div>
            <h3 className="mt-4 truncate text-sm font-semibold text-[#b9ffc8]">
              {featuredRequest.characterName}
            </h3>
            <p className="mt-2 line-clamp-3 break-words text-base font-semibold leading-7 text-white [overflow-wrap:anywhere]">
              {featuredRequest.body}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
              href={featuredHref}
            >
              <PlayCircle className="size-4" />
              {copy.myProducedCta}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
              href={`${buildPathWithReferral(
                `/${locale}/fanletter/creator/${featuredRequest.creatorReferralCode}`,
                referralCode ?? featuredRequest.creatorReferralCode,
              )}#fan-requests`}
            >
              <MessageCircleHeart className="size-4" />
              {copy.myRequestsAdd}
            </Link>
          </div>
        </div>

        <aside className="border-t border-white/10 bg-white/[0.055] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
            {copy.myProducedMore}
          </p>
          <div className="mt-4 grid gap-3">
            {producedRequests.map((request) => {
              const contentHref = request.usedContentId
                ? buildPathWithReferral(
                    `/${locale}/fanletter/content/${request.usedContentId}`,
                    referralCode ?? request.creatorReferralCode,
                  )
                : null;

              if (!contentHref) {
                return null;
              }

              return (
                <Link
                  className="group rounded-lg border border-white/10 bg-black/18 p-4 transition hover:border-[#44f26e]/42 hover:bg-black/26"
                  href={contentHref}
                  key={request.requestId}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1 text-[0.68rem] font-semibold text-[#b9ffc8]">
                      {copy.statusUsed}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-white/34 transition group-hover:text-[#44f26e]" />
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold text-white">
                    {request.characterName}
                  </p>
                  <p className="mt-2 line-clamp-2 break-words text-sm font-medium leading-6 text-white/58 [overflow-wrap:anywhere]">
                    {request.body}
                  </p>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

function MyFanRequestsPanel({
  characters,
  error,
  hasLocalReceipts,
  isReceiptClaimed,
  locale,
  onRetry,
  referralCode,
  requests,
  status,
}: {
  characters: FanletterFollowedCharacterRecord[];
  error: string | null;
  hasLocalReceipts: boolean;
  isReceiptClaimed: boolean;
  locale: Locale;
  onRetry: () => void;
  referralCode: string | null;
  requests: FanletterFanRequestRecord[];
  status: LoadStatus;
}) {
  const copy = getCopy(locale);
  const fallbackCharacter = characters[0] ?? null;
  const fallbackRequestHref = fallbackCharacter
    ? `${buildPathWithReferral(
        `/${locale}/fanletter/creator/${fallbackCharacter.referralCode}`,
        referralCode ?? fallbackCharacter.referralCode,
      )}#fan-requests`
    : buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const visibleRequests = requests.slice(0, 4);

  function getStatusView(request: FanletterFanRequestRecord) {
    if (request.status === "used") {
      return {
        Icon: BadgeCheck,
        className: "border-[#29d85f]/32 bg-[#44f26e] text-black",
        label: copy.statusUsed,
      };
    }

    if (request.status === "reviewed") {
      return {
        Icon: Clock3,
        className: "border-[#29d85f]/22 bg-[#44f26e]/12 text-[#1f7c38]",
        label: copy.statusReviewed,
      };
    }

    return {
      Icon: Inbox,
      className: "border-black/10 bg-[#f6f8f4] text-black/58",
      label: copy.statusNew,
    };
  }

  return (
    <section
      className="mb-8 rounded-lg border border-black/10 bg-white p-5 text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)] sm:p-6"
      id="fanletter-my-requests"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#1f7c38]">
            Fan Request
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-normal [word-break:keep-all]">
            {copy.myRequestsTitle}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-black/58">
            {copy.myRequestsBody}
          </p>
          {hasLocalReceipts ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-[#1f7c38]">
              {isReceiptClaimed ? copy.myRequestsClaimed : copy.myRequestsLocalNote}
            </p>
          ) : null}
        </div>
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "loading"}
          onClick={onRetry}
          type="button"
        >
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {copy.myRequestsRetry}
        </button>
      </div>

      {status === "loading" ? (
        <div className="mt-5 rounded-lg border border-black/10 bg-[#f6f8f4] p-4">
          <div className="flex items-center gap-3 text-sm font-semibold text-black/56">
            <Loader2 className="size-4 animate-spin text-[#1f7c38]" />
            {copy.myRequestsLoading}
          </div>
        </div>
      ) : status === "error" ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {error ?? copy.myRequestsError}
          </p>
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="mt-5 grid gap-4 rounded-lg border border-black/10 bg-[#f6f8f4] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h3 className="text-lg font-semibold tracking-normal">
              {copy.myRequestsEmptyTitle}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-black/56">
              {copy.myRequestsEmptyBody}
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
            href={fallbackRequestHref}
          >
            {copy.requestCta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleRequests.map((request) => {
            const statusView = getStatusView(request);
            const StatusIcon = statusView.Icon;
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
              ? copy.myRequestsWatch
              : copy.myRequestsAdd;

            return (
              <article
                className="rounded-lg border border-black/10 bg-[#f6f8f4] p-4"
                key={request.requestId}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.68rem] font-semibold ${statusView.className}`}
                  >
                    <StatusIcon className="size-3.5" />
                    {statusView.label}
                  </span>
                  <span className="text-xs font-semibold text-black/38">
                    {formatDate(request.updatedAt, locale) ??
                      formatDate(request.createdAt, locale) ??
                      "FanLetter"}
                  </span>
                </div>
                <h3 className="mt-4 truncate text-sm font-semibold text-[#1f7c38]">
                  {request.characterName}
                </h3>
                <p className="mt-2 line-clamp-3 break-words text-sm font-semibold leading-6 text-black/78 [overflow-wrap:anywhere]">
                  {request.body}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-black/40">
                    {request.requestType === "message"
                      ? copy.messageType
                      : copy.vlogRequestType}
                  </p>
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-3 text-sm font-semibold text-black transition hover:border-[#29d85f]/60"
                    href={actionHref}
                  >
                    {actionLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
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
  const accountStatus = useFanletterAccountStatus({
    disconnectedResolveGraceMs: 3000,
    resolveGraceMs: 3000,
  });
  const { accountAddress, connection, memberSession } = accountStatus;
  const [characters, setCharacters] = useState<FanletterFollowedCharacterRecord[]>(
    [],
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [emailSyncAttempted, setEmailSyncAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fanRequestError, setFanRequestError] = useState<string | null>(null);
  const [fanRequests, setFanRequests] = useState<FanletterFanRequestRecord[]>([]);
  const [fanRequestStatus, setFanRequestStatus] = useState<LoadStatus>("idle");
  const [receiptRequestError, setReceiptRequestError] = useState<string | null>(
    null,
  );
  const [receiptRequestIds, setReceiptRequestIds] = useState<string[]>([]);
  const [receiptRequests, setReceiptRequests] = useState<
    FanletterFanRequestRecord[]
  >([]);
  const [receiptRequestStatus, setReceiptRequestStatus] =
    useState<LoadStatus>("idle");
  const [receiptRequestsClaimed, setReceiptRequestsClaimed] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [updatingReferralCode, setUpdatingReferralCode] = useState<string | null>(
    null,
  );
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
  const trackedFanRequests = useMemo(
    () => mergeFanRequests([fanRequests, receiptRequests]),
    [fanRequests, receiptRequests],
  );
  const trackedFanRequestStatus: LoadStatus =
    fanRequestStatus === "loading" || receiptRequestStatus === "loading"
      ? "loading"
      : trackedFanRequests.length > 0
        ? "ready"
        : fanRequestStatus === "error" || receiptRequestStatus === "error"
          ? "error"
          : "ready";
  const trackedFanRequestError = fanRequestError ?? receiptRequestError;
  const hasLocalRequestReceipts = receiptRequestIds.length > 0;
  const hasLocalRequestTracking =
    hasLocalRequestReceipts ||
    receiptRequests.length > 0 ||
    receiptRequestStatus === "loading" ||
    receiptRequestStatus === "error";

  const loadReceiptRequests = useCallback(async () => {
    const requestIds = readFanletterRequestReceiptIds();

    setReceiptRequestIds(requestIds);
    setReceiptRequestError(null);

    if (requestIds.length === 0) {
      setReceiptRequests([]);
      setReceiptRequestStatus("ready");
      return;
    }

    setReceiptRequestStatus("loading");

    try {
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
        }),
        copy.myRequestsError,
      );

      setReceiptRequests(data.requests);
      setReceiptRequestStatus("ready");
    } catch (requestError) {
      setReceiptRequests([]);
      setReceiptRequestError(
        requestError instanceof Error ? requestError.message : copy.myRequestsError,
      );
      setReceiptRequestStatus("error");
    }
  }, [copy.myRequestsError]);

  const loadFollowing = useCallback(async () => {
    if (!accountAddress) {
      setEmailSyncAttempted(false);
      setFanRequestError(null);
      setFanRequests([]);
      setFanRequestStatus("idle");
      setReceiptRequestsClaimed(false);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setActionError(null);
    setError(null);
    setFanRequestError(null);
    setFanRequestStatus("loading");

    try {
      let resolvedEmail = memberSession.email ?? email;

      if (!resolvedEmail) {
        resolvedEmail = await getThirdwebUserEmail({ client: thirdwebClient });
      }

      setEmail(resolvedEmail ?? null);
      setEmailSyncAttempted(true);

      if (!resolvedEmail) {
        setFanRequestStatus("idle");
        setStatus("idle");
        return;
      }

      const localRequestIds = readFanletterRequestReceiptIds();

      setReceiptRequestIds(localRequestIds);

      if (localRequestIds.length > 0) {
        try {
          const claimData = await readApiJson<FanletterFanRequestsResponse>(
            await fetch("/api/fanletter/requests/receipts", {
              body: JSON.stringify({
                email: resolvedEmail,
                pageSize: 12,
                requestIds: localRequestIds,
                walletAddress: accountAddress,
              }),
              headers: {
                "Content-Type": "application/json",
              },
              method: "PATCH",
            }),
            copy.myRequestsError,
          );

          setReceiptRequests(claimData.requests);
          setReceiptRequestStatus("ready");
          setReceiptRequestError(null);
          setReceiptRequestsClaimed(claimData.requests.length > 0);
        } catch (claimError) {
          setReceiptRequestsClaimed(false);
          setReceiptRequestError(
            claimError instanceof Error ? claimError.message : copy.myRequestsError,
          );
          setReceiptRequestStatus("error");
        }
      } else {
        setReceiptRequestsClaimed(false);
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

      try {
        const requestParams = new URLSearchParams({
          email: resolvedEmail,
          pageSize: "8",
          walletAddress: accountAddress,
        });
        const requestData = await readApiJson<FanletterFanRequestsResponse>(
          await fetch(`/api/fanletter/requests/mine?${requestParams.toString()}`, {
            cache: "no-store",
          }),
          copy.myRequestsError,
        );

        setFanRequests(requestData.requests);
        setFanRequestStatus("ready");
      } catch (requestError) {
        setFanRequests([]);
        setFanRequestError(
          requestError instanceof Error
            ? requestError.message
            : copy.myRequestsError,
        );
        setFanRequestStatus("error");
      }

      setStatus("ready");
    } catch (loadError) {
      setEmailSyncAttempted(true);
      setError(loadError instanceof Error ? loadError.message : copy.errorBody);
      setFanRequestStatus("idle");
      setStatus("error");
    }
  }, [
    accountAddress,
    copy.errorBody,
    copy.myRequestsError,
    email,
    locale,
    memberSession.email,
  ]);

  const unfollowCharacter = useCallback(
    async (character: FanletterFollowedCharacterRecord) => {
      const resolvedEmail = email ?? memberSession.email;

      if (!accountAddress || !resolvedEmail || updatingReferralCode) {
        return;
      }

      const previousCharacters = characters;

      setActionError(null);
      setUpdatingReferralCode(character.referralCode);
      setCharacters((current) =>
        current.filter((item) => item.referralCode !== character.referralCode),
      );

      try {
        await readApiJson(
          await fetch("/api/fanletter/follows", {
            body: JSON.stringify({
              action: "unfollow",
              creatorReferralCode: character.referralCode,
              email: resolvedEmail,
              walletAddress: accountAddress,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          }),
          copy.unfollowError,
        );
      } catch (unfollowError) {
        setCharacters(previousCharacters);
        setActionError(
          unfollowError instanceof Error
            ? unfollowError.message
            : copy.unfollowError,
        );
      } finally {
        setUpdatingReferralCode(null);
      }
    },
    [
      accountAddress,
      characters,
      copy.unfollowError,
      email,
      memberSession.email,
      updatingReferralCode,
    ],
  );

  useEffect(() => {
    setEmailSyncAttempted(false);
  }, [accountAddress]);

  useEffect(() => {
    void loadReceiptRequests();
  }, [loadReceiptRequests]);

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

  const isWaitingForAccount =
    accountStatus.status === "checking" ||
    (connection.isConnected && !email && !emailSyncAttempted);
  const showConnect =
    !isWaitingForAccount &&
    (accountStatus.status === "disconnected" ||
      accountStatus.status === "setupMissing" ||
      accountStatus.status === "issue" ||
      !accountAddress ||
      !email);

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
                  void loadReceiptRequests();
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
          {isWaitingForAccount || status === "loading" ? (
            <StatePanel
              body={copy.loading}
              icon="loading"
              title={copy.loading}
            />
          ) : showConnect ? (
            <>
              <StatePanel
                actionHref={connectHref}
                actionLabel={copy.connect}
                body={copy.connectBody}
                icon="connect"
                title={copy.connectTitle}
              />
              <ProducedRequestHighlight
                locale={locale}
                referralCode={referralCode}
                requests={trackedFanRequests}
              />
              {hasLocalRequestTracking ? (
                <MyFanRequestsPanel
                  characters={characters}
                  error={trackedFanRequestError}
                  hasLocalReceipts={hasLocalRequestReceipts}
                  isReceiptClaimed={receiptRequestsClaimed}
                  locale={locale}
                  onRetry={() => {
                    void loadReceiptRequests();
                  }}
                  referralCode={referralCode}
                  requests={trackedFanRequests}
                  status={trackedFanRequestStatus}
                />
              ) : null}
            </>
          ) : status === "error" ? (
            <>
              <StatePanel
                actionHref={feedHref}
                actionLabel={copy.emptyCta}
                body={error ?? copy.errorBody}
                icon="error"
                onRetry={() => {
                  void loadReceiptRequests();
                  void loadFollowing();
                }}
                retryLabel={copy.retry}
                title={copy.errorBody}
              />
              <ProducedRequestHighlight
                locale={locale}
                referralCode={referralCode}
                requests={trackedFanRequests}
              />
              {hasLocalRequestTracking ? (
                <MyFanRequestsPanel
                  characters={characters}
                  error={trackedFanRequestError}
                  hasLocalReceipts={hasLocalRequestReceipts}
                  isReceiptClaimed={receiptRequestsClaimed}
                  locale={locale}
                  onRetry={() => {
                    void loadReceiptRequests();
                    void loadFollowing();
                  }}
                  referralCode={referralCode}
                  requests={trackedFanRequests}
                  status={trackedFanRequestStatus}
                />
              ) : null}
            </>
          ) : characters.length === 0 ? (
            <>
              <StatePanel
                actionHref={feedHref}
                actionLabel={copy.emptyCta}
                body={copy.emptyBody}
                icon="empty"
                title={copy.emptyTitle}
              />
              <ProducedRequestHighlight
                locale={locale}
                referralCode={referralCode}
                requests={trackedFanRequests}
              />
              <MyFanRequestsPanel
                characters={characters}
                error={trackedFanRequestError}
                hasLocalReceipts={hasLocalRequestReceipts}
                isReceiptClaimed={receiptRequestsClaimed}
                locale={locale}
                onRetry={() => {
                  void loadReceiptRequests();
                  void loadFollowing();
                }}
                referralCode={referralCode}
                requests={trackedFanRequests}
                status={trackedFanRequestStatus}
              />
            </>
          ) : (
            <>
              {actionError ? (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {actionError}
                </p>
              ) : null}
              <FanHomeDashboard
                characters={characters}
                locale={locale}
                referralCode={referralCode}
              />
              <ProducedRequestHighlight
                locale={locale}
                referralCode={referralCode}
                requests={trackedFanRequests}
              />
              <MyFanRequestsPanel
                characters={characters}
                error={trackedFanRequestError}
                hasLocalReceipts={hasLocalRequestReceipts}
                isReceiptClaimed={receiptRequestsClaimed}
                locale={locale}
                onRetry={() => {
                  void loadReceiptRequests();
                  void loadFollowing();
                }}
                referralCode={referralCode}
                requests={trackedFanRequests}
                status={trackedFanRequestStatus}
              />
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
                    isUpdating={updatingReferralCode === character.referralCode}
                    key={character.referralCode}
                    locale={locale}
                    onUnfollow={unfollowCharacter}
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
