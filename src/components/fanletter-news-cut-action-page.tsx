"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
  Share2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

export type FanletterNewsCutAction =
  | "alerts"
  | "characters"
  | "continue"
  | "share";

type FanletterNewsCutActionPageProps = {
  action: FanletterNewsCutAction;
  characterName: string | null;
  characterReferralCode: string | null;
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
  shareId: string | null;
  sourceReportId: string | null;
};

type ShareState = "copied" | "error" | "idle" | "sharing";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          alerts: {
            body:
              "공유 링크로 본 AI 캐릭터의 새 팬 리포트와 다음 브이로그 요청 흐름을 놓치지 않도록 뉴스 계정을 연결합니다.",
            cta: "계정 연결하고 알림 받기",
            eyebrow: "새 리포트 알림",
            step1: "이메일로 가볍게 연결",
            step2: "새 리포트와 요청 반응 저장",
            step3: "공유 링크 밖에서도 다시 이어보기",
            title: "다음 업데이트를 받을 준비",
          },
          characters: {
            body:
              "AIAVpark는 숏폼 유통 피드가 아니라 팬이 장면을 고르고 요청을 남기며 AI 캐릭터 브이로그를 키우는 제작 플랫폼입니다.",
            cta: "AI 캐릭터 디스커버리 열기",
            eyebrow: "AI 캐릭터 탐색",
            step1: "활동 중인 캐릭터 확인",
            step2: "팬 리포트와 원본 브이로그 비교",
            step3: "보고 싶은 캐릭터 흐름 선택",
            title: "다른 AI 캐릭터도 이어보기",
          },
          continue: {
            body:
              "방금 본 컷과 팬 반응은 하나의 캐릭터 IP 타임라인에 쌓입니다. 같은 캐릭터의 브이로그와 팬 리포트를 이어서 확인하세요.",
            cta: "캐릭터 전용 피드 열기",
            eyebrow: "캐릭터 타임라인",
            step1: "같은 캐릭터 리포트 모아보기",
            step2: "원본 브이로그와 팬 요청 확인",
            step3: "다음 보고 싶은 장면 남기기",
            title: "이 캐릭터 흐름으로 계속",
          },
          share: {
            body:
              "이 링크를 공유하면 유입 사용자가 어떤 컷에 오래 머무는지, 다음 리포트로 이어지는지 공유 캠페인 신호로 쌓입니다.",
            cta: "이 공유 흐름 보내기",
            eyebrow: "공유 흐름",
            step1: "SNS 인앱 브라우저로 유입",
            step2: "컷별 체류와 다음 선택 수집",
            step3: "공유 캠페인에서 반응 분석",
            title: "이 흐름을 다시 공유",
          },
        },
        back: "방금 보던 흐름",
        copied: "공유 링크가 복사됐어요",
        error: "공유 링크를 준비하지 못했습니다",
        fallbackCharacter: "AI 캐릭터",
        manageShares: "공유 캠페인 보기",
        openCharacters: "AI 캐릭터 둘러보기",
        openConnect: "뉴스 계정 연결",
        openCharacter: (name: string) => `${name} 계속 보기`,
        platformLabel: "팬이 키우는 AI 캐릭터 브이로그",
        sharing: "공유 준비 중",
      }
    : {
        actions: {
          alerts: {
            body:
              "Connect a News account so new fan reports and next-vlog request signals can continue after this shared link.",
            cta: "Connect account for alerts",
            eyebrow: "New report alerts",
            step1: "Light email connection",
            step2: "Save report and request signals",
            step3: "Return beyond the shared link",
            title: "Get ready for the next update",
          },
          characters: {
            body:
              "AIAVpark is not just a short-video feed. Fans pick scenes, leave requests, and help shape AI character vlog IP.",
            cta: "Open AI character discovery",
            eyebrow: "AI character discovery",
            step1: "See active characters",
            step2: "Compare reports and source vlogs",
            step3: "Choose a character flow",
            title: "Keep exploring other AI characters",
          },
          continue: {
            body:
              "The cuts and fan reactions you just saw become part of one character IP timeline. Continue into the same character.",
            cta: "Open character feed",
            eyebrow: "Character timeline",
            step1: "View same-character reports",
            step2: "Check source vlogs and fan requests",
            step3: "Leave the next scene idea",
            title: "Continue this character flow",
          },
          share: {
            body:
              "When this link is shared, dwell time, next-report choices, and source-entry signals become campaign analytics.",
            cta: "Share this flow",
            eyebrow: "Share flow",
            step1: "Enter through SNS in-app browsers",
            step2: "Collect cut dwell and next choices",
            step3: "Analyze campaign reactions",
            title: "Share this flow again",
          },
        },
        back: "Back to flow",
        copied: "Share link copied",
        error: "Could not prepare the share link",
        fallbackCharacter: "AI character",
        manageShares: "View share campaigns",
        openCharacters: "Browse AI characters",
        openConnect: "Connect News account",
        openCharacter: (name: string) => `Continue ${name}`,
        platformLabel: "AI character vlogs shaped by fans",
        sharing: "Preparing share",
      };
}

