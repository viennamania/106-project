"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Link2,
  Share2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { CopyTextButton } from "@/components/copy-text-button";
import {
  FanletterFounderJoinLink,
  useFanletterFounderMockMembership,
} from "@/components/fanletter-founder-mock-state";
import type { Locale } from "@/lib/i18n";
import type { FanletterV2Copy, ScoutShareLoopData } from "@/mock/fanletterV2";

type FanletterStarReferralPanelProps = {
  copy: FanletterV2Copy;
  inboundReferralCode?: string | null;
  joinHref: string;
  joinReferralCode?: string | null;
  locale: Locale;
  loop: ScoutShareLoopData;
  primaryActionHref?: string | null;
  primaryActionLabel?: string | null;
  primaryActionVariant?: "connect" | "join" | "share";
  starId?: string | null;
};

function buildPlatformHref(platform: string, shareLink: string) {
  if (platform === "X") {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("url", shareLink);

    return url.toString();
  }

  return shareLink;
}

function isKoreanCopy(copy: FanletterV2Copy) {
  return copy.labels.humanMember === "일반 멤버";
}

function formatCopyTemplate(
  template: string,
  values: Record<string, string>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function getDisplayMemberName(name: string, copy: FanletterV2Copy) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    "Member A": "회원 A",
    "Member B": "회원 B",
    "New member": "신규 회원",
  };

  return replacements[name.trim()] ?? name;
}

function getDisplayUniverseName(name: string, copy: FanletterV2Copy) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    "Harin Universe": "하린 유니버스",
    "Minseo Universe": "민서 유니버스",
    "Seoyeon Universe": "서연 유니버스",
    "Yoonseo Universe": "윤서 유니버스",
  };

  return replacements[name] ?? name.replace(/\bUniverse\b/g, "유니버스");
}

function MobileReferralFlow({
  copy,
  referralCode,
  rewards,
  sourceMember,
}: {
  copy: FanletterV2Copy;
  referralCode: string;
  rewards: ScoutShareLoopData["rewards"];
  sourceMember: string;
}) {
  return (
    <div className="mt-5 sm:hidden">
      <div className="grid grid-cols-[1fr_1.25rem_1fr_1.25rem_1fr] items-stretch gap-1.5">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            <Crown className="size-4" />
          </span>
          <p className="mt-2 text-[0.62rem] font-semibold text-black/48">
            {copy.roles.founder}
          </p>
          <p className="truncate text-sm font-semibold text-black">
            {sourceMember}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <ArrowRight className="size-4 text-[#7c3aed]" />
        </div>
        <div className="rounded-lg border border-violet-200 bg-[#f7f2ff] p-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-[#6d28d9]">
            <Link2 className="size-4" />
          </span>
          <p className="mt-2 text-[0.62rem] font-semibold text-black/48">
            {copy.labels.referralCode}
          </p>
          <p className="truncate font-mono text-[0.72rem] font-semibold text-[#5b21b6]">
            {referralCode}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <ArrowRight className="size-4 text-[#7c3aed]" />
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-emerald-700">
            <Sparkles className="size-4" />
          </span>
          <p className="mt-2 text-[0.62rem] font-semibold text-black/48">
            {copy.starDetail.rewardsTitle}
          </p>
          <p className="text-sm font-semibold text-emerald-900">
            +{rewards.cp} CP
          </p>
        </div>
      </div>
    </div>
  );
}

