"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Coins,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import {
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useMemberSession } from "@/components/member-session-provider";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NEWS_SOURCE_REVEAL_FAN_UNLOCK_REWARD_POINTS,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SourceRevealReporterReward = {
  reporterAvatarImageUrl: string | null;
  reporterName: string;
  reporterReferralCode: string;
  totalRewardPoints: number;
  unlockRewardPoints: number;
  voteRewardPoints: number;
};

type SourceRevealFanReward = {
  participantCount: number;
  rewardPoints: number;
  threshold: number;
};

type SourceRevealResponse = {
  fanReward?: SourceRevealFanReward | null;
  reporterReward?: SourceRevealReporterReward | null;
  sourceReveal: FanletterNewsSourceRevealState;
};

type CelebrationSpark = {
  color: string;
  x: string;
  y: string;
};

type FanletterNewsSourceRevealVoteProps = {
  className?: string;
  connectHref: string;
  density?: "regular" | "compact" | "dock";
  initialState: FanletterNewsSourceRevealState;
  locale: Locale;
  reportId?: string;
  sourceRevealEndpoint?: string;
  tone?: "dark" | "light";
};

const UNLOCK_CELEBRATION_HIDE_MS = 2300;
const UNLOCK_CELEBRATION_REFRESH_MS = 1700;
const REPORTER_REWARD_CELEBRATION_HIDE_MS = 3600;
const REPORTER_REWARD_CELEBRATION_REFRESH_MS = 2300;

const celebrationSparks = [
  { color: "#44f26e", x: "-9.25rem", y: "-6.5rem" },
  { color: "#f8fafc", x: "-6rem", y: "-9rem" },
  { color: "#86efac", x: "-1.5rem", y: "-10rem" },
  { color: "#facc15", x: "4.75rem", y: "-8.25rem" },
  { color: "#67e8f9", x: "9rem", y: "-5.25rem" },
  { color: "#44f26e", x: "10.25rem", y: "1.25rem" },
  { color: "#ffffff", x: "6.5rem", y: "7rem" },
  { color: "#bbf7d0", x: "1.25rem", y: "9rem" },
  { color: "#facc15", x: "-4.5rem", y: "8.25rem" },
  { color: "#67e8f9", x: "-9.5rem", y: "3.5rem" },
] satisfies CelebrationSpark[];

