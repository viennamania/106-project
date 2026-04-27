"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Delete, LoaderCircle, LockKeyhole } from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import type { Dictionary, Locale } from "@/lib/i18n";
import { buildReferralLandingPath } from "@/lib/landing-branding";
import {
  getAppMetadata,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getWalletUnlockCopy,
  WALLET_UNLOCK_PIN_LENGTH,
} from "@/lib/wallet-unlock";
import { markWalletUnlockedForSession } from "@/lib/wallet-unlock-session";
import { cn } from "@/lib/utils";

type WalletUnlockMode = "checking" | "confirm" | "setup" | "unlock";

type WalletUnlockStatusResponse = {
  configured: boolean;
  lockedUntil: string | null;
};

type WalletUnlockMutationResponse = {
  configured?: boolean;
  ok?: boolean;
};

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

export function WalletUnlockPage({
  dictionary,
  locale,
  referralCode = null,
  returnTo,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnTo: string;
}) {
  const router = useRouter();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountAddress = account?.address ?? null;
  const copy = getWalletUnlockCopy(locale);
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const fallbackHref = buildReferralLandingPath(locale, referralCode);
  const [email, setEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<WalletUnlockMode>("checking");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isResetRequested, setIsResetRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isConnected = connectionStatus === "connected" && Boolean(accountAddress);

  const title = useMemo(() => {
    if (mode === "setup") {
      if (isResetRequested) {
        return copy.resetTitle;
      }

      return copy.setupTitle;
    }

    if (mode === "confirm") {
      return copy.confirmTitle;
    }

    return copy.unlockTitle;
  }, [
    copy.confirmTitle,
    copy.resetTitle,
    copy.setupTitle,
    copy.unlockTitle,
    isResetRequested,
    mode,
  ]);

  const subtitle = useMemo(() => {
    if (mode === "checking") {
      return copy.preparing;
    }

    if (mode === "setup") {
      if (isResetRequested) {
        return copy.resetDescription;
      }

      return copy.setupSubtitle;
    }

    if (mode === "confirm") {
      return copy.confirmSubtitle;
    }

    return copy.unlockSubtitle;
  }, [
    copy.confirmSubtitle,
    copy.preparing,
    copy.resetDescription,
    copy.setupSubtitle,
    copy.unlockSubtitle,
    isResetRequested,
    mode,
  ]);

  const completeUnlock = useCallback(
    (resolvedEmail: string, walletAddress: string) => {
      markWalletUnlockedForSession({
        email: resolvedEmail,
        walletAddress,
      });
      router.replace(returnTo);
    },
    [returnTo, router],
  );

  const loadWalletUnlockStatus = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setMode("checking");
    setError(null);

    try {
      const nextEmail = await getUserEmail({ client: thirdwebClient });

      if (!nextEmail) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      setEmail(nextEmail);
      const response = await fetch(
        `/api/wallet/unlock?${new URLSearchParams({
          email: nextEmail,
          walletAddress: accountAddress,
        }).toString()}`,
        {
          cache: "no-store",
        },
      );
      const data = (await response.json()) as
        | WalletUnlockStatusResponse
        | { error?: string };

      if (!response.ok || !("configured" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.checkFailed,
        );
      }

      if (data.lockedUntil && new Date(data.lockedUntil).getTime() > Date.now()) {
        setError(copy.locked);
      }

      setMode(isResetRequested || !data.configured ? "setup" : "unlock");
      setPin("");
      setFirstPin("");
    } catch (error) {
      setMode("unlock");
      setError(error instanceof Error ? error.message : copy.checkFailed);
    }
  }, [
    accountAddress,
    copy.checkFailed,
    copy.locked,
    dictionary.member.errors.missingEmail,
    isResetRequested,
  ]);

  useEffect(() => {
    if (!isConnected) {
      setEmail(null);
      setMode("checking");
      setPin("");
      setFirstPin("");
      return;
    }

    void loadWalletUnlockStatus();
  }, [isConnected, loadWalletUnlockStatus]);

  const startPinReset = useCallback(async () => {
    setIsResetRequested(true);
    setPin("");
    setFirstPin("");
    setError(null);
    setMode("checking");

    if (wallet) {
      await disconnect(wallet);
    }

    setIsLoginDialogOpen(true);
  }, [disconnect, wallet]);

  const submitPin = useCallback(
    async (completePin: string) => {
      if (!accountAddress || !email || isSubmitting) {
        return;
      }

      if (mode === "setup") {
        setFirstPin(completePin);
        setPin("");
        setMode("confirm");
        return;
      }

      if (mode === "confirm" && firstPin !== completePin) {
        setError(copy.mismatch);
        setFirstPin("");
        setPin("");
        setMode("setup");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/wallet/unlock", {
          body: JSON.stringify(
            mode === "confirm"
              ? {
                  action: isResetRequested ? "reset" : "setup",
                  confirmPin: completePin,
                  email,
                  pin: firstPin,
                  walletAddress: accountAddress,
                }
              : {
                  action: "verify",
                  email,
                  pin: completePin,
                  walletAddress: accountAddress,
                },
          ),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as
          | WalletUnlockMutationResponse
          | { error?: string };

        if (!response.ok || !("ok" in data)) {
          throw new Error(
            "error" in data && data.error ? data.error : copy.submitFailed,
          );
        }

        setIsResetRequested(false);
        completeUnlock(email, accountAddress);
      } catch (error) {
        setPin("");
        setFirstPin("");
        setMode(mode === "confirm" ? "setup" : mode);
        setError(error instanceof Error ? error.message : copy.submitFailed);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      accountAddress,
      completeUnlock,
      copy.mismatch,
      copy.submitFailed,
      email,
      firstPin,
      isSubmitting,
      isResetRequested,
      mode,
    ],
  );

  function appendDigit(value: string) {
    if (!value || pin.length >= WALLET_UNLOCK_PIN_LENGTH || isSubmitting) {
      return;
    }

    const nextPin = `${pin}${value}`;
    setPin(nextPin);

    if (nextPin.length === WALLET_UNLOCK_PIN_LENGTH) {
      window.setTimeout(() => {
        void submitPin(nextPin);
      }, 80);
    }
  }

  function deleteDigit() {
    if (isSubmitting) {
      return;
    }

    setPin((current) => current.slice(0, -1));
  }

  return (
    <main className="min-h-dvh bg-[#f8f7f4] text-slate-950">
      <AutoConnect
        appMetadata={appMetadata}
        client={thirdwebClient}
        wallets={supportedWallets}
      />
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-white px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        <div className="flex h-12 items-center justify-between">
          <Link
            className="inline-flex size-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            href={returnTo || fallbackHref}
          >
            <ArrowLeft className="size-5" />
            <span className="sr-only">{copy.back}</span>
          </Link>
        </div>

        <section className="flex flex-1 flex-col justify-between gap-8 pb-4">
          <div className="pt-16 text-center sm:pt-20">
            <div className="mx-auto flex size-[104px] items-center justify-center rounded-[28px] bg-[#f7f3ec] text-[#bd9458] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {isSubmitting || mode === "checking" ? (
                <LoaderCircle className="size-10 animate-spin" />
              ) : (
                <LockKeyhole className="size-11" />
              )}
            </div>
            <h1 className="mt-9 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.35rem]">
              {title}
            </h1>
            <p className="mt-4 text-lg font-medium leading-7 text-slate-500">
              {isSubmitting ? copy.verifying : subtitle}
            </p>

            <div className="mt-10 flex items-center justify-center gap-5">
              {Array.from({ length: WALLET_UNLOCK_PIN_LENGTH }, (_, index) => (
                <span
                  className={cn(
                    "size-5 rounded-full bg-slate-200 transition",
                    index < pin.length && "bg-slate-950",
                  )}
                  key={index}
                />
              ))}
            </div>

            {error ? (
              <p className="mx-auto mt-6 max-w-sm rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700">
                {error}
              </p>
            ) : null}

            {isResetRequested && !error ? (
              <p className="mx-auto mt-6 max-w-sm rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-600">
                {copy.resetStarted}
              </p>
            ) : null}

            {!isConnected ? (
              <button
                className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                onClick={() => {
                  setIsLoginDialogOpen(true);
                }}
                type="button"
              >
                {copy.connect}
              </button>
            ) : null}

            {isConnected && mode === "unlock" ? (
              <button
                className="mt-5 text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-950 hover:underline"
                onClick={() => {
                  void startPinReset();
                }}
                type="button"
              >
                {copy.resetAction}
              </button>
            ) : null}
          </div>

          <div className="mx-auto grid w-full max-w-[340px] grid-cols-3 gap-5">
            {digits.map((digit, index) =>
              digit === "" ? (
                <div key={`blank-${index}`} />
              ) : (
                <button
                  className="flex aspect-square items-center justify-center rounded-full border border-slate-200 bg-white text-[2rem] font-semibold text-slate-950 shadow-[0_14px_32px_rgba(15,23,42,0.04)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!isConnected || mode === "checking" || isSubmitting}
                  key={digit}
                  onClick={() => {
                    if (digit === "delete") {
                      deleteDigit();
                      return;
                    }

                    appendDigit(digit);
                  }}
                  type="button"
                >
                  {digit === "delete" ? (
                    <>
                      <Delete className="size-8" />
                      <span className="sr-only">{copy.delete}</span>
                    </>
                  ) : (
                    digit
                  )}
                </button>
              ),
            )}
          </div>
        </section>
      </div>
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={dictionary.common.connectModalTitle}
      />
    </main>
  );
}