export function FanletterStarReferralPanel({
  copy,
  inboundReferralCode,
  joinHref,
  joinReferralCode,
  locale,
  loop,
  primaryActionHref,
  primaryActionLabel,
  primaryActionVariant,
  starId,
}: FanletterStarReferralPanelProps) {
  const mockFounderMembership = useFanletterFounderMockMembership(
    starId ?? null,
  );
  const isMockFounder = Boolean(mockFounderMembership);
  const [isGenerated, setIsGenerated] = useState(
    Boolean(inboundReferralCode) || Boolean(loop.isLiveData),
  );
  const isReferralGenerated = isGenerated || isMockFounder;

  const visibleReferralCode =
    mockFounderMembership?.referralCode ?? inboundReferralCode ?? loop.referralCode;
  const visibleShareLink = useMemo(() => {
    if (!inboundReferralCode && !mockFounderMembership?.referralCode) {
      return loop.shareLink;
    }

    try {
      const url = new URL(loop.shareLink);
      url.searchParams.set("ref", visibleReferralCode);

      return url.toString();
    } catch {
      return loop.shareLink;
    }
  }, [
    inboundReferralCode,
    loop.shareLink,
    mockFounderMembership?.referralCode,
    visibleReferralCode,
  ]);
  const platformLinks = useMemo(() => {
    if (
      !inboundReferralCode &&
      !mockFounderMembership &&
      loop.sharePlatformLinks?.length
    ) {
      return loop.sharePlatformLinks.map((platformLink) => ({
        href: platformLink.href,
        label: platformLink.label,
      }));
    }

    return loop.sharePlatforms.map((platform) => ({
      href: buildPlatformHref(platform, visibleShareLink),
      label: platform,
    }));
  }, [
    inboundReferralCode,
    mockFounderMembership,
    loop.sharePlatformLinks,
    loop.sharePlatforms,
    visibleShareLink,
  ]);
  const displaySourceMember = getDisplayMemberName(loop.sourceMember, copy);
  const displayTargetMember = getDisplayMemberName(loop.targetMember, copy);
  const displayUniverse = getDisplayUniverseName(loop.selectedUniverse, copy);
  const flowItems = [
    displaySourceMember,
    formatCopyTemplate(copy.scoutShareLoop.selectUniverseTemplate, {
      universe: displayUniverse,
    }),
    `${copy.labels.referralCode}: ${visibleReferralCode}`,
    copy.scoutShareLoop.shareToSns,
    formatCopyTemplate(copy.scoutShareLoop.memberJoinsTemplate, {
      member: displayTargetMember,
    }),
    formatCopyTemplate(copy.scoutShareLoop.memberBecomesFounderTemplate, {
      member: displayTargetMember,
      universe: displayUniverse,
    }),
  ];
  const actionHref = isMockFounder ? "#referral-builder" : primaryActionHref ?? joinHref;
  const fallbackActionLabel = actionHref.includes("/fanletter/connect")
    ? isKoreanCopy(copy)
      ? "Founder 상태 확인"
      : "Confirm Founder status"
    : copy.actions.joinAsFounder;
  const actionLabel = isMockFounder
    ? isKoreanCopy(copy)
      ? "내 추천 링크 공유"
      : "Share my Founder link"
    : primaryActionLabel ?? fallbackActionLabel;
  const actionClassName =
    "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#69f98a]";
  const shouldUseFounderJoinAction =
    primaryActionVariant === "join" && Boolean(starId);

  return (
    <article
      className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_22px_54px_rgba(88,28,135,0.1)] sm:p-5"
      id="referral-builder"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <Share2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.scoutShareLoop}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f] [word-break:keep-all]">
            {copy.starDetail.referralTitle}
          </h2>
          <p className="mt-2 hidden text-sm font-medium leading-6 text-black/62 sm:block">
            {copy.starDetail.referralBody}
          </p>
        </div>
      </div>

      {isMockFounder ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="size-4" />
            {isKoreanCopy(copy)
              ? "Founder 참여 완료"
              : "Founder join complete"}
          </div>
          <p className="mt-2 hidden text-sm font-medium leading-5 text-emerald-900/72 sm:block">
            {isKoreanCopy(copy)
              ? "이 브라우저에 저장된 mock Founder 상태입니다. 내 추천 링크로 새 Founder를 초대할 수 있습니다."
              : "This browser has mock Founder status saved. Invite new Founders with your referral link."}
          </p>
        </div>
      ) : inboundReferralCode ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="size-4" />
            {copy.starDetail.inboundRefTitle}
          </div>
          <p className="mt-2 hidden text-sm font-medium leading-5 text-emerald-900/72 sm:block">
            {copy.starDetail.inboundRefBody}
          </p>
        </div>
      ) : null}

      <MobileReferralFlow
        copy={copy}
        referralCode={visibleReferralCode}
        rewards={loop.rewards}
        sourceMember={displaySourceMember}
      />

      <div className="mt-5 hidden gap-2 sm:grid">
        {flowItems.map((item, index) => (
          <div
            className="flex min-h-12 items-center gap-3 rounded-lg border border-black/8 bg-[#f8f7ff] px-3 py-2"
            key={`${item}-${index}`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-xs font-semibold text-[#6d28d9]">
              {index + 1}
            </span>
            <span className="text-sm font-semibold leading-5 text-[#26113d]">
              {item}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-black/8 bg-[#f6f8f4] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-black/48">
              {isReferralGenerated
                ? copy.starDetail.referralReady
                : copy.labels.referralCode}
            </p>
            <p className="mt-1 break-all font-mono text-lg font-semibold text-black">
              {isReferralGenerated
                ? visibleReferralCode
                : isKoreanCopy(copy)
                  ? "생성 전"
                  : "MOCK-READY"}
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            onClick={() => setIsGenerated(true)}
            type="button"
          >
            <Sparkles className="size-4" />
            {copy.actions.createMockReferral}
          </button>
        </div>

        {isReferralGenerated ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-black/48">
              {copy.actions.shareLink}
            </p>
            <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-[0.7rem] font-semibold leading-4 text-[#5b21b6] sm:text-xs">
              {visibleShareLink}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <CopyTextButton
                className="h-11 border-black/10 text-sm font-semibold"
                copiedLabel={copy.actions.copied}
                copyLabel={copy.actions.copyLink}
                text={visibleShareLink}
              />
              {platformLinks.map((platformLink) => (
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/8 bg-white px-4 text-sm font-semibold text-black/68 transition hover:border-[#7c3aed]/40 hover:text-[#5b21b6]"
                  href={platformLink.href}
                  key={platformLink.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  {platformLink.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-lg bg-[#12041f] p-4 text-white">
        <p className="text-sm font-semibold text-fuchsia-100">
          {copy.starDetail.rewardsTitle}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">+{loop.rewards.cp}</p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              CP
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">
              +{loop.rewards.influenceScore}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.influenceScore}
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">
              +{loop.rewards.creatorProgressPercent}%
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.creatorProgress}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {shouldUseFounderJoinAction && starId ? (
          <FanletterFounderJoinLink
            className={actionClassName}
            href={actionHref}
            locale={locale}
            mode="live"
            referralCode={joinReferralCode}
            starId={starId}
            useResponseUniverseHref
          >
            {actionLabel}
          </FanletterFounderJoinLink>
        ) : actionHref.startsWith("#") || actionHref.startsWith("http") ? (
          <a
            className={actionClassName}
            href={actionHref}
            rel={actionHref.startsWith("http") ? "noreferrer" : undefined}
            target={actionHref.startsWith("http") ? "_blank" : undefined}
          >
            {actionLabel}
          </a>
        ) : (
          <Link className={actionClassName} href={actionHref}>
            {actionLabel}
          </Link>
        )}
        <p className="hidden rounded-lg border border-black/8 bg-white px-3 py-2 text-xs font-semibold leading-5 text-black/52 sm:block sm:max-w-xs">
          {copy.starDetail.mockNotice}
        </p>
      </div>
    </article>
  );
}
