import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, UserRound } from "lucide-react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { Locale } from "@/lib/i18n";
import type { AIStar } from "@/mock/fanletterV2";

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarBadge: "AI 스타",
      body:
        "이 가입은 아래 AI 스타 유니버스의 파운더 참여로 귀속됩니다. 실결제 없이 추천 흐름만 미리 보여줍니다.",
      founderBadge: "파운더",
      founderClubLabel: "파운더 클럽 2.0",
      growth: "성장률",
      memberBadge: "멤버",
      memberLabel: "신규 회원",
      openSlots: "잔여 슬롯",
      referralCode: "추천 코드",
      starScore: "스타 점수",
      title: "파운더 참여 귀속",
      universeCta: "유니버스 보기",
    };
  }

  return {
    aiStarBadge: "AI STAR",
    body:
      "This signup is attributed to the AI Star Universe below as a Founder join. It previews the mock referral flow without real payment.",
    founderBadge: "FOUNDER",
    founderClubLabel: "Founder Club 2.0",
    growth: "Growth",
    memberBadge: "MEMBER",
    memberLabel: "New Member",
    openSlots: "Open Slots",
    referralCode: "Referral Code",
    starScore: "Star Score",
    title: "Founder join attribution",
    universeCta: "View Universe",
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

export function FanletterFounderAttributionCard({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string | null;
  star: AIStar;
}) {
  const copy = getCopy(locale);
  const universeName = getDisplayUniverseName(star.universeName, locale);

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
                {copy.title}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-black/62">
                {copy.body}
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

          {referralCode ? (
            <div className="mt-4 rounded-lg border border-black/8 bg-[#f6f8f4] p-3">
              <p className="text-xs font-semibold uppercase text-black/48">
                {copy.referralCode}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-[#5b21b6]">
                {referralCode}
              </p>
            </div>
          ) : null}

          <Link
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(124,58,237,0.18)] transition hover:bg-[#6d28d9]"
            href={`/${locale}/fanletter/${star.id}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`}
          >
            {copy.universeCta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
