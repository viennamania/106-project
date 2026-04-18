"use client";

import { ArrowLeft, Mail, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useSetActiveWallet,
  useSetActiveWalletConnectionStatus,
} from "thirdweb/react";
import { preAuthenticate } from "thirdweb/wallets/in-app";

import { type Dictionary } from "@/lib/i18n";
import { emailWallet, smartWalletChain, thirdwebClient } from "@/lib/thirdweb";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginStep = "code" | "email";

export function EmailLoginDialog({
  dictionary,
  onClose,
  open,
  title,
}: {
  dictionary: Dictionary;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const setActiveWallet = useSetActiveWallet();
  const setConnectionStatus = useSetActiveWalletConnectionStatus();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending">("idle");
  const [step, setStep] = useState<LoginStep>("email");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying">(
    "idle",
  );

  const isBusy = sendStatus === "sending" || verifyStatus === "verifying";

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        resetState();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [isBusy, onClose, open]);

  function resetState() {
    setCode("");
    setEmail("");
    setError(null);
    setSendStatus("idle");
    setStep("email");
    setVerifyStatus("idle");
  }

  function handleClose() {
    if (isBusy) {
      return;
    }

    resetState();
    onClose();
  }

  function normalizeEmailValue(value: string) {
    return value.trim().toLowerCase();
  }

  function formatTemplate(template: string, replacements: Record<string, string>) {
    return Object.entries(replacements).reduce((message, [key, value]) => {
      return message.replaceAll(`{${key}}`, value);
    }, template);
  }

  async function sendCode() {
    const normalizedEmail = normalizeEmailValue(email);

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(dictionary.common.loginDialog.invalidEmail);
      return;
    }

    setError(null);
    setSendStatus("sending");

    try {
      await preAuthenticate({
        client: thirdwebClient,
        email: normalizedEmail,
        strategy: "email",
      });
      setEmail(normalizedEmail);
      setStep("code");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : dictionary.member.errors.missingEmail,
      );
    } finally {
      setSendStatus("idle");
    }
  }

  async function verifyCode() {
    if (code.length !== 6) {
      setError(dictionary.common.loginDialog.invalidCode);
      return;
    }

    setError(null);
    setVerifyStatus("verifying");
    setConnectionStatus("connecting");

    try {
      await emailWallet.connect({
        chain: smartWalletChain,
        client: thirdwebClient,
        email,
        strategy: "email",
        verificationCode: code,
      });
      await setActiveWallet(emailWallet);
      resetState();
      onClose();
    } catch (authError) {
      setConnectionStatus("disconnected");
      setError(
        authError instanceof Error
          ? authError.message
          : dictionary.member.errors.syncFailed,
      );
    } finally {
      setVerifyStatus("idle");
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="email-login-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/48 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-6 sm:items-center sm:px-6 sm:py-10"
      role="dialog"
    >
      <button
        aria-label={dictionary.common.loginDialog.close}
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
        type="button"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,#ffffff,#f5f9ff)] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-6">
        <button
          aria-label={dictionary.common.loginDialog.close}
          className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          disabled={isBusy}
          onClick={handleClose}
          type="button"
        >
          <X className="size-5" />
        </button>

        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
          Pocket Smart Wallet
        </p>
        <h2
          className="mt-3 max-w-[17rem] text-2xl font-semibold tracking-tight text-slate-950 sm:max-w-none"
          id="email-login-dialog-title"
        >
          {title}
        </h2>

        <div className="mt-4 rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,#fff9ec,#fff4d8)] px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold tracking-tight text-slate-950">
            {dictionary.common.loginDialog.signupGuideTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {dictionary.common.loginDialog.signupGuideDescription}
          </p>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              {step === "email" ? (
                <Mail className="size-5" />
              ) : (
                <ShieldCheck className="size-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-950">
                {step === "email"
                  ? dictionary.common.loginDialog.emailPlaceholder
                  : dictionary.common.loginDialog.codePlaceholder}
              </p>
              <p className="text-sm leading-6 text-slate-600">
                {step === "email"
                  ? dictionary.common.loginDialog.emailDescription
                  : formatTemplate(
                      dictionary.common.loginDialog.codeDescription,
                      { email },
                    )}
              </p>
            </div>
          </div>

          {step === "email" ? (
            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="sr-only">
                  {dictionary.common.loginDialog.emailPlaceholder}
                </span>
                <input
                  autoCapitalize="none"
                  autoComplete="email"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                  disabled={isBusy}
                  inputMode="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) {
                      setError(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendCode();
                    }
                  }}
                  placeholder={dictionary.common.loginDialog.emailPlaceholder}
                  type="email"
                  value={email}
                />
              </label>
              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => {
                  void sendCode();
                }}
                type="button"
              >
                {sendStatus === "sending"
                  ? dictionary.common.loginDialog.sendingCode
                  : dictionary.common.loginDialog.sendCode}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="sr-only">
                  {dictionary.common.loginDialog.codePlaceholder}
                </span>
                <input
                  autoComplete="one-time-code"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-lg font-semibold tracking-[0.28em] text-slate-950 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                  disabled={isBusy}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    if (error) {
                      setError(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void verifyCode();
                    }
                  }}
                  placeholder={dictionary.common.loginDialog.codePlaceholder}
                  type="text"
                  value={code}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => {
                    setCode("");
                    setError(null);
                    setStep("email");
                  }}
                  type="button"
                >
                  <ArrowLeft className="mr-2 size-4" />
                  {dictionary.common.loginDialog.changeEmail}
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => {
                    void sendCode();
                  }}
                  type="button"
                >
                  {sendStatus === "sending"
                    ? dictionary.common.loginDialog.sendingCode
                    : dictionary.common.loginDialog.resendCode}
                </button>
              </div>
              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
                onClick={() => {
                  void verifyCode();
                }}
                type="button"
              >
                {verifyStatus === "verifying"
                  ? dictionary.common.loginDialog.verifying
                  : dictionary.common.loginDialog.verifyCode}
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
