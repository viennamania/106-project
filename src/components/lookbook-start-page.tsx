"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { useMemberSession } from "@/components/member-session-provider";
import type { Dictionary, Locale } from "@/lib/i18n";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { smartWalletChain, thirdwebClient } from "@/lib/thirdweb";
import { getThirdwebUserEmail } from "@/lib/thirdweb-client";

/**
 * Lookbook-dedicated onboarding — a minimal, lookbook-framed entry that gets a
 * first-time seller into the studio with the least friction.
 *
 * Email sign-in only (thirdweb in-app wallet, no crypto). On connect it mirrors
 * the canonical sync (getThirdwebUserEmail → syncServerMemberRegistration →
 * updateMemberSession) to create/attach the member, then routes to the studio
 * where pending_payment members get the free trial.
 */
export function LookbookStartPage({
  dictionary,
  locale,
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const account = useActiveAccount();
  const accountAddress = account?.address ?? null;
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const { updateMemberSession } = useMemberSession();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState<{ id: string; images: string[] }[]>([]);
  const syncedRef = useRef(false);

  const en = locale === "en";
  const studioHref = `/${locale}/fanletter/studio/lookbook`;

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/seller/stars");
        const data = (await res.json().catch(() => null)) as
          | { stars?: { id: string; images: string[] }[] }
          | null;
        if (res.ok && Array.isArray(data?.stars)) {
          setStars(data.stars.slice(0, 8));
        }
      } catch {
        // best-effort preview
      }
    })();
  }, []);

  useEffect(() => {
    if (!accountAddress || syncedRef.current) {
      return;
    }
    syncedRef.current = true;
    let cancelled = false;

    void (async () => {
      setIsSyncing(true);
      setError(null);
      try {
        const email = await getThirdwebUserEmail({ client: thirdwebClient });
        if (!email) {
          throw new Error(
            en ? "Email is not available yet." : "이메일을 가져오지 못했습니다.",
          );
        }
        const result = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        });
        if (!result.ok || !result.member) {
          throw new Error(
            result.ok
              ? en
                ? "Sign-in failed."
                : "로그인에 실패했습니다."
              : result.error,
          );
        }
        if (cancelled) {
          return;
        }
        updateMemberSession({
          email: result.member.email,
          member: result.member,
          walletAddress: accountAddress,
        });
        router.push(studioHref);
      } catch (syncError) {
        if (cancelled) {
          return;
        }
        syncedRef.current = false; // allow a retry
        setIsSyncing(false);
        setError(
          syncError instanceof Error
            ? syncError.message
            : en
              ? "Sign-in failed."
              : "로그인에 실패했습니다.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    accountAddress,
    chain.id,
    chain.name,
    en,
    locale,
    router,
    studioHref,
    updateMemberSession,
  ]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="mb-1.5 flex items-center gap-2 text-[#16702e]">
        <Sparkles className="h-4 w-4" />
        <span className="text-[11px] font-extrabold uppercase tracking-wider">
          FanLetter Studio
        </span>
      </div>
      <h1 className="text-2xl font-black leading-snug tracking-tight text-neutral-900">
        {en
          ? "Make an AI lookbook from one garment photo"
          : "옷 사진 한 장으로 AI 룩북 만들기"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        {en
          ? "Pick a Korean AI star, upload your product photo, and get a shop-ready lookbook in about a minute."
          : "한국형 AI 스타를 고르고 상품 사진을 올리면 1분 안에 쇼핑몰용 룩북이 나옵니다."}
      </p>

      <ul className="mt-5 space-y-2 text-sm font-semibold text-neutral-600">
        <li>🎁 {en ? "Free trial shots to start" : "신규 무료 체험 컷 제공"}</li>
        <li>
          🧑‍🎤{" "}
          {en
            ? "Model is always an AI star — no real people"
            : "모델은 항상 AI 스타 (실제 인물 아님)"}
        </li>
        <li>
          👕 {en ? "Color, print & logos preserved" : "옷의 색·프린트·로고 보존"}
        </li>
      </ul>

      {stars.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-bold text-neutral-400">
            {en
              ? "Pick from Korean AI stars like these"
              : "이런 한국형 AI 스타로 만들어요"}
          </p>
          <div className="flex flex-wrap gap-2">
            {stars.map((star) => (
              <span
                className="block h-11 w-11 overflow-hidden rounded-full ring-1 ring-black/10"
                key={star.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="AI star"
                  className="h-full w-full object-cover"
                  src={star.images[0]}
                />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {isSyncing ? (
        <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-7 py-3.5 text-sm font-extrabold text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          {en ? "Signing you in…" : "로그인 중…"}
        </div>
      ) : accountAddress ? (
        <a
          className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-black"
          href={studioHref}
        >
          <Sparkles className="h-4 w-4" />
          {en ? "Go to the studio" : "스튜디오로 이동"}
        </a>
      ) : (
        <button
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-black"
          onClick={() => setIsLoginOpen(true)}
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          {en ? "Start free with email" : "이메일로 무료 시작"}
        </button>
      )}

      {error ? (
        <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>
      ) : null}

      <p className="mt-3 text-center text-[11px] text-neutral-400">
        {en
          ? "Email sign-in only — no crypto wallet needed."
          : "이메일 로그인만 — 크립토 지갑이 필요 없습니다."}
      </p>

      {!accountAddress ? (
        <p className="mt-4 text-center text-[11px] text-neutral-400">
          <a
            className="underline hover:text-neutral-600"
            href={`/${locale}/fanletter/onboarding?returnTo=${encodeURIComponent(
              studioHref,
            )}`}
          >
            {en
              ? "Trouble signing in? Use the standard sign-in"
              : "로그인이 안 되나요? 기존 방식으로 시작"}
          </a>
        </p>
      ) : null}

      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => setIsLoginOpen(false)}
        open={isLoginOpen}
        title={en ? "Sign in with email" : "이메일로 로그인"}
        variant="fanletter"
      />
    </div>
  );
}