function getCopy(locale: Locale) {
  const fanUnlockRewardPoints = formatCount(
    FANLETTER_NEWS_SOURCE_REVEAL_FAN_UNLOCK_REWARD_POINTS,
    locale,
  );

  return locale === "ko"
    ? {
        body: (count: string, threshold: string, remaining: string) =>
          `현재 ${count}/${threshold}명 참여 중입니다. ${remaining}명이 더 보고싶어요를 누르면 원본 브이로그가 열립니다. 선착순 ${threshold}명에게 오픈 포인트 ${fanUnlockRewardPoints}P가 지급됩니다.`,
        celebration: {
          body:
            "팬들의 보고싶어요가 모여 잠겨 있던 영상이 열렸습니다. 곧 원본 브이로그로 이동합니다.",
          dismiss: "바로 보기",
          eyebrow: "JACKPOT UNLOCK",
          fanRewardBody: (threshold: string) =>
            `원본 브이로그를 연 선착순 ${threshold}명 팬에게 오픈 기여 포인트가 지급됐습니다.`,
          fanRewardEyebrow: "FAN OPEN POINT",
          fanRewardTitle: "선착순 보고싶어요 보상 지급!",
          progress: (threshold: string) => `${threshold}/${threshold} 달성`,
          reward: (points: string) => `+${points}P`,
          title: "원본 브이로그 오픈 완료!",
        },
        reporterReward: {
          body:
            "누구나 팬 기자가 되어 AI 캐릭터 브이로그를 알리고 보상을 받을 수 있어요.",
          dismiss: "확인",
          eyebrow: "FAN REPORTER JACKPOT",
          reward: (points: string) => `+${points}P`,
          subtitle: (name: string) => `${name} 팬 기자에게 보상 지급`,
          title: "보고싶어요가 리포터 보상으로 연결됐어요",
          unlockBonus: (points: string) => `언락 보너스 +${points}P 포함`,
          voteReward: (points: string) => `보고싶어요 보상 +${points}P`,
        },
        cta: "보고싶어요",
        done: "참여 완료",
        eyebrow: "팬 오픈 투표",
        error: "참여를 저장하지 못했습니다.",
        loginCta: "로그인하고 보고싶어요",
        progressReady: "공개 조건 달성",
        progressRemaining: (count: string) => `공개까지 ${count}명`,
        refresh: "상태 다시 확인",
        refreshing: "확인 중",
        saving: "반영 중",
        title: `팬 6명이 보고싶어요를 누르면 원본 브이로그가 열리고 ${fanUnlockRewardPoints}P를 받습니다`,
        unlockedBody: (count: string) =>
          `${count}명의 팬 참여로 뉴스 속 원본 브이로그가 열렸습니다.`,
        unlockedTitle: "팬들이 열어낸 원본 브이로그",
        voters: {
          label: "함께 참여한 팬",
          summary: (names: string, count: string, extra: string) =>
            names
              ? Number(extra) > 0
                ? `${names} 외 ${extra}명이 보고싶어요 참여`
                : `${names} 보고싶어요 참여`
              : `${count}명이 보고싶어요 참여`,
        },
      }
    : {
        body: (count: string, threshold: string, remaining: string) =>
          `${count}/${threshold} fans have joined. The source vlog opens when ${remaining} more fan${remaining === "1" ? "" : "s"} tap want to watch. The first ${threshold} fans earn ${fanUnlockRewardPoints}P open points.`,
        celebration: {
          body:
            "Fans gathered enough want-to-watch votes to open the locked source video. The vlog is opening now.",
          dismiss: "Watch now",
          eyebrow: "JACKPOT UNLOCK",
          fanRewardBody: (threshold: string) =>
            `The first ${threshold} fans who opened the source vlog earned fan-open contribution points.`,
          fanRewardEyebrow: "FAN OPEN POINT",
          fanRewardTitle: "First fan-open reward paid!",
          progress: (threshold: string) => `${threshold}/${threshold} reached`,
          reward: (points: string) => `+${points}P`,
          title: "Source vlog unlocked!",
        },
        reporterReward: {
          body:
            "Anyone can become a fan reporter, promote AI character vlogs, and earn rewards.",
          dismiss: "Got it",
          eyebrow: "FAN REPORTER JACKPOT",
          reward: (points: string) => `+${points}P`,
          subtitle: (name: string) => `${name} earned a fan reporter reward`,
          title: "Your vote powered a reporter reward",
          unlockBonus: (points: string) => `Includes unlock bonus +${points}P`,
          voteReward: (points: string) => `Want-to-watch reward +${points}P`,
        },
        cta: "Want to watch",
        done: "Joined",
        eyebrow: "Fan open vote",
        error: "Could not save your vote.",
        loginCta: "Sign in to vote",
        progressReady: "Ready to open",
        progressRemaining: (count: string) => `${count} more to open`,
        refresh: "Check status",
        refreshing: "Checking",
        saving: "Saving",
        title: `The source vlog opens and pays ${fanUnlockRewardPoints}P when 6 fans want to watch`,
        unlockedBody: (count: string) =>
          `${count} fans opened the source vlog in this news together.`,
        unlockedTitle: "Source vlog opened by fans",
        voters: {
          label: "Fans joining in",
          summary: (names: string, count: string, extra: string) =>
            names
              ? Number(extra) > 0
                ? `${names} and ${extra} more want to watch`
                : `${names} want to watch`
              : `${count} fans want to watch`,
        },
      };
}

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getParticipantInitial(displayName: string, referralCode?: string | null) {
  return (
    displayName.trim().charAt(0) ||
    referralCode?.trim().charAt(0) ||
    "F"
  ).toUpperCase();
}

function isSourceRevealResponse(data: unknown): data is SourceRevealResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "sourceReveal" in data &&
    typeof (data as SourceRevealResponse).sourceReveal?.count === "number"
  );
}

