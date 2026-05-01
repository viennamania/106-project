"use client";

import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Palette,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { CopyTextButton } from "@/components/copy-text-button";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { useMemberSession } from "@/components/member-session-provider";
import { getLandingBrandingCopy } from "@/lib/landing-branding-copy";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  LANDING_BRANDING_LIMITS,
  landingBrandThemeKeys,
  toLandingPageBranding,
  type LandingBrandThemeKey,
  type LandingBrandingRecord,
  type LandingPageBranding,
} from "@/lib/landing-branding";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { getThirdwebUserEmail, useThirdwebConnectionState } from "@/lib/thirdweb-client";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { cn } from "@/lib/utils";

type BrandingStudioMember = {
  email: string;
  locale: string;
  referralCode: string | null;
  status: "completed" | "pending_payment";
};

type BrandingStudioResponse = {
  branding: LandingBrandingRecord;
  member: BrandingStudioMember;
  referralLink: string | null;
};

type BrandingStudioUploadResponse = {
  contentType: string;
  pathname: string;
  url: string;
};

type StudioState = {
  branding: LandingBrandingRecord | null;
  error: string | null;
  member: BrandingStudioMember | null;
  referralLink: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

type Notice = {
  text: string;
  tone: "error" | "success";
};

const emptyState: StudioState = {
  branding: null,
  error: null,
  member: null,
  referralLink: null,
  status: "idle",
};

export function BrandingStudioPage({
  dictionary,
  locale,
  referralCode = null,
  returnTo = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnTo?: string | null;
}) {
  const studioCopy = getLandingBrandingCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const memberSessionEmail =
    accountAddress &&
    memberSession.accountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSession.email
      : null;
  const {
    isDisconnected,
    isResolving: isConnectionResolving,
  } = useThirdwebConnectionState({
    accountAddress,
    status,
  });
  const [state, setState] = useState<StudioState>(emptyState);
  const [form, setForm] = useState<LandingBrandingRecord | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const referralsHref = buildPathWithReferral(`/${locale}/referrals`, referralCode);
  const backHref = returnTo ?? referralsHref;
  const referralSharePath = state.member?.referralCode
    ? buildPathWithReferral(`/${locale}/referral/bridge`, state.member.referralCode)
    : null;
  const referralShareUrl = referralSharePath
    ? typeof window === "undefined"
      ? referralSharePath
      : new URL(referralSharePath, window.location.origin).toString()
    : null;

  async function loadStudio() {
    if (!accountAddress) {
      return;
    }

    setNotice(null);
    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const email =
        memberSessionEmail ??
        (await getThirdwebUserEmail({ client: thirdwebClient }));

      if (!email) {
        setState({
          ...emptyState,
          error: dictionary.member.errors.missingEmail,
          status: "error",
        });
        return;
      }

      const syncData = await syncServerMemberRegistration({
        chainId: chain.id,
        chainName: chain.name ?? "BSC",
        email,
        locale,
        walletAddress: accountAddress,
      });

      if (!syncData.ok) {
        throw new Error(
          syncData.error || studioCopy.messages.loadFailed,
        );
      }

      if (syncData.validationError) {
        setState({
          ...emptyState,
          error: syncData.validationError,
          member: syncData.member
            ? {
                email: syncData.member.email,
                locale: syncData.member.locale,
                referralCode: syncData.member.referralCode,
                status: syncData.member.status,
              }
            : null,
          status: "error",
        });
        return;
      }

      if (!syncData.member) {
        throw new Error(studioCopy.messages.memberMissing);
      }

      updateMemberSession({
        email: syncData.member.email,
        member: syncData.member,
        walletAddress: accountAddress,
      });

      const syncedMember: BrandingStudioMember = {
        email: syncData.member.email,
        locale: syncData.member.locale,
        referralCode: syncData.member.referralCode,
        status: syncData.member.status,
      };

      if (syncData.member.status !== "completed") {
        setState({
          branding: null,
          error: null,
          member: syncedMember,
          referralLink: null,
          status: "ready",
        });
        setForm(null);
        return;
      }

      const response = await fetch(
        `/api/members/landing-branding?${new URLSearchParams({
          email: syncedMember.email,
          lang: locale,
          walletAddress: accountAddress,
        }).toString()}`,
      );
      const data = (await response.json()) as
        | BrandingStudioResponse
        | { error?: string };

      if (!response.ok || !("branding" in data) || !("member" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : studioCopy.messages.loadFailed,
        );
      }

      setState({
        branding: data.branding,
        error: null,
        member: data.member,
        referralLink: data.referralLink,
        status: "ready",
      });
      setForm(data.branding);
    } catch (error) {
      setState({
        ...emptyState,
        error:
          error instanceof Error ? error.message : studioCopy.messages.loadFailed,
        status: "error",
      });
      setForm(null);
    }
  }

  const syncAndLoadStudio = useEffectEvent(async () => {
    await loadStudio();
  });

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (isConnectionResolving) {
      return;
    }

    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState(emptyState);
      setForm(null);
      setNotice(null);
      return;
    }

    void syncAndLoadStudio();
  }, [
    accountAddress,
    chain.id,
    chain.name,
    isConnectionResolving,
    locale,
    status,
  ]);

  async function saveStudio() {
    if (!form || !state.member?.email) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch("/api/members/landing-branding", {
        body: JSON.stringify({
          branding: form,
          email: state.member.email,
          locale,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      });
      const data = (await response.json()) as
        | BrandingStudioResponse
        | { error?: string };

      if (!response.ok || !("branding" in data) || !("member" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : studioCopy.messages.saveFailed,
        );
      }

      setState({
        branding: data.branding,
        error: null,
        member: data.member,
        referralLink: data.referralLink,
        status: "ready",
      });
      setForm(data.branding);
      setNotice({
        text: studioCopy.messages.saveSuccess,
        tone: "success",
      });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error ? error.message : studioCopy.messages.saveFailed,
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadHeroImage(file: File) {
    if (!state.member?.email) {
      return;
    }

    setIsUploading(true);
    setNotice(null);

    try {
      const body = new FormData();
      body.set("email", state.member.email);
      body.set("file", file);
      body.set("walletAddress", accountAddress ?? "");

      const response = await fetch("/api/members/landing-branding/upload", {
        body,
        method: "POST",
      });
      const data = (await response.json()) as
        | BrandingStudioUploadResponse
        | { error?: string };

      if (!response.ok || !("url" in data) || !("pathname" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : studioCopy.messages.uploadFailed,
        );
      }

      setForm((current) =>
        current
          ? {
              ...current,
              heroImagePathname: data.pathname,
              heroImageUrl: data.url,
            }
          : current,
      );
      setNotice({
        text: studioCopy.messages.uploadSuccess,
        tone: "success",
      });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : studioCopy.messages.uploadFailed,
        tone: "error",
      });
    } finally {
      setIsUploading(false);
    }
  }

  const previewBranding =
    form && state.member?.referralCode
      ? toLandingPageBranding({
          branding: form,
          locale,
          referralCode: state.member.referralCode,
        })
      : null;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.16),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.14),transparent_26%)]" />

      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={dictionary.common.connectModalTitle}
      />

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[18px] border border-white/80 bg-white/95 px-3 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:rounded-[22px] sm:px-5 sm:py-3">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.6),transparent)]" />
          <div className="relative flex min-h-10 items-center justify-between gap-2 sm:min-h-11 sm:gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 sm:size-10"
                href={backHref}
              >
                <ArrowLeft className="size-4" />
              </Link>

              <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-slate-950 sm:text-[1.2rem]">
                {studioCopy.page.title}
              </h1>
            </div>

            {hasThirdwebClientId && status === "connected" ? (
              <button
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 sm:size-10"
                onClick={() => {
                  void loadStudio();
                }}
                type="button"
              >
                <RefreshCcw className="size-4" />
                <span className="sr-only">{studioCopy.actions.refresh}</span>
              </button>
            ) : null}
          </div>
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard>{dictionary.env.description}</MessageCard>
        ) : isConnectionResolving ? (
          <MessageCard>{studioCopy.messages.loading}</MessageCard>
        ) : isDisconnected ? (
          <MessageCard>
            <div className="space-y-3">
              <p>{studioCopy.messages.disconnected}</p>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                onClick={() => {
                  setIsLoginDialogOpen(true);
                }}
                type="button"
              >
                {studioCopy.actions.connectWallet}
              </button>
            </div>
          </MessageCard>
        ) : (state.status === "idle" || state.status === "loading") && !form ? (
          <MessageCard>{studioCopy.messages.loading}</MessageCard>
        ) : state.status === "error" && !form ? (
          <MessageCard tone="error">
            <div className="space-y-4">
              <p>{state.error ?? studioCopy.messages.loadFailed}</p>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
                onClick={() => {
                  void loadStudio();
                }}
                type="button"
              >
                {studioCopy.actions.refresh}
              </button>
            </div>
          </MessageCard>
        ) : state.status === "ready" &&
          state.member &&
          state.member.status !== "completed" ? (
          <MessageCard tone="error">
            <div className="space-y-4">
              <p>{studioCopy.messages.paymentRequired}</p>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium !text-white transition hover:bg-slate-800 sm:w-auto"
                  href={activateHref}
                >
                  {studioCopy.actions.completeSignup}
                </Link>
                <Link
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                  href={homeHref}
                >
                  {studioCopy.actions.backHome}
                </Link>
              </div>
            </div>
          </MessageCard>
        ) : state.status === "ready" && !state.member ? (
          <MessageCard tone="error">
            <div className="space-y-4">
              <p>{studioCopy.messages.memberMissing}</p>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
                onClick={() => {
                  void loadStudio();
                }}
                type="button"
              >
                {studioCopy.actions.refresh}
              </button>
            </div>
          </MessageCard>
        ) : (
          <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="glass-card rounded-[22px] p-4 sm:rounded-[30px] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
                <div className="space-y-1">
                  <p className="eyebrow">{studioCopy.page.eyebrow}</p>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                    {studioCopy.page.title}
                  </h2>
                </div>
                <div className="hidden size-12 items-center justify-center rounded-2xl bg-slate-950 text-white sm:flex">
                  <Palette className="size-5" />
                </div>
              </div>

              {form && state.member ? (
                <div className="space-y-4 sm:space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow label={dictionary.walletPage.labels.memberAccount} value={state.member.email} />
                    <InfoRow
                      label={dictionary.walletPage.labels.referralCode}
                      value={state.member.referralCode ?? dictionary.common.notAvailable}
                    />
                  </div>

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {studioCopy.fields.mode}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <ModeButton
                        active={form.mode === "default"}
                        description={studioCopy.modeOptions.defaultDescription}
                        label={studioCopy.modeOptions.default}
                        onClick={() => {
                          setForm((current) =>
                            current ? { ...current, mode: "default" } : current,
                          );
                          setNotice(null);
                        }}
                      />
                      <ModeButton
                        active={form.mode === "custom"}
                        description={studioCopy.modeOptions.customDescription}
                        label={studioCopy.modeOptions.custom}
                        onClick={() => {
                          setForm((current) =>
                            current ? { ...current, mode: "custom" } : current,
                          );
                          setNotice(null);
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      hint={studioCopy.hints.brandName}
                      label={studioCopy.fields.brandName}
                      maxLength={LANDING_BRANDING_LIMITS.brandName}
                      onChange={(value) => {
                        setForm((current) =>
                          current ? { ...current, brandName: value } : current,
                        );
                        setNotice(null);
                      }}
                      value={form.brandName}
                    />
                    <Field
                      hint={studioCopy.hints.badgeLabel}
                      label={studioCopy.fields.badgeLabel}
                      maxLength={LANDING_BRANDING_LIMITS.badgeLabel}
                      onChange={(value) => {
                        setForm((current) =>
                          current ? { ...current, badgeLabel: value } : current,
                        );
                        setNotice(null);
                      }}
                      value={form.badgeLabel}
                    />
                  </div>

                  <Field
                    hint={studioCopy.hints.headline}
                    label={studioCopy.fields.headline}
                    maxLength={LANDING_BRANDING_LIMITS.headline}
                    onChange={(value) => {
                      setForm((current) =>
                        current ? { ...current, headline: value } : current,
                      );
                      setNotice(null);
                    }}
                    value={form.headline}
                  />

                  <TextAreaField
                    hint={studioCopy.hints.description}
                    label={studioCopy.fields.description}
                    maxLength={LANDING_BRANDING_LIMITS.description}
                    onChange={(value) => {
                      setForm((current) =>
                        current ? { ...current, description: value } : current,
                      );
                      setNotice(null);
                    }}
                    value={form.description}
                  />

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 sm:rounded-[24px] sm:p-4">
                    <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {studioCopy.fields.heroImage}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {studioCopy.hints.heroImage}
                        </p>
                      </div>
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            void uploadHeroImage(file);
                          }

                          event.target.value = "";
                        }}
                        ref={fileInputRef}
                        type="file"
                      />
                      <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                        <button
                          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          disabled={isUploading}
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                          type="button"
                        >
                          {isUploading
                            ? studioCopy.actions.uploadingImage
                            : studioCopy.actions.uploadImage}
                        </button>
                        {form.heroImageUrl ? (
                          <button
                            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                            onClick={() => {
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      heroImagePathname: null,
                                      heroImageUrl: null,
                                    }
                                  : current,
                              );
                              setNotice(null);
                            }}
                            type="button"
                          >
                            {studioCopy.actions.removeImage}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {form.heroImageUrl ? (
                      <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-900/90 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:rounded-[26px]">
                        <div
                          className="h-40 w-full bg-cover bg-center sm:h-64"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${form.heroImageUrl})`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <Field
                      hint={studioCopy.hints.ctaLabel}
                      label={studioCopy.fields.ctaLabel}
                      maxLength={LANDING_BRANDING_LIMITS.ctaLabel}
                      onChange={(value) => {
                        setForm((current) =>
                          current ? { ...current, ctaLabel: value } : current,
                        );
                        setNotice(null);
                      }}
                      value={form.ctaLabel}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {studioCopy.fields.theme}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {studioCopy.modeOptions.customDescription}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {landingBrandThemeKeys.map((themeKey) => (
                      <ThemeOption
                        active={form.themeKey === themeKey}
                        key={themeKey}
                        label={studioCopy.themeLabels[themeKey]}
                        onClick={() => {
                          setForm((current) =>
                            current
                              ? { ...current, themeKey: themeKey as LandingBrandThemeKey }
                              : current,
                          );
                          setNotice(null);
                        }}
                        themeKey={themeKey}
                      />
                    ))}
                  </div>

                  {notice ? (
                    <MessageCard tone={notice.tone}>{notice.text}</MessageCard>
                  ) : null}

                  {state.error ? (
                    <MessageCard tone="error">{state.error}</MessageCard>
                  ) : null}

                  <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    <button
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      disabled={isSaving || isUploading}
                      onClick={() => {
                        void saveStudio();
                      }}
                      type="button"
                    >
                      {isSaving
                        ? studioCopy.actions.saving
                        : studioCopy.actions.save}
                    </button>
                    <button
                      className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                      onClick={() => {
                        void loadStudio();
                      }}
                      type="button"
                    >
                      {studioCopy.actions.refresh}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="glass-card rounded-[22px] p-4 sm:rounded-[30px] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
                <div className="space-y-1">
                  <p className="eyebrow">{studioCopy.fields.preview}</p>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                    {studioCopy.fields.preview}
                  </h2>
                </div>
                <div className="hidden size-12 items-center justify-center rounded-2xl bg-slate-950 text-white sm:flex">
                  <Sparkles className="size-5" />
                </div>
              </div>

              {previewBranding ? (
                <div className="space-y-4">
                  <MessageCard>
                    {form?.mode === "custom"
                      ? studioCopy.messages.customModeNotice
                      : studioCopy.messages.defaultModeNotice}
                  </MessageCard>

                  <PreviewCard branding={previewBranding} />

                  {referralShareUrl || state.referralLink ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {studioCopy.fields.shareLink}
                      </p>
                      <p className="mt-3 break-all text-sm font-medium text-slate-900">
                        {referralShareUrl}
                      </p>
                      <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                        {referralShareUrl ? (
                          <CopyTextButton
                            className="w-full sm:w-auto"
                            copiedLabel={dictionary.common.copied}
                            copyLabel={dictionary.common.copyLink}
                            text={referralShareUrl}
                          />
                        ) : null}
                        {state.referralLink ? (
                          <a
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                            href={state.referralLink}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {studioCopy.actions.openPreview}
                            <ArrowUpRight className="size-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <MessageCard>{studioCopy.messages.loading}</MessageCard>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  hint,
  label,
  maxLength,
  onChange,
  value,
}: {
  hint: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="mt-1 block text-[0.8rem] leading-5 text-slate-600 sm:text-sm sm:leading-6">
        {hint}
      </span>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 sm:mt-3 sm:h-12 sm:rounded-2xl sm:px-4"
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        type="text"
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  hint,
  label,
  maxLength,
  onChange,
  value,
}: {
  hint: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="mt-1 block text-[0.8rem] leading-5 text-slate-600 sm:text-sm sm:leading-6">
        {hint}
      </span>
      <textarea
        className="mt-2 min-h-28 w-full resize-y rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-400 sm:mt-3 sm:min-h-32 sm:rounded-[24px] sm:px-4"
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        value={value}
      />
    </label>
  );
}

function ThemeOption({
  active,
  label,
  onClick,
  themeKey,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  themeKey: LandingBrandThemeKey;
}) {
  const preview = toLandingPageBranding({
    branding: {
      badgeLabel: "Preview",
      brandName: label,
      ctaLabel: "CTA",
      description: label,
      headline: label,
      heroImagePathname: null,
      heroImageUrl: null,
      mode: "custom",
      themeKey,
      updatedAt: null,
    },
    locale: "en",
    referralCode: null,
  });

  return (
    <button
      className={cn(
        "rounded-[18px] border p-3 text-left transition sm:rounded-[24px] sm:p-4",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onClick}
      type="button"
    >
      <div
        className="h-16 rounded-[14px] sm:h-24 sm:rounded-[18px]"
        style={{
          backgroundImage: `linear-gradient(135deg, ${preview.theme.previewFrom} 0%, ${preview.theme.previewTo} 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      />
      <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3 sm:gap-3">
        <span className="min-w-0 truncate text-xs font-semibold sm:text-sm">{label}</span>
        {active ? <Check className="size-4" /> : null}
      </div>
    </button>
  );
}

function PreviewCard({ branding }: { branding: LandingPageBranding }) {
  return (
    <div
      className="overflow-hidden rounded-[22px] border border-white/10 p-4 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:rounded-[30px] sm:p-5 sm:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
      style={{
        backgroundImage: `linear-gradient(135deg, ${branding.theme.previewFrom} 0%, ${branding.theme.previewTo} 100%)`,
      }}
    >
      <div
        className="inline-flex max-w-full items-center truncate rounded-full border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] sm:text-[0.68rem] sm:tracking-[0.18em]"
        style={{
          backgroundColor: branding.theme.accentSoft,
          borderColor: branding.theme.glow,
          color: branding.theme.lightAccent,
        }}
      >
        {branding.badgeLabel}
      </div>
      <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/56 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.22em]">
        {branding.sharedByLabel}
      </p>
      <p className="mt-2 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {branding.brandName}
      </p>
      {branding.heroImageUrl ? (
        <div className="mt-4 overflow-hidden rounded-[18px] border border-white/10 bg-black/20 sm:mt-5 sm:rounded-[24px]">
          <div
            className="h-36 w-full bg-cover bg-center sm:h-44"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.28)), url(${branding.heroImageUrl})`,
            }}
          />
        </div>
      ) : null}
      <h3 className="mt-4 break-words text-[1.45rem] font-semibold leading-tight tracking-tight text-white sm:mt-5 sm:text-[1.9rem]">
        {branding.headline}
      </h3>
      <p className="mt-3 text-sm leading-6 text-white/76 sm:mt-4 sm:leading-7">
        {branding.description}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
        {branding.referralCode ? (
          <span
            className="inline-flex max-w-full items-center break-all rounded-full border px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/76 sm:text-[0.7rem] sm:tracking-[0.18em]"
            style={{
              backgroundColor: branding.theme.codeSurface,
              borderColor: branding.theme.glow,
            }}
          >
            {branding.referralCodeLabel}: {branding.referralCode}
          </span>
        ) : null}
      </div>

      <div className="mt-6 sm:mt-8">
        <div
          className="inline-flex max-w-full items-center justify-center rounded-full px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.2)] sm:px-5"
          style={{
            backgroundImage: `linear-gradient(135deg, ${branding.theme.buttonFrom} 0%, ${branding.theme.buttonMid} 52%, ${branding.theme.buttonTo} 100%)`,
            boxShadow: `0 20px 50px ${branding.theme.glow}`,
          }}
        >
          {branding.ctaLabel}
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-[18px] border p-3 text-left transition sm:rounded-[22px] sm:p-4",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onClick}
      type="button"
    >
      <p className="text-sm font-semibold">{label}</p>
      <p
        className={cn(
          "mt-2 text-[0.8rem] leading-5 sm:text-sm sm:leading-6",
          active ? "text-white/72" : "text-slate-600",
        )}
      >
        {description}
      </p>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 sm:rounded-2xl sm:px-4">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-2 break-all text-[0.8rem] font-medium text-slate-900 sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border px-3 py-3 text-sm leading-6 break-words sm:rounded-[22px] sm:px-4 sm:py-4",
        tone === "error" &&
          "border-rose-200 bg-rose-50 text-rose-950",
        tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-950",
        tone === "neutral" &&
          "border-slate-200 bg-white/90 text-slate-600",
      )}
    >
      {children}
    </div>
  );
}