function getAbsoluteShareUrl(returnToHref: string) {
  if (typeof window === "undefined") {
    return returnToHref;
  }

  return new URL(returnToHref, window.location.origin).toString();
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function FanletterNewsCutActionPage({
  action,
  characterName,
  characterReferralCode,
  locale,
  referralCode,
  returnToHref,
  shareId,
  sourceReportId,
}: FanletterNewsCutActionPageProps) {
  const copy = getCopy(locale);
  const actionCopy = copy.actions[action];
  const displayCharacterName = characterName?.trim() || copy.fallbackCharacter;
  const [shareState, setShareState] = useState<ShareState>("idle");
  const characterHref = characterReferralCode
    ? setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/fanletter/news/cuts/characters/${characterReferralCode}`,
          referralCode ?? characterReferralCode,
        ),
        {
          returnTo: returnToHref,
          shareId,
          sourceReportId,
        },
      )
    : setPathSearchParams(
        buildPathWithReferral(`/${locale}/fanletter/news/cuts/characters`, referralCode),
        { returnTo: returnToHref },
      );
  const charactersHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/cuts/characters`, referralCode),
    { returnTo: returnToHref },
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: returnToHref },
  );
  const shareLinksHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/cuts/shares`, referralCode),
    { returnTo: returnToHref },
  );
  const primaryHref =
    action === "alerts"
      ? connectHref
      : action === "characters"
        ? charactersHref
        : characterHref;
  const steps = [actionCopy.step1, actionCopy.step2, actionCopy.step3];
  const secondaryHref = useMemo(() => {
    if (action === "share") {
      return shareLinksHref;
    }

    if (action === "characters") {
      return characterHref;
    }

    return charactersHref;
  }, [action, characterHref, charactersHref, shareLinksHref]);
  const secondaryLabel =
    action === "share"
      ? copy.manageShares
      : action === "alerts"
        ? copy.openCharacters
        : action === "characters"
          ? copy.openCharacter(displayCharacterName)
          : copy.openCharacters;
  const shareLabel =
    shareState === "copied"
      ? copy.copied
      : shareState === "error"
        ? copy.error
        : shareState === "sharing"
          ? copy.sharing
          : actionCopy.cta;

  const handleShare = async () => {
    if (shareState === "sharing") {
      return;
    }

    setShareState("sharing");

    const shareUrl = getAbsoluteShareUrl(returnToHref);

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          text: actionCopy.body,
          title: `${displayCharacterName} · AIAVpark News`,
          url: shareUrl,
        });
        setShareState("idle");
        return;
      }

      setShareState((await copyToClipboard(shareUrl)) ? "copied" : "error");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareState("idle");
        return;
      }

      setShareState("error");
    }
  };

  return (
    <main className="min-h-screen bg-[#050706] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(68,242,110,0.2),transparent_34%),linear-gradient(180deg,#0b130d,#050706_48%,#020302)] px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[0_0_56px_rgba(0,0,0,0.42)] sm:border-x sm:border-white/10">
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 text-xs font-black !text-white/82 backdrop-blur-xl"
          href={returnToHref}
        >
          <ArrowLeft className="size-4" />
          {copy.back}
        </Link>

        <section className="flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-4rem)] flex-col justify-center py-8">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510] shadow-[0_20px_54px_rgba(68,242,110,0.24)]">
              {action === "alerts" ? (
                <Bell className="size-7" />
              ) : action === "share" ? (
                <Share2 className="size-7" />
              ) : action === "characters" ? (
                <UsersRound className="size-7" />
              ) : (
                <Sparkles className="size-7" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#9bffad]">
                {actionCopy.eyebrow}
              </p>
              <p className="mt-1 text-sm font-black text-white/54">
                {displayCharacterName}
              </p>
            </div>
          </div>

          <h1 className="mt-6 break-words text-[2.5rem] font-black leading-[0.98] tracking-normal [word-break:keep-all]">
            {actionCopy.title}
          </h1>
          <p className="mt-4 break-words text-base font-bold leading-7 text-white/68 [word-break:keep-all]">
            {actionCopy.body}
          </p>

          <div className="mt-6 rounded-[1.35rem] border border-[#44f26e]/18 bg-black/46 p-4 shadow-[0_22px_68px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
              {copy.platformLabel}
            </p>
            <div className="mt-4 grid gap-2">
              {steps.map((step, index) => (
                <div
                  className="flex items-center gap-3 rounded-[0.95rem] border border-white/8 bg-white/[0.055] px-3 py-2.5"
                  key={step}
                >
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/14 text-[0.72rem] font-black text-[#9bffad]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 text-sm font-black leading-5 text-white/78 [word-break:keep-all]">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            {action === "share" ? (
              <button
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-base font-black text-[#111510] shadow-[0_18px_44px_rgba(68,242,110,0.24)] transition hover:bg-[#65ff86] focus:outline-none focus:ring-4 focus:ring-[#44f26e]/28 disabled:cursor-wait disabled:opacity-72"
                disabled={shareState === "sharing"}
                onClick={() => void handleShare()}
                type="button"
              >
                {shareState === "sharing" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : shareState === "copied" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Copy className="size-5" />
                )}
                {shareLabel}
              </button>
            ) : (
              <Link
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-base font-black !text-[#111510] shadow-[0_18px_44px_rgba(68,242,110,0.24)] transition hover:bg-[#65ff86] focus:outline-none focus:ring-4 focus:ring-[#44f26e]/28"
                href={primaryHref}
              >
                <Sparkles className="size-5" />
                {actionCopy.cta}
              </Link>
            )}
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 text-sm font-black !text-white/82 backdrop-blur-xl transition hover:border-[#44f26e]/38 hover:!text-[#9bffad]"
              href={secondaryHref}
            >
              {secondaryLabel}
              <ChevronRight className="size-4 text-[#44f26e]" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
