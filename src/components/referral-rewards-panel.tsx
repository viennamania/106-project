"use client";

import {
  REFERRAL_REWARD_POINTS,
  ReferralRewardRecord,
  ReferralRewardsSummaryRecord,
} from "@/lib/member";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ReferralRewardsPanel({
  dictionary,
  locale,
  rewards,
}: {
  dictionary: Dictionary;
  locale: Locale;
  rewards: ReferralRewardsSummaryRecord;
}) {
  const activeLevels = rewards.pointsByLevel.filter((points) => points > 0).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="eyebrow">{dictionary.referralsPage.eyebrow}</p>
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {dictionary.referralsPage.rewards.title}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {dictionary.referralsPage.rewards.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.perSignup}
          value={`${REFERRAL_REWARD_POINTS} P`}
        />
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.totalPoints}
          value={`${rewards.totalPoints} P`}
        />
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.totalRewards}
          value={String(rewards.totalRewards)}
        />
        <RewardMetricCard
          label={dictionary.referralsPage.rewards.activeLevels}
          value={String(activeLevels)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {rewards.pointsByLevel.map((points, index) => (
          <RewardLevelCard
            key={`level-${index + 1}`}
            level={index + 1}
            points={points}
            levelLabel={dictionary.referralsPage.labels.level}
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
          <div className="grid gap-3">
            {rewards.history.map((reward) => (
              <RewardHistoryCard
                awardedAtLabel={dictionary.referralsPage.rewards.awardedAt}
                key={`${reward.sourceMemberEmail}:${reward.level}:${reward.awardedAt}`}
                levelLabel={dictionary.referralsPage.labels.level}
                locale={locale}
                reward={reward}
                sourceMemberLabel={dictionary.referralsPage.rewards.sourceMember}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RewardMetricCard({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={cn(
      "rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]",
      className,
    )}>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function RewardLevelCard({
  level,
  levelLabel,
  points,
}: {
  level: number;
  levelLabel: string;
  points: number;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-4 sm:px-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {levelLabel} {level}
      </p>
      <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
        {points} P
      </p>
    </div>
  );
}

function RewardHistoryCard({
  awardedAtLabel,
  levelLabel,
  locale,
  reward,
  sourceMemberLabel,
}: {
  awardedAtLabel: string;
  levelLabel: string;
  locale: Locale;
  reward: ReferralRewardRecord;
  sourceMemberLabel: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          {levelLabel} {reward.level}
        </span>
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
          +{reward.points} P
        </span>
      </div>

      <div className="mt-3 grid gap-3 min-[360px]:grid-cols-2">
        <RewardMeta
          label={sourceMemberLabel}
          value={reward.sourceMemberEmail}
        />
        <RewardMeta
          label={awardedAtLabel}
          value={formatDateTime(reward.awardedAt, locale)}
        />
      </div>
    </div>
  );
}

function RewardMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[0.64rem] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
