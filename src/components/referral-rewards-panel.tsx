"use client";

import { AnimatedNumberText } from "@/components/animated-number-text";
import {
  REFERRAL_REWARD_POINTS_LEVEL_ONE,
  REFERRAL_REWARD_POINTS_OTHER_LEVELS,
  ReferralRewardRecord,
  ReferralRewardsSummaryRecord,
} from "@/lib/member";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
  const rewardPerSignupValue = `G1 ${REFERRAL_REWARD_POINTS_LEVEL_ONE} P / G2-G6 ${REFERRAL_REWARD_POINTS_OTHER_LEVELS} P`;

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
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.perSignup}
          locale={locale}
          value={rewardPerSignupValue}
          valueClassName="text-[1.2rem] tracking-[-0.03em] sm:text-[1.4rem]"
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

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
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
            levelLabel={dictionary.referralsPage.labels.level}
            locale={locale}
            pointsLabel={dictionary.referralsPage.rewards.points}
            rewards={rewards.history}
            sourceMemberLabel={dictionary.referralsPage.rewards.sourceMember}
          />
        </div>
      )}
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
  return (
    <div className="flex min-h-[94px] flex-col rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3.5 sm:min-h-[104px] sm:rounded-[20px] sm:px-4 sm:py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {levelLabel} {level}
      </p>
      <p className="mt-3.5 text-right text-[1.65rem] leading-none font-bold tracking-[-0.04em] text-slate-950 tabular-nums sm:mt-4 sm:text-xl">
        <AnimatedNumberText locale={locale} value={`${points} P`} />
      </p>
    </div>
  );
}

function RewardHistoryTable({
  awardedAtLabel,
  levelLabel,
  locale,
  pointsLabel,
  rewards,
  sourceMemberLabel,
}: {
  awardedAtLabel: string;
  levelLabel: string;
  locale: Locale;
  pointsLabel: string;
  rewards: ReferralRewardRecord[];
  sourceMemberLabel: string;
}) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="w-full overflow-x-auto overscroll-x-contain md:overflow-x-visible">
        <table className="min-w-[42rem] w-full border-separate border-spacing-0 md:min-w-0 md:table-fixed">
          <thead>
            <tr className="bg-slate-50/90">
              <th
                className="border-b border-slate-200 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                scope="col"
              >
                {levelLabel}
              </th>
              <th
                className="border-b border-slate-200 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                scope="col"
              >
                {sourceMemberLabel}
              </th>
              <th
                className="border-b border-slate-200 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                scope="col"
              >
                {awardedAtLabel}
              </th>
              <th
                className="border-b border-slate-200 px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
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
                  <td className={cn("px-4 py-3.5", rowBorderClass)}>
                    <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                      {levelLabel} {reward.level}
                    </span>
                  </td>
                  <td className={cn("min-w-[15rem] px-4 py-3.5 md:min-w-0", rowBorderClass)}>
                    <p className="break-all text-sm font-medium text-slate-900">
                      {reward.sourceMemberEmail}
                    </p>
                  </td>
                  <td className={cn("px-4 py-3.5", rowBorderClass)}>
                    <p className="whitespace-nowrap text-sm text-slate-600">
                      {formatDateTime(reward.awardedAt, locale)}
                    </p>
                  </td>
                  <td className={cn("px-4 py-3.5 text-right", rowBorderClass)}>
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
  );
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
