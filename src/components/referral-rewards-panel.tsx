"use client";

import { ArrowUpRight } from "lucide-react";

import type {
  ReferralRewardRecord,
  ReferralRewardsSummaryRecord,
} from "@/lib/member";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { BSC_EXPLORER } from "@/lib/thirdweb";

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
        <p className="text-sm leading-6 text-slate-600">
          {dictionary.referralsPage.rewards.description}
        </p>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
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

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible sm:px-0 sm:pb-0">
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
                joinedAtLabel={dictionary.referralsPage.labels.joinedAt}
                key={`${reward.sourceMemberEmail}:${reward.level}:${reward.awardedAt}`}
                lastWalletLabel={dictionary.member.labels.lastWallet}
                levelLabel={dictionary.referralsPage.labels.level}
                locale={locale}
                notAvailableLabel={dictionary.common.notAvailable}
                paymentTransactionLabel={dictionary.member.labels.paymentTransaction}
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
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[156px] snap-start rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:min-w-0">
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
    <div className="min-w-[120px] snap-start rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 sm:min-w-0">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {levelLabel} {level}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
        {points} P
      </p>
    </div>
  );
}

function RewardHistoryCard({
  awardedAtLabel,
  joinedAtLabel,
  lastWalletLabel,
  levelLabel,
  locale,
  notAvailableLabel,
  paymentTransactionLabel,
  reward,
  sourceMemberLabel,
}: {
  awardedAtLabel: string;
  joinedAtLabel: string;
  lastWalletLabel: string;
  levelLabel: string;
  locale: Locale;
  notAvailableLabel: string;
  paymentTransactionLabel: string;
  reward: ReferralRewardRecord;
  sourceMemberLabel: string;
}) {
  const paymentTransactionUrl = reward.sourcePaymentTransactionHash
    ? `${BSC_EXPLORER}/tx/${reward.sourcePaymentTransactionHash}`
    : null;

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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RewardMeta
          label={sourceMemberLabel}
          value={reward.sourceMemberEmail}
        />
        <RewardMeta
          label={awardedAtLabel}
          value={formatDateTime(reward.awardedAt, locale)}
        />
        <RewardMeta
          label={paymentTransactionLabel}
          value={
            reward.sourcePaymentTransactionHash
              ? `${reward.sourcePaymentTransactionHash.slice(0, 10)}...${reward.sourcePaymentTransactionHash.slice(-8)}`
              : notAvailableLabel
          }
        />
        <RewardMeta
          label={joinedAtLabel}
          value={formatDateTime(reward.sourceRegistrationCompletedAt, locale)}
        />
        <RewardMeta
          label={lastWalletLabel}
          value={formatAddressLabel(reward.sourceWalletAddress)}
        />
      </div>

      {paymentTransactionUrl ? (
        <a
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
          href={paymentTransactionUrl}
          rel="noreferrer"
          target="_blank"
        >
          {paymentTransactionLabel}
          <ArrowUpRight className="size-4" />
        </a>
      ) : null}
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
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[0.64rem] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatAddressLabel(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
