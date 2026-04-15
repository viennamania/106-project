"use client";

import { ChevronRight, GitBranch, Layers3, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AnimatedNumberText } from "@/components/animated-number-text";
import {
  REFERRAL_SIGNUP_LIMIT,
  REFERRAL_TREE_DEPTH_LIMIT,
  type ReferralTreeNodeRecord,
} from "@/lib/member";
import type { Dictionary, Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ReferralNetworkExplorer({
  dictionary,
  locale,
  referrals,
  totalReferrals,
  levelCounts,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referrals: ReferralTreeNodeRecord[];
  totalReferrals: number;
  levelCounts: number[];
}) {
  const [path, setPath] = useState<ReferralTreeNodeRecord[]>([]);
  const focusedNode = path[path.length - 1] ?? null;
  const currentNodes = focusedNode ? focusedNode.children : referrals;
  const currentLevel = focusedNode ? focusedNode.depth + 1 : 1;
  const directReferrals = referrals.length;
  const firstLevelLimitHint = formatTemplate(
    dictionary.referralsPage.firstLevelLimitHint,
    {
      limit: REFERRAL_SIGNUP_LIMIT,
    },
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ExplorerMetricCard
          icon={<Users className="size-4" />}
          label={dictionary.referralsPage.labels.directReferrals}
          locale={locale}
          value={`${directReferrals} / ${REFERRAL_SIGNUP_LIMIT}`}
        />
        <ExplorerMetricCard
          icon={<Layers3 className="size-4" />}
          label={dictionary.referralsPage.labels.totalNetwork}
          locale={locale}
          value={String(totalReferrals)}
        />
        <ExplorerMetricCard
          icon={<GitBranch className="size-4" />}
          label={`${dictionary.referralsPage.labels.level} ${currentLevel}`}
          locale={locale}
          value={String(currentNodes.length)}
        />
      </div>

      {levelCounts.length > 0 ? (
        <div className="space-y-2">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {levelCounts.map((count, index) => (
              <LevelCountChip
                count={count}
                key={index}
                level={index + 1}
                levelLabel={dictionary.referralsPage.labels.level}
                locale={locale}
                membersLabel={dictionary.referralsPage.labels.members}
              />
            ))}
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {firstLevelLimitHint}
          </p>
          <p className="text-sm leading-6 text-slate-600">
            {dictionary.referralsPage.depthHint.replace(
              "{depth}",
              String(REFERRAL_TREE_DEPTH_LIMIT),
            )}
          </p>
        </div>
      ) : null}

      {referrals.length > 0 && path.length > 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={() => {
                setPath([]);
              }}
              type="button"
            >
              {dictionary.referralsPage.rootLabel}
            </button>

            {path.map((node, index) => (
              <div className="flex items-center gap-2" key={`${node.email}-${index}`}>
                <ChevronRight className="size-4 text-slate-400" />
                <button
                  className={cn(
                    "inline-flex max-w-[14rem] items-center rounded-full border px-3 py-2 text-sm font-medium transition",
                    index === path.length - 1
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-100",
                  )}
                  onClick={() => {
                    setPath(path.slice(0, index + 1));
                  }}
                  type="button"
                >
                  <span className="truncate">{node.email}</span>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-slate-600">
              {dictionary.referralsPage.labels.currentLevel} {currentLevel}
            </p>
            <button
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={() => {
                setPath([]);
              }}
              type="button"
            >
              {dictionary.referralsPage.actions.backToRoot}
            </button>
          </div>
        </div>
      ) : null}

      {currentNodes.length === 0 ? (
        <div className="rounded-[22px] border border-slate-200 bg-white/90 px-4 py-4 text-sm leading-6 text-slate-600">
          {path.length === 0
            ? dictionary.referralsPage.empty
            : dictionary.referralsPage.branchEmpty}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {currentNodes.map((referral) => (
            <article
              className="rounded-[22px] border border-white/80 bg-white/90 p-3.5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              key={`${referral.email}-${referral.referralCode ?? referral.lastWalletAddress}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-slate-600">
                    {dictionary.referralsPage.labels.level} {referral.depth}
                  </div>
                  <p className="mt-2.5 break-all text-base font-semibold tracking-tight text-slate-950">
                    {referral.email}
                  </p>
                </div>

                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Users className="size-4" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <ExplorerInfoRow
                  className="col-span-2"
                  label={dictionary.referralsPage.labels.joinedAt}
                  locale={locale}
                  value={formatDateTime(referral.registrationCompletedAt, locale)}
                />
                <ExplorerInfoRow
                  animateValue
                  label={dictionary.referralsPage.labels.directChildren}
                  locale={locale}
                  value={String(referral.directReferralCount)}
                />
                <ExplorerInfoRow
                  animateValue
                  label={dictionary.referralsPage.labels.descendants}
                  locale={locale}
                  progress={getReferralProgressMeta(referral)}
                  value={String(referral.totalReferralCount)}
                />
              </div>

              {referral.children.length > 0 ? (
                <div className="mt-3 flex justify-end">
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => {
                      setPath([...path, referral]);
                    }}
                    type="button"
                  >
                    {dictionary.referralsPage.actions.viewChildren}
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      <AnimatedNumberText
                        locale={locale}
                        value={String(referral.directReferralCount)}
                      />
                    </span>
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ExplorerMetricCard({
  icon,
  label,
  locale,
  value,
}: {
  icon: ReactNode;
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div className="flex min-h-[124px] h-full flex-col rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex min-h-[2.75rem] items-start gap-2 text-slate-500">
        <div className="pt-0.5 text-slate-500">{icon}</div>
        <p className="text-xs leading-5 uppercase tracking-[0.18em]">{label}</p>
      </div>
      <div className="mt-auto flex items-end justify-end pt-4">
        <p className="text-right text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
          <AnimatedNumberText locale={locale} value={value} />
        </p>
      </div>
    </div>
  );
}

function LevelCountChip({
  count,
  level,
  levelLabel,
  locale,
  membersLabel,
}: {
  count: number;
  level: number;
  levelLabel: string;
  locale: Locale;
  membersLabel: string;
}) {
  const target = getLevelTarget(level);
  const progress = target > 0 ? Math.min((count / target) * 100, 100) : 0;

  return (
    <div className="shrink-0 min-w-[8.7rem] rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3.5 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {levelLabel} {level}
        </p>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[0.68rem] font-semibold tabular-nums text-slate-700">
          {Math.round(progress)}%
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold tracking-tight text-slate-950 tabular-nums">
        <AnimatedNumberText
          locale={locale}
          value={`${count} / ${target} ${membersLabel}`}
        />
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/90">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#2563eb_48%,#14b8a6_100%)] transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ExplorerInfoRow({
  animateValue = false,
  className,
  label,
  locale,
  progress,
  value,
}: {
  animateValue?: boolean;
  className?: string;
  label: string;
  locale: Locale;
  progress?: {
    current: number;
    percent: number;
    target: number;
  } | null;
  value: string;
}) {
  return (
    <div className={cn(
      "min-w-0 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3",
      className,
    )}>
      <p className="text-[0.64rem] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 break-words text-right text-sm font-medium text-slate-900 tabular-nums">
        {animateValue ? (
          <AnimatedNumberText locale={locale} value={value} />
        ) : (
          value
        )}
      </p>
      {progress ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[0.68rem] font-medium text-slate-500 tabular-nums">
            <span>
              {new Intl.NumberFormat(locale).format(progress.current)}
            </span>
            <span>
              {new Intl.NumberFormat(locale).format(progress.target)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/90">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_52%,#84cc16_100%)] transition-[width]"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getReferralProgressMeta(referral: ReferralTreeNodeRecord) {
  const target = getDescendantTargetForDepth(referral.depth);

  if (target <= 0) {
    return null;
  }

  return {
    current: referral.totalReferralCount,
    percent: Math.min((referral.totalReferralCount / target) * 100, 100),
    target,
  };
}

function getDescendantTargetForDepth(depth: number) {
  const remainingDepth = REFERRAL_TREE_DEPTH_LIMIT - depth;

  if (remainingDepth <= 0) {
    return 0;
  }

  return Array.from({ length: remainingDepth }, (_, index) =>
    Math.pow(REFERRAL_SIGNUP_LIMIT, index + 1),
  ).reduce((sum, count) => sum + count, 0);
}

function getLevelTarget(level: number) {
  return Math.pow(REFERRAL_SIGNUP_LIMIT, level);
}
