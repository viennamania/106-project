"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AnimatedNumberText } from "@/components/animated-number-text";
import {
  getReferralRewardPoints,
  REFERRAL_REWARD_POINTS_LEVEL_ONE,
  REFERRAL_REWARD_POINTS_OTHER_LEVELS,
  REFERRAL_SIGNUP_LIMIT,
  ReferralRewardRecord,
  ReferralRewardsSummaryRecord,
} from "@/lib/member";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const REWARD_HISTORY_PAGE_SIZE = 6;

export function ReferralRewardsPanel({
  dictionary,
  locale,
  rewards,
  showHeader = true,
}: {
  dictionary: Dictionary;
  locale: Locale;
  rewards: ReferralRewardsSummaryRecord;
  showHeader?: boolean;
}) {
  const activeLevels = rewards.pointsByLevel.filter((points) => points > 0).length;
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageCount = Math.max(
    1,
    Math.ceil(rewards.history.length / REWARD_HISTORY_PAGE_SIZE),
  );
  const currentHistoryPage = Math.min(historyPage, historyPageCount);
  const paginatedHistory = rewards.history.slice(
    (currentHistoryPage - 1) * REWARD_HISTORY_PAGE_SIZE,
    currentHistoryPage * REWARD_HISTORY_PAGE_SIZE,
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {showHeader ? (
        <div className="space-y-1">
          <p className="eyebrow">{dictionary.referralsPage.eyebrow}</p>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            {dictionary.referralsPage.rewards.title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            {dictionary.referralsPage.rewards.description}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
        <RewardRuleCard
          label={dictionary.referralsPage.rewards.perSignup}
          levelOnePoints={REFERRAL_REWARD_POINTS_LEVEL_ONE}
          downstreamPoints={REFERRAL_REWARD_POINTS_OTHER_LEVELS}
          locale={locale}
        />
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.totalPoints}
          locale={locale}
          value={`${rewards.totalPoints} P`}
        />
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.totalRewards}
          locale={locale}
          value={String(rewards.totalRewards)}
        />
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.activeLevels}
          locale={locale}
          value={String(activeLevels)}
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 sm:gap-3">
        {rewards.pointsByLevel.map((points, index) => (
          <RewardLevelCard
            key={`level-${index + 1}`}
            level={index + 1}
            points={points}
            levelLabel={dictionary.referralsPage.labels.level}
            locale={locale}
          />
        ))}
      </div>

      {rewards.history.length === 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
          {dictionary.referralsPage.rewards.empty}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-950">
            {dictionary.referralsPage.rewards.recentTitle}
          </p>
          <RewardHistoryTable
            awardedAtLabel={dictionary.referralsPage.rewards.awardedAt}
            currentPage={currentHistoryPage}
            levelLabel={dictionary.referralsPage.labels.level}
            locale={locale}
            nextPageLabel={dictionary.referralsPage.rewards.nextPage}
            onPageChange={setHistoryPage}
            pageCount={historyPageCount}
            pointsLabel={dictionary.referralsPage.rewards.points}
            previousPageLabel={dictionary.referralsPage.rewards.previousPage}
            rewards={paginatedHistory}
            sourceMemberLabel={dictionary.referralsPage.rewards.sourceMember}
            totalRewards={rewards.history.length}
          />
        </div>
      )}
    </div>
  );
}

function RewardRuleCard({
  downstreamPoints,
  label,
  levelOnePoints,
  locale,
}: {
  downstreamPoints: number;
  label: string;
  levelOnePoints: number;
  locale: Locale;
}) {
  return (
    <div className="flex min-h-[104px] flex-col rounded-[22px] border border-white/80 bg-white/90 p-3.5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:min-h-[116px] sm:rounded-[24px] sm:p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <div className="mt-4 space-y-2.5 sm:mt-5">
        <RewardRuleRow
          level="G1"
          locale={locale}
          points={levelOnePoints}
        />
        <RewardRuleRow
          level="G2-G6"
          locale={locale}
          points={downstreamPoints}
        />
      </div>
    </div>
  );
}

function RewardMetricCard({
  className,
  label,
  locale,
  value,
  valueClassName,
}: {
  className?: string;
  label: string;
  locale: Locale;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[104px] flex-col rounded-[22px] border border-white/80 bg-white/90 p-3.5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:min-h-[116px] sm:rounded-[24px] sm:p-4",
        className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-5 text-right text-[2.55rem] leading-none font-black tracking-[-0.05em] text-slate-950 tabular-nums sm:mt-6 sm:text-[2.35rem]",
          valueClassName,
        )}
      >
        <AnimatedNumberText locale={locale} value={value} />
      </p>
    </div>
  );
}

function RewardRuleRow({
  level,
  locale,
  points,
}: {
  level: string;
  locale: Locale;
  points: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="text-sm font-semibold tracking-[-0.02em] text-slate-600">
        {level}
      </span>
      <span className="text-lg leading-none font-black tracking-[-0.04em] text-slate-950 tabular-nums sm:text-xl">
        <AnimatedNumberText locale={locale} value={`${points} P`} />
      </span>
    </div>
  );
}

