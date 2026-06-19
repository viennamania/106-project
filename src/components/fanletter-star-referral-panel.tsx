"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Database,
  GitBranch,
  Link2,
  Share2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CopyTextButton } from "@/components/copy-text-button";
import {
  FanletterFounderJoinLink,
  useFanletterFounderMockMembership,
} from "@/components/fanletter-founder-mock-state";
import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import type { Locale } from "@/lib/i18n";
import { trackFunnelEvent } from "@/lib/funnel-client";
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

function ReferralShareOutcomeCard({
  copy,
  hasSharedReferral,
  isReferralGenerated,
  locale,
  rewards,
  starId,
}: {
  copy: FanletterV2Copy;
  hasSharedReferral: boolean;
  isReferralGenerated: boolean;
  locale: Locale;
  rewards: ScoutShareLoopData["rewards"];
  starId?: string | null;
}) {
  const isKorean = isKoreanCopy(copy);
  const encodedStarId = starId ? encodeURIComponent(starId) : null;
  const ledgerHref = `/${locale}/fanletter/agentrank/events${
    encodedStarId ? `?starId=${encodedStarId}&limit=40` : ""
  }`;
  const creatorHref = `/${locale}/fanletter/creator-unlock${
    encodedStarId ? `?starId=${encodedStarId}` : ""
  }`;
  const labels = isKorean
    ? {
        cp: "CP 보상",
        creator: "Creator 진행",
        creatorCta: "Creator Journey",
        event: "평판 기록",
        influence: "영향력",
        ledgerCta: "평판 기록 보기",
        nextBody:
          "공유 기록은 추천 보상, Creator 진행률, AgentRank 원장으로 이어집니다.",
        nextTitle: "다음 행동",
        pendingBody:
          "링크를 복사하거나 SNS로 공유하면 referral_shared 기록이 생성됩니다.",
        pendingTitle: "공유 대기",
        readyBody:
          "새 Founder가 이 링크로 참여하면 CP와 Creator 진행률이 이어집니다.",
        readyTitle: "추천 공유 기록 생성됨",
      }
    : {
        cp: "CP reward",
        creator: "Creator progress",
        creatorCta: "Creator Journey",
        event: "Reputation record",
        influence: "Influence",
        ledgerCta: "View records",
        nextBody:
          "The share record feeds referral rewards, Creator progress, and the AgentRank ledger.",
        nextTitle: "Next actions",
        pendingBody:
          "Copy the link or share to SNS to create a referral_shared record.",
        pendingTitle: "Share pending",
        readyBody:
          "When a new Founder joins through this link, CP and Creator progress continue.",
        readyTitle: "Referral share recorded",
      };

  if (!isReferralGenerated) {
    return null;
  }

  return (
    <section
      className={`mt-4 rounded-lg border p-3 ${
        hasSharedReferral
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.1em] ${
              hasSharedReferral ? "text-emerald-700" : "text-zinc-500"
            }`}
          >
            {labels.event}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
            {hasSharedReferral ? labels.readyTitle : labels.pendingTitle}
          </h3>
          <p className="mt-1 text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all]">
            {hasSharedReferral ? labels.readyBody : labels.pendingBody}
          </p>
        </div>
        <span
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
            hasSharedReferral
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {hasSharedReferral ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Share2 className="size-4" />
          )}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          [labels.cp, `+${rewards.cp}`],
          [labels.influence, `+${rewards.influenceScore}`],
          [labels.creator, `+${rewards.creatorProgressPercent}%`],
        ].map(([label, value]) => (
          <div
            className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-2"
            key={label}
          >
            <p className="truncate text-sm font-semibold text-zinc-950">
              {value}
            </p>
            <p className="mt-0.5 truncate text-[0.62rem] font-semibold text-zinc-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 break-all rounded-lg bg-white/78 px-3 py-2 font-mono text-[0.68rem] font-semibold leading-4 text-zinc-600">
        referral_shared → cp_earned → creator_unlock_evaluated
      </p>

      {hasSharedReferral ? (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold text-zinc-950">
            {labels.nextTitle}
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
            {labels.nextBody}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-black px-3 py-2 text-center text-xs font-semibold leading-tight !text-white"
              href={ledgerHref}
            >
              <Database className="size-3.5 shrink-0" />
              {labels.ledgerCta}
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs font-semibold leading-tight text-zinc-800"
              href={creatorHref}
            >
              <Sparkles className="size-3.5 shrink-0" />
              {labels.creatorCta}
            </Link>
          </div>
        </div>
      ) : null}
    </section>
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
  const [hasSharedReferral, setHasSharedReferral] = useState(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isJoinPanelOpen, setIsJoinPanelOpen] = useState(false);
  const isReferralGenerated = isGenerated || isMockFounder;

  useEffect(() => {
    function handleOpenSharePanel(event: Event) {
      const detail = (event as CustomEvent<{ starId?: string | null }>).detail;

      if (detail?.starId && starId && detail.starId !== starId) {
        return;
      }

      setIsGenerated(true);
      setIsSharePanelOpen(true);
    }

    window.addEventListener(
      "fanletter:open-referral-share-panel",
      handleOpenSharePanel,
    );

    return () => {
      window.removeEventListener(
        "fanletter:open-referral-share-panel",
        handleOpenSharePanel,
      );
    };
  }, [starId]);

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
  const shouldUseFounderActionPanel =
    (primaryActionVariant === "join" || primaryActionVariant === "connect") &&
    Boolean(starId);
  const isFounderJoinAction = primaryActionVariant === "join";
  const panelLabels = isKoreanCopy(copy)
    ? {
        close: "추천 공유 패널 닫기",
        flow: "공유 흐름",
        joinClose: "Founder 참여 확인 패널 닫기",
        joinConfirm: "Founder 참여 확정",
        joinDescription:
          "이 AI 스타 기준으로 Founder 참여를 기록하고 추천 링크를 준비합니다.",
        joinTitle:
          primaryActionVariant === "connect"
            ? "Founder 참여 준비"
            : "Founder 참여 확인",
        open: "공유 옵션 열기",
        reward: "예상 보상",
        signal: "기록될 평판 이벤트",
        title: "추천 링크 공유",
      }
    : {
        close: "Close referral share panel",
        flow: "Share flow",
        joinClose: "Close Founder join confirmation panel",
        joinConfirm: "Confirm Founder join",
        joinDescription:
          "Record Founder participation for this AI Star and prepare a referral link.",
        joinTitle:
          primaryActionVariant === "connect"
            ? "Prepare Founder join"
            : "Confirm Founder join",
        open: "Open share options",
        reward: "Expected reward",
        signal: "Reputation events",
        title: "Share referral link",
      };
  function markReferralShared(platform: string) {
    setHasSharedReferral(true);
    trackFunnelEvent("share_click", {
      agentRank: {
        eventType: "referral_shared",
        intent: "founder_referral_shared",
        source: "fanletter_star_detail",
        starId: starId ?? null,
      },
      metadata: {
        platform,
        referralCode: visibleReferralCode,
        rewardCp: loop.rewards.cp,
        rewardCreatorProgressPercent: loop.rewards.creatorProgressPercent,
        rewardInfluenceScore: loop.rewards.influenceScore,
        selectedUniverse: displayUniverse,
      },
      referralCode: visibleReferralCode,
      targetHref: visibleShareLink,
    });
  }

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
            className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800"
            onClick={() => setIsGenerated(true)}
            type="button"
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="min-w-0 whitespace-normal [word-break:keep-all]">
              {copy.actions.createMockReferral}
            </span>
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
            <button
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#12041f] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#2a0f42] sm:w-auto"
              onClick={() => setIsSharePanelOpen(true)}
              type="button"
            >
              <Share2 className="size-4" />
              {panelLabels.open}
            </button>
          </div>
        ) : null}

        <ReferralShareOutcomeCard
          copy={copy}
          hasSharedReferral={hasSharedReferral}
          isReferralGenerated={isReferralGenerated}
          locale={locale}
          rewards={loop.rewards}
          starId={starId}
        />
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
        {isMockFounder ? (
          <button
            className={actionClassName}
            onClick={() => {
              setIsGenerated(true);
              setIsSharePanelOpen(true);
            }}
            type="button"
          >
            {actionLabel}
          </button>
        ) : shouldUseFounderActionPanel && starId ? (
          <button
            className={actionClassName}
            onClick={() => setIsJoinPanelOpen(true)}
            type="button"
          >
            {actionLabel}
          </button>
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

      {shouldUseFounderActionPanel && starId ? (
        <FanletterResponsiveActionPanel
          closeLabel={panelLabels.joinClose}
          description={panelLabels.joinDescription}
          eyebrow={displayUniverse}
          onClose={() => setIsJoinPanelOpen(false)}
          open={isJoinPanelOpen}
          title={panelLabels.joinTitle}
        >
          <div className="grid gap-4">
            <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {copy.labels.referralCode}
              </p>
              <p className="mt-1 break-all font-mono text-lg font-semibold text-zinc-950">
                {visibleReferralCode}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  copy.labels.aiStarDiscovery,
                  copy.actions.joinAsFounder,
                  "AgentRank",
                ].map((step, index) => (
                  <div
                    className="rounded-lg border border-zinc-200 bg-white p-2 text-center"
                    key={`${step}-${index}-join`}
                  >
                    <span className="mx-auto flex size-7 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-[0.68rem] font-semibold leading-4 text-zinc-700 [word-break:keep-all]">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {panelLabels.signal}
              </p>
              <div className="mt-3 grid gap-2">
                {["founder_joined", "referral_code_created"].map(
                  (eventName) => (
                    <div
                      className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                      key={eventName}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-[#6d28d9]">
                        <GitBranch className="size-4" />
                      </span>
                      <span className="min-w-0 truncate font-mono text-xs font-semibold text-zinc-700">
                        {eventName}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </section>

            {isFounderJoinAction ? (
              <FanletterFounderJoinLink
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800"
                href={actionHref}
                locale={locale}
                mode="live"
                referralCode={joinReferralCode}
                starId={starId}
                useResponseUniverseHref
              >
                <Crown className="size-4" />
                {panelLabels.joinConfirm}
              </FanletterFounderJoinLink>
            ) : actionHref.startsWith("http") ? (
              <a
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800"
                href={actionHref}
                rel="noreferrer"
                target="_blank"
              >
                <Crown className="size-4" />
                {actionLabel}
              </a>
            ) : (
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800"
                href={actionHref}
              >
                <Crown className="size-4" />
                {actionLabel}
              </Link>
            )}
          </div>
        </FanletterResponsiveActionPanel>
      ) : null}

      <FanletterResponsiveActionPanel
        closeLabel={panelLabels.close}
        description={copy.starDetail.referralBody}
        eyebrow={copy.labels.scoutShareLoop}
        onClose={() => setIsSharePanelOpen(false)}
        open={isSharePanelOpen}
        title={panelLabels.title}
      >
        <div className="grid gap-4">
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {copy.labels.referralCode}
            </p>
            <p className="mt-1 break-all font-mono text-lg font-semibold text-zinc-950">
              {visibleReferralCode}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {copy.actions.shareLink}
            </p>
            <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs font-semibold leading-5 text-[#5b21b6]">
              {visibleShareLink}
            </p>
            <CopyTextButton
              className="mt-3 min-h-11 w-full border-black/10 py-2.5 text-sm font-semibold leading-tight"
              copiedLabel={copy.actions.copied}
              copyLabel={copy.actions.copyLink}
              onCopied={() => markReferralShared("copy")}
              text={visibleShareLink}
            />
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              SNS
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {platformLinks.map((platformLink) => (
                <a
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-semibold leading-tight text-zinc-700 transition hover:border-[#7c3aed]/40 hover:text-[#5b21b6]"
                  href={platformLink.href}
                  key={platformLink.label}
                  onClick={() => markReferralShared(platformLink.label)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {platformLink.label}
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {panelLabels.flow}
            </p>
            <div className="mt-3 grid gap-2">
              {flowItems.map((item, index) => (
                <div
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                  key={`${item}-${index}-panel`}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-xs font-semibold text-[#6d28d9]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold leading-5 text-zinc-900 [word-break:keep-all]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-[#12041f] p-4 text-white">
            <p className="text-sm font-semibold text-fuchsia-100">
              {panelLabels.reward}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/12 bg-white/10 p-3">
                <p className="text-lg font-semibold">+{loop.rewards.cp}</p>
                <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
                  CP
                </p>
              </div>
              <div className="rounded-lg border border-white/12 bg-white/10 p-3">
                <p className="text-lg font-semibold">
                  +{loop.rewards.influenceScore}
                </p>
                <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
                  {copy.labels.influenceScore}
                </p>
              </div>
              <div className="rounded-lg border border-white/12 bg-white/10 p-3">
                <p className="text-lg font-semibold">
                  +{loop.rewards.creatorProgressPercent}%
                </p>
                <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
                  {copy.labels.creatorProgress}
                </p>
              </div>
            </div>
          </section>

          <ReferralShareOutcomeCard
            copy={copy}
            hasSharedReferral={hasSharedReferral}
            isReferralGenerated={isReferralGenerated}
            locale={locale}
            rewards={loop.rewards}
            starId={starId}
          />
        </div>
      </FanletterResponsiveActionPanel>
    </article>
  );
}
