"use client";

import Link from "next/link";
import {
  AlertTriangle,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useMemberSession } from "@/components/member-session-provider";
import type { Locale } from "@/lib/i18n";
import { thirdwebClient } from "@/lib/thirdweb";
import { getThirdwebUserEmail } from "@/lib/thirdweb-client";
import {
  WALLET_UNLOCK_PIN_LENGTH,
  isValidWalletPin,
} from "@/lib/wallet-unlock";
import {
  WALLET_UNLOCK_SESSION_CHANGE_EVENT,
  isWalletUnlockedForSession,
  markWalletUnlockedForSession,
} from "@/lib/wallet-unlock-session";

type FanletterNsfwVideoPinGateProps = {
  connectHref?: string | null;
  locale: Locale;
  managePinHref: string;
  onUnlocked: () => void;
  title: string;
};

function getNsfwVideoPinCopy(locale: Locale) {
  return locale === "ko"
    ? {
        body:
          "성인 팬 전용 동영상은 재생 전에 로그인한 회원의 지갑 PIN 6자리를 확인합니다.",
        connect: "뉴스 지갑 연결",
        emailMissing: "이메일 지갑 정보를 확인하지 못했습니다.",
        incorrect: "PIN이 일치하지 않습니다. 다시 입력하세요.",
        locked: "PIN 오류가 여러 번 발생했습니다. 잠시 후 다시 시도하세요.",
        managePin: "PIN 관리",
        noWallet: "연결된 회원 지갑을 확인하지 못했습니다.",
        pinLabel: "NSFW 동영상 PIN",
        setupRequired:
          "지갑 PIN 설정이 필요합니다. PIN 설정 후 NSFW 동영상을 재생할 수 있습니다.",
        submit: "PIN 확인 후 재생",
        submitFailed: "PIN 확인에 실패했습니다.",
        title: "성인 영상 재생 전 PIN 확인",
        verifying: "확인 중",
      }
    : {
        body:
          "Adult fan-only videos require the signed-in member's 6-digit wallet PIN before playback.",
        connect: "Connect news wallet",
        emailMissing: "Could not find the email wallet.",
        incorrect: "The PIN does not match. Try again.",
        locked: "Too many wrong PIN attempts. Try again shortly.",
        managePin: "Manage PIN",
        noWallet: "Could not find the connected member wallet.",
        pinLabel: "NSFW video PIN",
        setupRequired:
          "Wallet PIN setup is required before playing NSFW video.",
        submit: "Verify PIN and play",
        submitFailed: "PIN confirmation failed.",
        title: "Confirm PIN before adult video playback",
        verifying: "Verifying",
      };
}

function mapNsfwVideoPinError(message: string, locale: Locale) {
  const copy = getNsfwVideoPinCopy(locale);

  if (message === "Wallet PIN is incorrect.") {
    return copy.incorrect;
  }

  if (message === "Wallet PIN is temporarily locked.") {
    return copy.locked;
  }

  if (message === "Wallet PIN is not configured.") {
    return copy.setupRequired;
  }

  return message;
}

