import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Link2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { CopyTextButton } from "@/components/copy-text-button";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { Locale } from "@/lib/i18n";
import type { AIStar, ScoutShareLoopData } from "@/mock/fanletterV2";

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarBadge: "AI 스타",
      body:
        "계정 연결 후 이 가입은 아래 AI 스타 유니버스의 파운더 참여로 저장됩니다. 실제 결제는 진행하지 않습니다.",
      connectedBody:
        "계정 연결이 확인되었습니다. 파운더 참여를 확정하면 이 AI 스타 유니버스의 멤버십과 추천 코드가 저장됩니다.",
      connectedTitle: "파운더 참여 확정 대기",
      completedBody:
        "이미 이 AI 스타 유니버스의 파운더입니다. 내 추천 링크로 새 파운더를 초대하면 CP와 영향력이 누적됩니다.",
      completedTitle: "파운더 가입 완료",
      founderBadge: "파운더",
      founderClubLabel: "파운더 클럽 2.0",
      growth: "성장률",
      memberBadge: "멤버",
      memberLabel: "신규 회원",
      openSlots: "잔여 슬롯",
      referralCode: "추천 코드",
      shareLink: "공유 링크",
      sharePlatforms: "SNS 공유",
      shareCta: "내 추천 링크 공유",
      starScore: "스타 점수",
      title: "파운더 참여 귀속",
      universeCta: "AI 스타 유니버스 보기",
      rewards: {
        cp: "CP",
        creatorProgress: "크리에이터 진행률",
        influence: "영향력",
        title: "적립 보상",
      },
    };
  }

  return {
    aiStarBadge: "AI STAR",
    body:
      "After account connection, this signup is saved as a Founder join in the AI Star Universe below. No real payment is processed.",
    connectedBody:
      "Your account is connected. Confirm Founder join to save membership and referral code for this AI Star Universe.",
    connectedTitle: "Founder join pending",
    completedBody:
      "You are already a Founder in this AI Star Universe. Invite new Founders with your link to grow CP and influence.",
    completedTitle: "Founder join complete",
    founderBadge: "FOUNDER",
    founderClubLabel: "Founder Club 2.0",
    growth: "Growth",
    memberBadge: "MEMBER",
    memberLabel: "New Member",
    openSlots: "Open Slots",
    referralCode: "Referral Code",
    shareLink: "Share Link",
    sharePlatforms: "SNS Share",
    shareCta: "Share my Founder link",
    starScore: "Star Score",
    title: "Founder join attribution",
    universeCta: "View AI Star Universe",
    rewards: {
      cp: "CP",
      creatorProgress: "Creator Progress",
      influence: "Influence",
      title: "Earned Rewards",
    },
  };
}

function getDisplayUniverseName(value: string, locale: Locale) {
  if (locale !== "ko") {
    return value;
  }

  const replacements: Record<string, string> = {
    "Harin Universe": "하린 유니버스",
    "Minseo Universe": "민서 유니버스",
    "Seoyeon Universe": "서연 유니버스",
    "Yoonseo Universe": "윤서 유니버스",
  };

  return replacements[value] ?? value.replace(/\bUniverse\b/g, "유니버스");
}

function buildFallbackPlatformHref(platform: string, shareLink: string) {
  if (platform === "X") {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("url", shareLink);

    return url.toString();
  }

  return shareLink;
}

