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
  Sparkles,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { CopyTextButton } from "@/components/copy-text-button";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
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
import {
  BSC_EXPLORER,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import type { SyncMemberResponse } from "@/lib/member";
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
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
}) {
  const studioCopy = getLandingBrandingCopy(locale);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const accountLabel = accountAddress
    ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
    : null;
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const isDisconnected = status !== "connected" || !accountAddress;
  const [state, setState] = useState<StudioState>(emptyState);
  const [form, setForm] = useState<LandingBrandingRecord | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const referralsHref = buildPathWithReferral(`/${locale}/referrals`, referralCode);

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
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setState({
          ...emptyState,
          error: dictionary.member.errors.missingEmail,
          status: "error",
        });
        return;
      }

      const syncResponse = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const syncData = (await syncResponse.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!syncResponse.ok) {
        throw new Error(
          "error" in syncData && syncData.error
            ? syncData.error
            : studioCopy.messages.loadFailed,
        );
      }

      if ("validationError" in syncData && syncData.validationError) {
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

      if (!("member" in syncData) || !syncData.member) {
        throw new Error(studioCopy.messages.memberMissing);
      }

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
        `/api/members/landing-branding?email=${encodeURIComponent(email)}&lang=${locale}`,
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
    if (status !== "connected") {
      setIsLogoutDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState(emptyState);
      setForm(null);
      setNotice(null);
      return;
    }

    void syncAndLoadStudio();
  }, [accountAddress, chain.id, chain.name, locale, status]);

  function confirmLogout() {
    if (!wallet) {
      setIsLogoutDialogOpen(false);
      return;
    }

    setIsLogoutDialogOpen(false);
    disconnect(wallet);
  }

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

      <LogoutConfirmDialog
        cancelLabel={dictionary.common.logoutDialog.cancel}
        confirmLabel={dictionary.common.logoutDialog.confirm}
        description={dictionary.common.logoutDialog.description}
        onCancel={() => {
          setIsLogoutDialogOpen(false);
        }}
        onConfirm={confirmLogout}
        open={isLogoutDialogOpen}
        title={dictionary.common.logoutDialog.title}
      />
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={dictionary.common.connectModalTitle}
      />

      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={referralsHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="eyebrow">{studioCopy.page.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {studioCopy.page.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {studioCopy.page.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <LanguageSwitcher
              label={dictionary.common.languageLabel}
              locale={locale}
            />
            <StatusChip labels={dictionary.common.status} status={status} />
            {hasThirdwebClientId ? (
              status === "connected" ? (
                <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                  {accountAddress ? (
                    <a
                      className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:justify-start"
                      href={accountUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {accountLabel ?? accountAddress}
                      <ArrowUpRight className="size-4" />
                    </a>
                  ) : null}

                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={!wallet}
                    onClick={() => {
                      if (!wallet) {
                        return;
                      }

                      setIsLogoutDialogOpen(true);
                    }}
                    type="button"
                  >
                    {dictionary.common.disconnectWallet}
                  </button>
                </div>
              ) : (
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                  onClick={() => {
                    setIsLoginDialogOpen(true);
                  }}
                  type="button"
                >
                  {studioCopy.actions.connectWallet}
                </button>
              )
            ) : (
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {dictionary.common.clientIdRequired}
              </div>
            )}
          </div>
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard>{dictionary.env.description}</MessageCard>
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
        ) : state.status === "loading" && !form ? (
          <MessageCard>{studioCopy.messages.loading}</MessageCard>
        ) : state.member?.status !== "completed" ? (
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
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="glass-card rounded-[30px] p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="eyebrow">{studioCopy.page.eyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {studioCopy.page.title}
                  </h2>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Palette className="size-5" />
                </div>
              </div>

              {form && state.member ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow label={dictionary.walletPage.labels.memberAccount} value={state.member.email} />
                    <InfoRow
                      label={dictionary.walletPage.labels.referralCode}
                      value={state.member.referralCode ?? dictionary.common.notAvailable}
                    />
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
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

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
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
                      <div className="grid gap-3 sm:flex sm:flex-wrap">
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
                      <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-900/90 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                        <div
                          className="h-52 w-full bg-cover bg-center sm:h-64"
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

                  <div className="grid gap-3 sm:grid-cols-2">
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

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
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
                    <Link
                      className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                      href={referralsHref}
                    >
                      {studioCopy.actions.openReferrals}
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="glass-card rounded-[30px] p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="eyebrow">{studioCopy.fields.preview}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {studioCopy.fields.preview}
                  </h2>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
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

                  {state.referralLink ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {studioCopy.fields.referralLink}
                      </p>
                      <a
                        className="mt-3 block break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                        href={state.referralLink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {state.referralLink}
                      </a>
                      <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                        <CopyTextButton
                          className="w-full sm:w-auto"
                          copiedLabel={dictionary.common.copied}
                          copyLabel={dictionary.common.copyLink}
                          text={state.referralLink}
                        />
                        <a
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                          href={state.referralLink}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {studioCopy.actions.openPreview}
                          <ArrowUpRight className="size-4" />
                        </a>
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
      <span className="mt-1 block text-sm leading-6 text-slate-600">
        {hint}
      </span>
      <input
        className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-400"
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
      <span className="mt-1 block text-sm leading-6 text-slate-600">
        {hint}
      </span>
      <textarea
        className="mt-3 min-h-32 w-full resize-y rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-400"
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
        "rounded-[24px] border p-4 text-left transition",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onClick}
      type="button"
    >
      <div
        className="h-24 rounded-[18px]"
        style={{
          backgroundImage: `linear-gradient(135deg, ${preview.theme.previewFrom} 0%, ${preview.theme.previewTo} 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        {active ? <Check className="size-4" /> : null}
      </div>
    </button>
  );
}

function PreviewCard({ branding }: { branding: LandingPageBranding }) {
  return (
    <div
      className="overflow-hidden rounded-[30px] border border-white/10 p-5 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
      style={{
        backgroundImage: `linear-gradient(135deg, ${branding.theme.previewFrom} 0%, ${branding.theme.previewTo} 100%)`,
      }}
    >
      <div
        className="inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
        style={{
          backgroundColor: branding.theme.accentSoft,
          borderColor: branding.theme.glow,
          color: branding.theme.lightAccent,
        }}
      >
        {branding.badgeLabel}
      </div>
      <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/56">
        {branding.sharedByLabel}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {branding.brandName}
      </p>
      {branding.heroImageUrl ? (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
          <div
            className="h-44 w-full bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.28)), url(${branding.heroImageUrl})`,
            }}
          />
        </div>
      ) : null}
      <h3 className="mt-5 text-[1.9rem] font-semibold tracking-tight text-white">
        {branding.headline}
      </h3>
      <p className="mt-4 text-sm leading-7 text-white/76">
        {branding.description}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {branding.referralCode ? (
          <span
            className="inline-flex items-center rounded-full border px-3 py-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-white/76"
            style={{
              backgroundColor: branding.theme.codeSurface,
              borderColor: branding.theme.glow,
            }}
          >
            {branding.referralCodeLabel}: {branding.referralCode}
          </span>
        ) : null}
      </div>

      <div className="mt-8">
        <div
          className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.2)]"
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
        "rounded-[22px] border p-4 text-left transition",
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
          "mt-2 text-sm leading-6",
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-medium text-slate-900">
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
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
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

function StatusChip({
  labels,
  status,
}: {
  labels: Dictionary["common"]["status"];
  status: "connected" | "disconnected" | "connecting" | "unknown";
}) {
  const copy =
    status === "connected"
      ? labels.connected
      : status === "connecting"
        ? labels.connecting
        : status === "unknown"
          ? labels.unknown
          : labels.disconnected;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
        status === "connected" &&
          "border-emerald-200 bg-emerald-50 text-emerald-900",
        status === "connecting" &&
          "border-blue-200 bg-blue-50 text-blue-900",
        status === "unknown" &&
          "border-slate-200 bg-slate-50 text-slate-700",
        status === "disconnected" &&
          "border-slate-200 bg-white text-slate-700",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "connected" && "bg-emerald-500",
          status === "connecting" && "bg-blue-500",
          status === "unknown" && "bg-slate-400",
          status === "disconnected" && "bg-slate-400",
        )}
      />
      {copy}
    </div>
  );
}