function RewardLevelCard({
  level,
  levelLabel,
  locale,
  points,
}: {
  level: number;
  levelLabel: string;
  locale: Locale;
  points: number;
}) {
  const targetPoints = getRewardTargetPoints(level);
  const progress =
    targetPoints > 0 ? Math.min((points / targetPoints) * 100, 100) : 0;
  const progressBadgeClassName =
    level === 1
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : level === 2
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : level === 3
          ? "border-violet-200 bg-violet-50 text-violet-900"
          : level === 4
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : level === 5
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-slate-200 bg-slate-50 text-slate-700";
  const progressBarClassName =
    level === 1
      ? "from-emerald-500 via-emerald-400 to-lime-400"
      : level === 2
        ? "from-sky-500 via-cyan-400 to-blue-400"
        : level === 3
          ? "from-violet-500 via-fuchsia-400 to-pink-400"
          : level === 4
            ? "from-amber-500 via-orange-400 to-yellow-300"
            : level === 5
              ? "from-rose-500 via-pink-400 to-orange-300"
              : "from-slate-700 via-slate-500 to-slate-300";

  return (
    <div className="flex min-h-[152px] flex-col rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:min-h-[164px] sm:rounded-[22px] sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            {levelLabel} {level}
          </p>
          <p className="mt-3 text-[1.7rem] leading-none font-black tracking-[-0.05em] text-slate-950 tabular-nums sm:text-[1.9rem]">
            <AnimatedNumberText locale={locale} value={`${points} P`} />
          </p>
        </div>
        <span
          className={cn(
            "inline-flex min-w-[3.6rem] items-center justify-center rounded-full border px-2.5 py-1.5 text-xs font-semibold tabular-nums",
            progressBadgeClassName,
          )}
        >
          {Math.round(progress)}%
        </span>
      </div>

      <div className="mt-auto space-y-2.5 pt-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-[width]",
              progressBarClassName,
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 text-[0.72rem] font-medium text-slate-500 tabular-nums">
          <span>{formatPoints(points, locale)}</span>
          <span>{formatPoints(targetPoints, locale)}</span>
        </div>
      </div>
    </div>
  );
}

function RewardHistoryTable({
  awardedAtLabel,
  currentPage,
  levelLabel,
  locale,
  nextPageLabel,
  onPageChange,
  pageCount,
  pointsLabel,
  previousPageLabel,
  rewards,
  sourceMemberLabel,
  totalRewards,
}: {
  awardedAtLabel: string;
  currentPage: number;
  levelLabel: string;
  locale: Locale;
  nextPageLabel: string;
  onPageChange: (page: number) => void;
  pageCount: number;
  pointsLabel: string;
  previousPageLabel: string;
  rewards: ReferralRewardRecord[];
  sourceMemberLabel: string;
  totalRewards: number;
}) {
  const startIndex = (currentPage - 1) * REWARD_HISTORY_PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * REWARD_HISTORY_PAGE_SIZE, totalRewards);

  return (
    <div className="space-y-4">
      <div className="w-full max-w-full overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="w-full overflow-x-auto overscroll-x-contain md:overflow-x-visible">
          <table className="w-full min-w-[28rem] border-separate border-spacing-0 md:min-w-0 md:table-fixed">
            <thead>
              <tr className="bg-slate-50/90">
                <th
                  className="w-[5.25rem] border-b border-slate-200 px-3 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 md:w-[6.5rem] md:px-4"
                  scope="col"
                >
                  {levelLabel}
                </th>
                <th
                  className="w-[15rem] border-b border-slate-200 px-3 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 md:px-4"
                  scope="col"
                >
                  <div className="flex flex-col gap-1">
                    <span className="whitespace-nowrap">{sourceMemberLabel}</span>
                    <span className="whitespace-nowrap text-[0.62rem] text-slate-400">
                      {awardedAtLabel}
                    </span>
                  </div>
                </th>
                <th
                  className="w-[7rem] border-b border-slate-200 px-3 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 md:px-4"
                  scope="col"
                >
                  {pointsLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward, index) => {
                const rowBorderClass =
                  index < rewards.length - 1 ? "border-b border-slate-100" : "";

                return (
                  <tr className="align-top" key={`${reward.sourceMemberEmail}:${reward.level}:${reward.awardedAt}`}>
                    <td className={cn("px-3 py-3.5 md:px-4", rowBorderClass)}>
                      <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        {levelLabel} {reward.level}
                      </span>
                    </td>
                    <td className={cn("px-3 py-3.5 md:px-4", rowBorderClass)}>
                      <div className="space-y-1.5">
                        <p className="whitespace-nowrap text-sm font-medium text-slate-900 md:whitespace-normal md:break-all">
                          {reward.sourceMemberEmail}
                        </p>
                        <p className="whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(reward.awardedAt, locale)}
                        </p>
                      </div>
                    </td>
                    <td className={cn("px-3 py-3.5 text-right md:px-4", rowBorderClass)}>
                      <span className="ml-auto inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900 tabular-nums">
                        <AnimatedNumberText locale={locale} value={`+${reward.points} P`} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {startIndex}-{endIndex} / {totalRewards}
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label={previousPageLabel}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => {
              onPageChange(currentPage - 1);
            }}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-16 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-medium text-slate-700">
            {currentPage} / {pageCount}
          </div>
          <button
            aria-label={nextPageLabel}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage >= pageCount}
            onClick={() => {
              onPageChange(currentPage + 1);
            }}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRewardTargetPoints(level: number) {
  return (
    Math.pow(REFERRAL_SIGNUP_LIMIT, level) * getReferralRewardPoints(level)
  );
}

function formatPoints(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale).format(value)} P`;
}