export function FanletterFounderAttributionCard({
  isAuthenticated = false,
  locale,
  referralCode,
  star,
  viewerScoutShareLoop = null,
}: {
  isAuthenticated?: boolean;
  locale: Locale;
  referralCode: string | null;
  star: AIStar;
  viewerScoutShareLoop?: ScoutShareLoopData | null;
}) {
  const copy = getCopy(locale);
  const universeName = getDisplayUniverseName(star.universeName, locale);
  const isFounder = Boolean(viewerScoutShareLoop);
  const statusTitle = isFounder
    ? copy.completedTitle
    : isAuthenticated
      ? copy.connectedTitle
      : copy.title;
  const statusBody = isFounder
    ? copy.completedBody
    : isAuthenticated
      ? copy.connectedBody
      : copy.body;
  const visibleReferralCode =
    viewerScoutShareLoop?.referralCode ?? referralCode ?? null;
  const shareLink = viewerScoutShareLoop?.shareLink ?? null;
  const platformLinks =
    viewerScoutShareLoop?.sharePlatformLinks?.map((platformLink) => ({
      href: platformLink.href,
      label: platformLink.label,
    })) ??
    (shareLink && viewerScoutShareLoop
      ? viewerScoutShareLoop.sharePlatforms.map((platform) => ({
          href: buildFallbackPlatformHref(platform, shareLink),
          label: platform,
        }))
      : []);
  const universeHref = `/${locale}/fanletter/${star.id}${
    visibleReferralCode ? `?ref=${encodeURIComponent(visibleReferralCode)}` : ""
  }`;

  return (
    <article className="mx-auto mb-8 max-w-6xl overflow-hidden rounded-lg border border-violet-200 bg-white shadow-[0_24px_70px_rgba(88,28,135,0.14)]">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div
          className="p-4 text-white sm:p-5"
          style={{
            background: `linear-gradient(150deg, ${star.accentColor}, #271045 64%, #12041f)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-[#4c1d95]">
              <Bot className="size-3.5" />
              {copy.aiStarBadge}
            </span>
            <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold text-white/76">
              {copy.starScore} {star.starScore}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[8rem_1fr] sm:items-center">
            <div
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-white/24 text-2xl font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_18px_34px_rgba(0,0,0,0.22)]"
              style={{
                background: `radial-gradient(circle at 70% 22%, ${star.accentSecondary}, transparent 28%), rgba(255,255,255,0.12)`,
              }}
            >
              {star.portraitImageUrl ? (
                <Image
                  alt={`${star.name} portrait`}
                  className="object-cover"
                  fill
                  sizes="8rem"
                  src={star.portraitImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    star.portraitImageUrl,
                  )}
                />
              ) : (
                star.portraitInitials
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-[2rem] font-semibold leading-tight tracking-normal">
                {star.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/62">
                {universeName}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/12 bg-white/10 p-3">
                  <p className="text-xl font-semibold">
                    +{star.growthPercent}%
                  </p>
                  <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
                    {copy.growth}
                  </p>
                </div>
                <div className="rounded-lg border border-white/12 bg-white/10 p-3">
                  <p className="text-xl font-semibold">
                    {star.openSlots.open}/{star.openSlots.total}
                  </p>
                  <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
                    {copy.openSlots}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#ede9fe] text-[#6d28d9]">
              <BadgeCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#6d28d9]">
                {copy.founderClubLabel}
              </p>
              <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
                {statusTitle}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-black/62">
                {statusBody}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="flex min-h-16 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-sm font-semibold text-zinc-600">
                <UserRound className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {copy.memberLabel}
                </p>
                <p className="text-xs font-semibold text-zinc-500">
                  {copy.memberBadge}
                </p>
              </div>
            </div>
            <ArrowRight className="mx-auto hidden size-5 text-[#7c3aed] sm:block" />
            <div className="flex min-h-16 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-sm font-semibold text-zinc-600">
                FN
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {universeName}
                </p>
                <p className="text-xs font-semibold text-zinc-500">
                  {copy.founderBadge}
                </p>
              </div>
            </div>
          </div>

          {visibleReferralCode ? (
            <div className="mt-4 rounded-lg border border-black/8 bg-[#f6f8f4] p-3">
              <p className="text-xs font-semibold uppercase text-black/48">
                {copy.referralCode}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-[#5b21b6]">
                {visibleReferralCode}
              </p>
              {shareLink ? (
                <div className="mt-3 rounded-lg border border-black/8 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-black/48">
                    <Link2 className="size-3.5" />
                    {copy.shareLink}
                  </div>
                  <p className="mt-2 break-all font-mono text-[0.68rem] font-semibold leading-4 text-[#5b21b6]">
                    {shareLink}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <CopyTextButton
                      className="h-10 border-black/10 text-sm font-semibold"
                      copiedLabel={locale === "ko" ? "복사됨" : "Copied"}
                      copyLabel={locale === "ko" ? "링크 복사" : "Copy link"}
                      text={shareLink}
                    />
                    {platformLinks.map((platformLink) => (
                      <a
                        className="inline-flex h-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-[#5b21b6] transition hover:border-violet-300 hover:bg-violet-100"
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
          ) : null}

          {viewerScoutShareLoop ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <Sparkles className="size-4" />
                {copy.rewards.title}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-emerald-200 bg-white p-3">
                  <p className="text-lg font-semibold text-emerald-950">
                    +{viewerScoutShareLoop.rewards.cp}
                  </p>
                  <p className="mt-1 text-[0.62rem] font-semibold text-emerald-900/56">
                    {copy.rewards.cp}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-white p-3">
                  <p className="text-lg font-semibold text-emerald-950">
                    +{viewerScoutShareLoop.rewards.influenceScore}
                  </p>
                  <p className="mt-1 text-[0.62rem] font-semibold text-emerald-900/56">
                    {copy.rewards.influence}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-white p-3">
                  <p className="text-lg font-semibold text-emerald-950">
                    +{viewerScoutShareLoop.rewards.creatorProgressPercent}%
                  </p>
                  <p className="mt-1 text-[0.62rem] font-semibold text-emerald-900/56">
                    {copy.rewards.creatorProgress}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(124,58,237,0.18)] transition hover:bg-[#6d28d9]"
              href={isFounder ? `${universeHref}#referral-builder` : universeHref}
            >
              {isFounder ? copy.shareCta : copy.universeCta}
              <ArrowRight className="size-4" />
            </Link>
            {isFounder ? (
              <Link
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-[#5b21b6] transition hover:border-violet-300 hover:bg-violet-100"
                href={universeHref}
              >
                {copy.universeCta}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
