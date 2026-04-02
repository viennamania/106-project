"use client";

import { ChevronRight, GitBranch, Layers3, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ExplorerMetricCard
          icon={<Users className="size-4" />}
          label={dictionary.referralsPage.labels.directReferrals}
          value={String(directReferrals)}
        />
        <ExplorerMetricCard
          icon={<Layers3 className="size-4" />}
          label={dictionary.referralsPage.labels.totalNetwork}
          value={String(totalReferrals)}
        />
        <ExplorerMetricCard
          icon={<GitBranch className="size-4" />}
          label={`${dictionary.referralsPage.labels.level} ${currentLevel}`}
          value={String(currentNodes.length)}
        />
      </div>

      {levelCounts.length > 0 ? (
        <div className="space-y-2">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {levelCounts.map((count, index) => (
              <div
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
                key={index}
              >
                {dictionary.referralsPage.labels.level} {index + 1}
                <span className="ml-2 text-slate-500">
                  {count} {dictionary.referralsPage.labels.members}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {dictionary.referralsPage.depthHint.replace(
              "{depth}",
              String(REFERRAL_TREE_DEPTH_LIMIT),
            )}
          </p>
        </div>
      ) : null}

      {referrals.length > 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={cn(
                "inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition",
                path.length === 0
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-100",
              )}
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

          {path.length > 0 ? (
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
          ) : null}
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
              className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              key={`${referral.email}-${referral.referralCode ?? referral.lastWalletAddress}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-slate-600">
                    {dictionary.referralsPage.labels.level} {referral.depth}
                  </div>
                  <p className="mt-3 break-all text-sm font-semibold text-slate-950">
                    {referral.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatAddressLabel(referral.lastWalletAddress) ??
                      dictionary.common.notAvailable}
                  </p>
                </div>

                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Users className="size-4" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ExplorerInfoRow
                  label={dictionary.referralsPage.labels.referralCode}
                  value={
                    referral.referralCode ?? dictionary.common.notAvailable
                  }
                />
                <ExplorerInfoRow
                  label={dictionary.referralsPage.labels.locale}
                  value={referral.locale}
                />
                <ExplorerInfoRow
                  label={dictionary.referralsPage.labels.joinedAt}
                  value={formatDateTime(referral.registrationCompletedAt, locale)}
                />
                <ExplorerInfoRow
                  label={dictionary.referralsPage.labels.lastConnectedAt}
                  value={formatDateTime(referral.lastConnectedAt, locale)}
                />
                <ExplorerInfoRow
                  label={dictionary.referralsPage.labels.directChildren}
                  value={String(referral.directReferralCount)}
                />
                <ExplorerInfoRow
                  label={dictionary.referralsPage.labels.descendants}
                  value={String(referral.totalReferralCount)}
                />
              </div>

              {referral.children.length > 0 ? (
                <div className="mt-4 flex justify-end">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => {
                      setPath([...path, referral]);
                    }}
                    type="button"
                  >
                    {dictionary.referralsPage.actions.viewChildren}
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {referral.directReferralCount}
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
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs uppercase tracking-[0.22em]">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function ExplorerInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatAddressLabel(address?: string | null) {
  if (!address) {
    return null;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