function UnlockCelebrationOverlay({
  copy,
  fanReward,
  locale,
  onDismiss,
  prefersReducedMotion,
  thresholdLabel,
}: {
  copy: ReturnType<typeof getCopy>["celebration"];
  fanReward?: SourceRevealFanReward | null;
  locale: Locale;
  onDismiss: () => void;
  prefersReducedMotion: boolean;
  thresholdLabel: string;
}) {
  const rewardPointsLabel = fanReward
    ? formatCount(fanReward.rewardPoints, locale)
    : null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[160] flex items-center justify-center overflow-hidden bg-black/46 px-4 py-8 text-white backdrop-blur-[3px]"
      role="status"
    >
      <button
        aria-label={copy.dismiss}
        className="absolute inset-0 cursor-default"
        onClick={onDismiss}
        type="button"
      />
      {prefersReducedMotion ? null : (
        <div className="pointer-events-none absolute left-1/2 top-1/2">
          <div className="celebration-burst">
            {celebrationSparks.map((spark, index) => (
              <span
                className="celebration-spark"
                key={`${spark.x}-${spark.y}-${index}`}
                style={
                  {
                    "--celebration-color": spark.color,
                    "--spark-x": spark.x,
                    "--spark-y": spark.y,
                    animationDelay: `${index * 34}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
      )}
      <div className="relative w-full max-w-sm overflow-hidden rounded-[1.35rem] border border-white/20 bg-[#07100b]/92 p-5 text-center shadow-[0_34px_110px_rgba(0,0,0,0.48)]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(68,242,110,0.8),transparent)]" />
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#44f26e] text-black shadow-[0_0_38px_rgba(68,242,110,0.5)] motion-safe:animate-pulse motion-reduce:animate-none">
          <Sparkles className="size-7" />
        </div>
        <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.24em] text-[#9bffad]">
          {fanReward ? copy.fanRewardEyebrow : copy.eyebrow}
        </p>
        <div className="mx-auto mt-3 inline-grid grid-cols-[auto_auto_auto] items-center gap-2 rounded-full border border-[#44f26e]/35 bg-[#44f26e]/12 px-4 py-2 font-black text-[#44f26e] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          <span className="text-2xl leading-none">{thresholdLabel}</span>
          <span className="text-white/46">/</span>
          <span className="text-2xl leading-none">{thresholdLabel}</span>
        </div>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-white/52">
          {copy.progress(thresholdLabel)}
        </p>
        {fanReward && rewardPointsLabel ? (
          <div className="mx-auto mt-3 flex w-max items-center justify-center gap-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff7a8,#facc15_48%,#44f26e_100%)] px-5 py-2 text-black shadow-[0_0_38px_rgba(250,204,21,0.36)]">
            <Coins className="size-5" />
            <span className="text-2xl font-black leading-none">
              {copy.reward(rewardPointsLabel)}
            </span>
          </div>
        ) : null}
        <h2 className="mt-4 text-2xl font-black leading-tight [word-break:keep-all]">
          {fanReward ? copy.fanRewardTitle : copy.title}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/68 [word-break:keep-all]">
          {fanReward ? copy.fanRewardBody(thresholdLabel) : copy.body}
        </p>
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-black text-black transition hover:bg-[#69ff8c]"
          onClick={onDismiss}
          type="button"
        >
          {copy.dismiss}
        </button>
      </div>
    </div>
  );
}

function ReporterRewardCelebrationOverlay({
  copy,
  locale,
  onDismiss,
  prefersReducedMotion,
  reward,
}: {
  copy: ReturnType<typeof getCopy>["reporterReward"];
  locale: Locale;
  onDismiss: () => void;
  prefersReducedMotion: boolean;
  reward: SourceRevealReporterReward;
}) {
  const reporterInitial =
    reward.reporterName.trim().charAt(0).toUpperCase() ||
    reward.reporterReferralCode.trim().charAt(0).toUpperCase() ||
    "F";
  const totalRewardLabel = formatCount(reward.totalRewardPoints, locale);
  const voteRewardLabel = formatCount(reward.voteRewardPoints, locale);
  const unlockRewardLabel = formatCount(reward.unlockRewardPoints, locale);

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[170] flex items-center justify-center overflow-hidden bg-black/38 px-4 py-8 text-white backdrop-blur-[4px]"
      role="status"
    >
      <button
        aria-label={copy.dismiss}
        className="absolute inset-0 cursor-default"
        onClick={onDismiss}
        type="button"
      />
      {prefersReducedMotion ? null : (
        <div className="pointer-events-none absolute left-1/2 top-1/2">
          <div className="celebration-burst">
            {celebrationSparks.map((spark, index) => (
              <span
                className="celebration-spark"
                key={`${spark.x}-${spark.y}-${index}`}
                style={
                  {
                    "--celebration-color":
                      index % 3 === 0 ? "#facc15" : spark.color,
                    "--spark-x": spark.x,
                    "--spark-y": spark.y,
                    animationDelay: `${index * 28}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
      )}
      <div className="relative w-full max-w-sm overflow-hidden rounded-[1.35rem] border border-white/22 bg-[#07100b]/90 p-5 text-center shadow-[0_34px_110px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(250,204,21,0.9),rgba(68,242,110,0.75),transparent)]" />
        <div className="mx-auto flex w-max items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2">
          <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#44f26e] text-base font-black text-black ring-1 ring-white/16">
            {reward.reporterAvatarImageUrl ? (
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover"
                fill
                sizes="2.75rem"
                src={reward.reporterAvatarImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(
                  reward.reporterAvatarImageUrl,
                )}
              />
            ) : (
              reporterInitial
            )}
          </span>
          <span className="min-w-0 text-left">
            <span className="block max-w-[12rem] truncate text-sm font-black">
              {reward.reporterName}
            </span>
            <span className="block truncate text-[0.66rem] font-bold text-white/48">
              @{reward.reporterReferralCode}
            </span>
          </span>
        </div>
        <p className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#facc15]">
          {copy.eyebrow}
        </p>
        <div className="mx-auto mt-3 flex size-20 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff7a8,#facc15_45%,#44f26e_100%)] text-black shadow-[0_0_46px_rgba(250,204,21,0.44)] motion-safe:animate-pulse motion-reduce:animate-none">
          <Trophy className="size-10" />
        </div>
        <p className="mt-3 text-4xl font-black leading-none text-[#f8fafc]">
          {copy.reward(totalRewardLabel)}
        </p>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[#9bffad]">
          {copy.subtitle(reward.reporterName)}
        </p>
        <h2 className="mt-4 text-2xl font-black leading-tight [word-break:keep-all]">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/68 [word-break:keep-all]">
          {copy.body}
        </p>
        <div className="mt-4 grid gap-2 text-left">
          <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-white/78">
            <span className="inline-flex items-center gap-2">
              <HeartHandshake className="size-4 text-[#44f26e]" />
              {copy.voteReward(voteRewardLabel)}
            </span>
            <Coins className="size-4 text-[#facc15]" />
          </div>
          {reward.unlockRewardPoints > 0 ? (
            <div className="flex items-center justify-between rounded-full border border-[#facc15]/24 bg-[#facc15]/12 px-3 py-2 text-xs font-black text-[#fff2a8]">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-4" />
                {copy.unlockBonus(unlockRewardLabel)}
              </span>
              <Coins className="size-4" />
            </div>
          ) : null}
        </div>
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-black text-black transition hover:bg-[#69ff8c]"
          onClick={onDismiss}
          type="button"
        >
          {copy.dismiss}
        </button>
      </div>
    </div>
  );
}

function SourceRevealParticipantStack({
  copy,
  isCompact,
  isDark,
  locale,
  participants,
  totalCount,
}: {
  copy: ReturnType<typeof getCopy>["voters"];
  isCompact: boolean;
  isDark: boolean;
  locale: Locale;
  participants: FanletterNewsSourceRevealState["participants"];
  totalCount: number;
}) {
  if (participants.length === 0 || totalCount <= 0) {
    return null;
  }

  const visibleParticipants = participants.slice(0, 6);
  const extraCount = Math.max(0, totalCount - visibleParticipants.length);
  const visibleNames = visibleParticipants
    .slice(0, 2)
    .map((participant) => participant.displayName.trim())
    .filter(Boolean)
    .join(", ");
  const totalLabel = formatCount(totalCount, locale);
  const extraLabel = formatCount(extraCount, locale);

  return (
    <div
      className={cn(
        "mt-3 flex items-center gap-3 rounded-full border px-2.5 py-2",
        isDark
          ? "border-white/12 bg-white/[0.055] text-white"
          : "border-black/10 bg-black/[0.035] text-[#111510]",
        isCompact && "mt-2",
      )}
    >
      <div className="flex shrink-0 -space-x-2">
        {visibleParticipants.map((participant) => {
          const initial = getParticipantInitial(
            participant.displayName,
            participant.referralCode,
          );

          return (
            <span
              className={cn(
                "relative flex size-7 items-center justify-center overflow-hidden rounded-full border text-[0.68rem] font-black",
                isDark
                  ? "border-black bg-[#44f26e] text-black"
                  : "border-white bg-[#111510] text-white",
              )}
              key={`${participant.referralCode ?? participant.displayName}-${participant.requestedAt ?? initial}`}
              title={participant.displayName}
            >
              {participant.avatarImageUrl ? (
                <Image
                  alt={participant.displayName}
                  className="object-cover"
                  fill
                  sizes="1.75rem"
                  src={participant.avatarImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    participant.avatarImageUrl,
                  )}
                />
              ) : (
                initial
              )}
            </span>
          );
        })}
        {extraCount > 0 ? (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border text-[0.62rem] font-black",
              isDark
                ? "border-black bg-white text-black"
                : "border-white bg-[#44f26e] text-black",
            )}
          >
            +{extraLabel}
          </span>
        ) : null}
      </div>
      <p className="min-w-0 text-xs font-bold leading-4">
        <span
          className={cn(
            "block truncate text-[0.58rem] font-black uppercase tracking-[0.13em]",
            isDark ? "text-[#9bffad]" : "text-[#16702e]",
          )}
        >
          {copy.label}
        </span>
        <span
          className={cn(
            "block truncate",
            isDark ? "text-white/62" : "text-black/56",
          )}
        >
          {copy.summary(visibleNames, totalLabel, extraLabel)}
        </span>
      </p>
    </div>
  );
}

export function FanletterNewsSourceRevealVote({
  className,
  connectHref,
  density = "regular",
  initialState,
  locale,
  reportId,
  sourceRevealEndpoint,
  tone = "dark",
}: FanletterNewsSourceRevealVoteProps) {
  const copy = getCopy(locale);
  const router = useRouter();
  const memberSession = useMemberSession();
  const [state, setState] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);
  const [unlockFanReward, setUnlockFanReward] =
    useState<SourceRevealFanReward | null>(null);
  const [reporterRewardCelebration, setReporterRewardCelebration] =
    useState<SourceRevealReporterReward | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const voteEndpoint =
    sourceRevealEndpoint ??
    (reportId
      ? `/api/fanletter/news-reports/${encodeURIComponent(reportId)}/source-reveal`
      : null);
  const stateRef = useRef(initialState);
  const hideCelebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const refreshCelebrationTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const hideReporterRewardTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const refreshReporterRewardTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const shouldRefreshAfterCelebrationRef = useRef(false);
  const shouldRefreshAfterReporterRewardRef = useRef(false);
  const hasCelebratedUnlockRef = useRef(initialState.unlocked);

  const clearCelebrationTimers = useCallback(() => {
    if (hideCelebrationTimeoutRef.current) {
      clearTimeout(hideCelebrationTimeoutRef.current);
      hideCelebrationTimeoutRef.current = null;
    }

    if (refreshCelebrationTimeoutRef.current) {
      clearTimeout(refreshCelebrationTimeoutRef.current);
      refreshCelebrationTimeoutRef.current = null;
    }
  }, []);

  const clearReporterRewardTimers = useCallback(() => {
    if (hideReporterRewardTimeoutRef.current) {
      clearTimeout(hideReporterRewardTimeoutRef.current);
      hideReporterRewardTimeoutRef.current = null;
    }

    if (refreshReporterRewardTimeoutRef.current) {
      clearTimeout(refreshReporterRewardTimeoutRef.current);
      refreshReporterRewardTimeoutRef.current = null;
    }
  }, []);

  const dismissUnlockCelebration = useCallback(() => {
    const shouldRefresh = shouldRefreshAfterCelebrationRef.current;

    clearCelebrationTimers();
    shouldRefreshAfterCelebrationRef.current = false;
    setShowUnlockCelebration(false);
    setUnlockFanReward(null);

    if (shouldRefresh) {
      router.refresh();
    }
  }, [clearCelebrationTimers, router]);

  const dismissReporterRewardCelebration = useCallback(() => {
    const shouldRefresh = shouldRefreshAfterReporterRewardRef.current;

    clearReporterRewardTimers();
    shouldRefreshAfterReporterRewardRef.current = false;
    setReporterRewardCelebration(null);

    if (shouldRefresh) {
      router.refresh();
    }
  }, [clearReporterRewardTimers, router]);

  const triggerUnlockCelebration = useCallback(
    (fanReward?: SourceRevealFanReward | null) => {
      clearCelebrationTimers();
      shouldRefreshAfterCelebrationRef.current = true;
      setUnlockFanReward(fanReward ?? null);
      setShowUnlockCelebration(true);

      refreshCelebrationTimeoutRef.current = setTimeout(() => {
        shouldRefreshAfterCelebrationRef.current = false;
        router.refresh();
      }, prefersReducedMotion ? 900 : UNLOCK_CELEBRATION_REFRESH_MS);
      hideCelebrationTimeoutRef.current = setTimeout(() => {
        setShowUnlockCelebration(false);
        setUnlockFanReward(null);
      }, prefersReducedMotion ? 1600 : UNLOCK_CELEBRATION_HIDE_MS);
    },
    [clearCelebrationTimers, prefersReducedMotion, router],
  );

  const triggerReporterRewardCelebration = useCallback(
    ({
      refreshAfterDismiss,
      reward,
    }: {
      refreshAfterDismiss: boolean;
      reward: SourceRevealReporterReward;
    }) => {
      clearReporterRewardTimers();
      shouldRefreshAfterReporterRewardRef.current = refreshAfterDismiss;
      setReporterRewardCelebration(reward);

      if (refreshAfterDismiss) {
        refreshReporterRewardTimeoutRef.current = setTimeout(() => {
          shouldRefreshAfterReporterRewardRef.current = false;
          router.refresh();
        }, prefersReducedMotion ? 1100 : REPORTER_REWARD_CELEBRATION_REFRESH_MS);
      }

      hideReporterRewardTimeoutRef.current = setTimeout(() => {
        setReporterRewardCelebration(null);
      }, prefersReducedMotion ? 2100 : REPORTER_REWARD_CELEBRATION_HIDE_MS);
    },
    [clearReporterRewardTimers, prefersReducedMotion, router],
  );

  const applySourceRevealState = useCallback(
    (
      nextState: FanletterNewsSourceRevealState,
      options?: { celebrateOnUnlock?: boolean; refreshOnUnlock?: boolean },
    ) => {
      const unlockedByThisUpdate = !stateRef.current.unlocked && nextState.unlocked;
      const shouldRefresh =
        options?.refreshOnUnlock === true &&
        unlockedByThisUpdate &&
        nextState.unlocked;
      const shouldCelebrate =
        options?.celebrateOnUnlock === true &&
        unlockedByThisUpdate &&
        !hasCelebratedUnlockRef.current;

      stateRef.current = nextState;
      setState(nextState);

      if (shouldCelebrate) {
        hasCelebratedUnlockRef.current = true;
        triggerUnlockCelebration();
        return;
      }

      if (shouldRefresh) {
        router.refresh();
      }
    },
    [router, triggerUnlockCelebration],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearCelebrationTimers();
      clearReporterRewardTimers();
    };
  }, [clearCelebrationTimers, clearReporterRewardTimers]);

  const refreshSourceRevealState = useCallback(
    async (
      options?: {
        controller?: AbortController;
        refreshOnUnlock?: boolean;
        setLoading?: Dispatch<SetStateAction<boolean>>;
        surfaceError?: boolean;
      },
    ) => {
      if (!voteEndpoint) {
        return;
      }

      options?.setLoading?.(true);

      try {
        const response = await fetch(voteEndpoint, {
          cache: "no-store",
          method: "GET",
          signal: options?.controller?.signal,
        });
        const data = (await response.json().catch(() => null)) as unknown;

        if (!response.ok || !isSourceRevealResponse(data)) {
          throw new Error(copy.error);
        }

        applySourceRevealState(data.sourceReveal, {
          refreshOnUnlock: options?.refreshOnUnlock,
        });
      } catch (refreshError) {
        if (
          refreshError instanceof DOMException &&
          refreshError.name === "AbortError"
        ) {
          return;
        }

        if (options?.surfaceError) {
          setError(
            refreshError instanceof Error ? refreshError.message : copy.error,
          );
        }
      } finally {
        options?.setLoading?.(false);
      }
    },
    [applySourceRevealState, copy.error, voteEndpoint],
  );

  useEffect(() => {
    applySourceRevealState(initialState);
  }, [applySourceRevealState, initialState]);

  useEffect(() => {
    if (!voteEndpoint) {
      return;
    }

    const controller = new AbortController();
    const refresh = () => {
      void refreshSourceRevealState({
        controller,
        refreshOnUnlock: true,
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSourceRevealState, voteEndpoint]);

  const progressPercent = useMemo(() => {
    if (state.threshold <= 0) {
      return 100;
    }

    return Math.min(100, Math.max(0, (state.count / state.threshold) * 100));
  }, [state.count, state.threshold]);

  const countLabel = formatCount(state.count, locale);
  const thresholdLabel = formatCount(state.threshold, locale);
  const remainingCount = Math.max(0, state.threshold - state.count);
  const remainingLabel = formatCount(remainingCount, locale);
  const isLoggedIn = Boolean(memberSession.email);
  const isDark = tone === "dark";
  const isDock = density === "dock";
  const isCompact = density === "compact" || isDock;
  const participants = state.participants ?? [];

  const handleVote = async () => {
    if (isSaving || state.requestedByViewer || state.unlocked || !voteEndpoint) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(voteEndpoint, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | SourceRevealResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("sourceReveal" in data)) {
        throw new Error(
          data && "error" in data && data.error ? data.error : copy.error,
        );
      }

      const fanReward = data.fanReward ?? null;
      const reporterReward = data.reporterReward ?? null;
      const unlockedByThisVote =
        !stateRef.current.unlocked && data.sourceReveal.unlocked;

      applySourceRevealState(data.sourceReveal, {
        celebrateOnUnlock: !reporterReward && !fanReward,
        refreshOnUnlock: !reporterReward && !fanReward,
      });

      if (fanReward && unlockedByThisVote) {
        triggerUnlockCelebration(fanReward);
        return;
      }

      if (reporterReward) {
        triggerReporterRewardCelebration({
          refreshAfterDismiss: unlockedByThisVote,
          reward: reporterReward,
        });
      }
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : copy.error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {showUnlockCelebration ? (
        <UnlockCelebrationOverlay
          copy={copy.celebration}
          fanReward={unlockFanReward}
          locale={locale}
          onDismiss={dismissUnlockCelebration}
          prefersReducedMotion={prefersReducedMotion}
          thresholdLabel={thresholdLabel}
        />
      ) : null}
      {reporterRewardCelebration ? (
        <ReporterRewardCelebrationOverlay
          copy={copy.reporterReward}
          locale={locale}
          onDismiss={dismissReporterRewardCelebration}
          prefersReducedMotion={prefersReducedMotion}
          reward={reporterRewardCelebration}
        />
      ) : null}
      <div
        className={cn(
          "rounded-lg border p-3 text-left shadow-[0_16px_34px_rgba(0,0,0,0.12)]",
          isDark
            ? "border-white/14 bg-black/72 text-white"
            : "border-black/10 bg-white text-[#111510]",
          isCompact && "p-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.14)] sm:p-3",
          isDock && "shadow-none",
          className,
        )}
      >
        <div className={cn("flex items-start gap-3", isCompact && "gap-2.5")}>
          <span
            className={cn(
              "mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full",
              isCompact && "size-8 sm:size-10",
              state.unlocked
                ? "bg-[#44f26e] text-black"
                : isDark
                  ? "bg-[#44f26e]/14 text-[#44f26e]"
                  : "bg-[#e9ffef] text-[#16702e]",
            )}
          >
            {state.unlocked ? (
              <CheckCircle2
                className={cn("size-5", isCompact && "size-4 sm:size-5")}
              />
            ) : (
              <LockKeyhole
                className={cn("size-5", isCompact && "size-4 sm:size-5")}
              />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[0.64rem] font-black uppercase tracking-[0.16em]",
                isDark ? "text-[#9bffad]" : "text-[#16702e]",
              )}
            >
              {copy.eyebrow}
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-black leading-5 [word-break:keep-all]",
                isDark ? "text-white" : "text-[#111510]",
                isCompact && "text-[0.82rem] leading-5 sm:text-sm",
              )}
            >
              {state.unlocked ? copy.unlockedTitle : copy.title}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-semibold leading-5",
                isDark ? "text-white/68" : "text-black/58",
                isCompact && "hidden sm:block",
                isDock && "sm:hidden xl:block",
              )}
            >
              {state.unlocked
                ? copy.unlockedBody(countLabel)
                : copy.body(countLabel, thresholdLabel, remainingLabel)}
            </p>
          </div>
        </div>

        <div className={cn("mt-3", isCompact && "mt-2")}>
          <div
            className={cn(
              "h-2 overflow-hidden rounded-full",
              isDark ? "bg-white/12" : "bg-black/8",
            )}
          >
            <div
              className="h-full rounded-full bg-[#44f26e] transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className={cn(
              "mt-2 flex items-center justify-between gap-3 text-[0.68rem] font-black",
              isDark ? "text-white/58" : "text-black/50",
              isCompact && "mt-1.5",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {countLabel}/{thresholdLabel}
            </span>
            <span>
              {remainingCount > 0
                ? copy.progressRemaining(remainingLabel)
                : copy.progressReady}
            </span>
          </div>
        </div>

        {isDock ? null : (
          <SourceRevealParticipantStack
            copy={copy.voters}
            isCompact={isCompact}
            isDark={isDark}
            locale={locale}
            participants={participants}
            totalCount={state.count}
          />
        )}

        {state.unlocked ? null : isLoggedIn ? (
          <button
            className={cn(
              "mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-72",
              isCompact && "mt-2 h-10",
              state.requestedByViewer
                ? isDark
                  ? "border border-[#44f26e]/35 bg-[#44f26e]/12 text-[#b9ffc8]"
                  : "border border-[#19b84b]/30 bg-[#effff3] text-[#126c2c]"
                : "bg-[#44f26e] text-black hover:bg-[#69ff8c]",
            )}
            disabled={isSaving || state.requestedByViewer}
            onClick={() => {
              void handleVote();
            }}
            type="button"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <HeartHandshake className="size-4" />
            )}
            {isSaving
              ? copy.saving
              : state.requestedByViewer
                ? copy.done
                : copy.cta}
          </button>
        ) : (
          <Link
            className={cn(
              "mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]",
              isCompact && "mt-2 h-10",
            )}
            href={connectHref}
          >
            <HeartHandshake className="size-4" />
            {copy.loginCta}
          </Link>
        )}

        {voteEndpoint ? (
          <button
            className={cn(
              "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-70",
              isDark
                ? "border-white/14 bg-white/6 text-white/68 hover:bg-white/10"
                : "border-black/10 bg-black/[0.03] text-black/54 hover:bg-black/[0.06]",
            )}
            disabled={isRefreshing || isSaving}
            onClick={() => {
              setError(null);
              void refreshSourceRevealState({
                refreshOnUnlock: true,
                setLoading: setIsRefreshing,
                surfaceError: true,
              });
            }}
            type="button"
          >
            {isRefreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            {isRefreshing ? copy.refreshing : copy.refresh}
          </button>
        ) : null}

        {error ? (
          <p
            className={cn(
              "mt-2 text-xs font-semibold leading-5",
              isDark ? "text-rose-200" : "text-rose-700",
            )}
          >
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