export function FanletterNsfwVideoPinGate({
  connectHref,
  locale,
  managePinHref,
  onUnlocked,
  title,
}: FanletterNsfwVideoPinGateProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { accountAddress, email, isValidating } = useMemberSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const copy = getNsfwVideoPinCopy(locale);
  const isSubmitting = status === "submitting";
  const pinReady = isValidWalletPin(pin);

  useEffect(() => {
    const syncWalletUnlockSession = () => {
      if (
        isWalletUnlockedForSession({
          email,
          walletAddress: accountAddress,
        })
      ) {
        onUnlocked();
      }
    };

    syncWalletUnlockSession();
    window.addEventListener(
      WALLET_UNLOCK_SESSION_CHANGE_EVENT,
      syncWalletUnlockSession,
    );
    window.addEventListener("storage", syncWalletUnlockSession);

    return () => {
      window.removeEventListener(
        WALLET_UNLOCK_SESSION_CHANGE_EVENT,
        syncWalletUnlockSession,
      );
      window.removeEventListener("storage", syncWalletUnlockSession);
    };
  }, [accountAddress, email, onUnlocked]);

  const submitPin = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    if (!pinReady) {
      setError(
        locale === "ko"
          ? `PIN 숫자 ${WALLET_UNLOCK_PIN_LENGTH}자리를 입력하세요.`
          : `Enter the ${WALLET_UNLOCK_PIN_LENGTH}-digit PIN.`,
      );
      inputRef.current?.focus();
      return;
    }

    if (!accountAddress) {
      setError(copy.noWallet);
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const resolvedEmail =
        email ?? (await getThirdwebUserEmail({ client: thirdwebClient }));

      if (!resolvedEmail) {
        throw new Error(copy.emailMissing);
      }

      const response = await fetch("/api/wallet/unlock", {
        body: JSON.stringify({
          action: "verify",
          email: resolvedEmail,
          pin,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? copy.submitFailed);
      }

      markWalletUnlockedForSession({
        email: resolvedEmail,
        walletAddress: accountAddress,
      });
      setPin("");
      onUnlocked();
    } catch (error) {
      setPin("");
      setError(
        mapNsfwVideoPinError(
          error instanceof Error ? error.message : copy.submitFailed,
          locale,
        ),
      );
      inputRef.current?.focus();
    } finally {
      setStatus("idle");
    }
  }, [
    accountAddress,
    copy.emailMissing,
    copy.noWallet,
    copy.submitFailed,
    email,
    isSubmitting,
    locale,
    onUnlocked,
    pin,
    pinReady,
  ]);

  return (
    <div className="w-full max-w-sm border border-white/18 bg-[#07100b]/94 p-3 text-left text-white shadow-[0_22px_60px_rgba(0,0,0,0.44)] backdrop-blur-xl sm:max-w-md sm:p-5">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center border border-[#44f26e]/34 bg-[#44f26e] text-black sm:size-11">
          <LockKeyhole className="size-4 sm:size-5" />
        </span>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#44f26e] sm:text-[0.68rem] sm:tracking-[0.16em]">
            <ShieldCheck className="size-3.5" />
            NSFW Video PIN
          </p>
          <h3 className="mt-1 break-words text-base font-black leading-tight [word-break:keep-all] sm:text-xl">
            {copy.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs font-semibold leading-5 text-white/68 sm:mt-2 sm:line-clamp-2 sm:text-sm sm:leading-6">
            {title}
          </p>
        </div>
      </div>

      <p className="mt-2 text-sm font-medium leading-6 text-white/70 sm:mt-3">
        {copy.body}
      </p>

      {!accountAddress && !isValidating ? (
        <div className="mt-3 border border-amber-300/28 bg-amber-300/12 p-3 sm:mt-4">
          <p className="inline-flex items-start gap-2 text-sm font-semibold leading-6 text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {copy.noWallet}
          </p>
          {connectHref ? (
            <Link
              className="mt-3 inline-flex h-10 w-full items-center justify-center border border-[#44f26e]/34 bg-[#44f26e] px-3 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
              href={connectHref}
            >
              {copy.connect}
            </Link>
          ) : null}
        </div>
      ) : null}

      <form
        className="mt-3 sm:mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submitPin();
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          {copy.pinLabel}
        </label>
        <input
          autoComplete="one-time-code"
          className="h-12 w-full border border-white/18 bg-white px-4 text-center text-lg font-black tracking-[0.18em] text-[#111510] outline-none transition placeholder:text-sm placeholder:font-bold placeholder:tracking-normal placeholder:text-black/34 focus:border-[#44f26e] disabled:cursor-not-allowed disabled:opacity-58 sm:h-[3.25rem] sm:text-xl sm:tracking-[0.2em]"
          disabled={isSubmitting}
          id={inputId}
          inputMode="numeric"
          maxLength={WALLET_UNLOCK_PIN_LENGTH}
          onChange={(event) => {
            setPin(
              event.target.value
                .replace(/\D/gu, "")
                .slice(0, WALLET_UNLOCK_PIN_LENGTH),
            );
            setError(null);
          }}
          pattern={`\\d{${WALLET_UNLOCK_PIN_LENGTH}}`}
          placeholder={
            locale === "ko"
              ? `PIN ${WALLET_UNLOCK_PIN_LENGTH}자리`
              : `${WALLET_UNLOCK_PIN_LENGTH}-digit PIN`
          }
          ref={inputRef}
          type="password"
          value={pin}
        />

        {error ? (
          <p className="mt-3 border border-rose-300/28 bg-rose-500/14 px-3 py-2 text-sm font-semibold leading-5 text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 border border-[#44f26e]/34 bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c] disabled:cursor-not-allowed disabled:border-white/14 disabled:bg-white/18 disabled:!text-white/40 sm:h-11"
            disabled={!pinReady || isSubmitting || !accountAddress}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                {copy.verifying}
              </>
            ) : (
              copy.submit
            )}
          </button>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 border border-white/18 bg-white/8 px-4 text-sm font-black !text-white transition hover:border-white/34 hover:bg-white/14 sm:h-11"
            href={managePinHref}
          >
            <LockKeyhole className="size-4" />
            {copy.managePin}
          </Link>
        </div>
      </form>
    </div>
  );
}
