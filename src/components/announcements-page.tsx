"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  Megaphone,
  Smartphone,
  RefreshCcw,
  Send,
  Users,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LandingReveal } from "@/components/landing/landing-reveal";
import type {
  MemberAnnouncementRecipientFilter,
  MemberAnnouncementRecipientScope,
  MemberAnnouncementRecord,
  MemberAnnouncementsResponse,
  MemberAnnouncementRecipientSummary,
} from "@/lib/announcements";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
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
import { cn } from "@/lib/utils";

type MemberSyncState = {
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  status: "idle" | "syncing" | "ready" | "error";
};

type AnnouncementsState = {
  error: string | null;
  history: MemberAnnouncementRecord[];
  recipients: MemberAnnouncementRecipientSummary | null;
  status: "idle" | "loading" | "ready" | "error";
};

const recipientFilterOrder: MemberAnnouncementRecipientFilter[] = [
  "all",
  "completed",
  "push_ready",
];

const recipientScopeOrder: MemberAnnouncementRecipientScope[] = [
  "level_1",
  "downline",
];

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
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-slate-200 bg-white/90 text-slate-600",
      )}
    >
      {children}
    </div>
  );
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
      <span>{label}</span>
      <span className="text-slate-950">{value}</span>
    </div>
  );
}

export function AnnouncementsPage({
  dictionary,
  locale,
  returnToHref,
}: {
  dictionary: Dictionary;
  locale: Locale;
  returnToHref: string;
}) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const copy = dictionary.announcementsPage;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const [memberSync, setMemberSync] = useState<MemberSyncState>({
    email: null,
    error: null,
    member: null,
    status: "idle",
  });
  const [announcementsState, setAnnouncementsState] = useState<AnnouncementsState>({
    error: null,
    history: [],
    recipients: null,
    status: "idle",
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [selectedRecipientScope, setSelectedRecipientScope] =
    useState<MemberAnnouncementRecipientScope>("level_1");
  const [selectedRecipientFilter, setSelectedRecipientFilter] =
    useState<MemberAnnouncementRecipientFilter>("all");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const isCompletedMember = memberSync.member?.status === "completed";
  const accountLabel = accountAddress
    ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
    : null;

  const loadAnnouncements = useCallback(
    async (
      memberEmail: string,
      recipientScope: MemberAnnouncementRecipientScope,
      recipientFilter: MemberAnnouncementRecipientFilter,
    ) => {
      if (!memberEmail || !accountAddress) {
        return;
      }

      setAnnouncementsState((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));

      try {
        const searchParams = new URLSearchParams({
          email: memberEmail,
          recipientFilter,
          recipientScope,
          walletAddress: accountAddress,
        });
        const response = await fetch(`/api/announcements?${searchParams.toString()}`);
        const data = (await response.json()) as
          | MemberAnnouncementsResponse
          | { error?: string };

        if (
          !response.ok ||
          !("history" in data) ||
          !("recipients" in data)
        ) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : copy.errors.loadFailed,
          );
        }

        setAnnouncementsState({
          error: null,
          history: data.history,
          recipients: data.recipients,
          status: "ready",
        });
      } catch (error) {
        setAnnouncementsState({
          error:
            error instanceof Error ? error.message : copy.errors.loadFailed,
          history: [],
          recipients: null,
          status: "error",
        });
      }
    },
    [accountAddress, copy.errors.loadFailed],
  );

  const runMemberSync = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setMemberSync((current) => ({
      ...current,
      error: null,
      status: "syncing",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setMemberSync({
          email: null,
          error: copy.errors.missingEmail,
          member: null,
          status: "error",
        });
        return;
      }

      const response = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!response.ok || !("member" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errors.loadFailed,
        );
      }

      setMemberSync({
        email,
        error: null,
        member: data.member,
        status: "ready",
      });
    } catch (error) {
      setMemberSync({
        email: null,
        error: error instanceof Error ? error.message : copy.errors.loadFailed,
        member: null,
        status: "error",
      });
    }
  }, [accountAddress, chain.id, chain.name, copy.errors.loadFailed, copy.errors.missingEmail, locale]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setMemberSync({
      email: null,
      error: null,
      member: null,
      status: "idle",
    });
    setAnnouncementsState({
      error: null,
      history: [],
      recipients: null,
      status: "idle",
    });
  }, [status]);

  useEffect(() => {
    if (
      status !== "connected" ||
      !accountAddress ||
      !hasThirdwebClientId
    ) {
      return;
    }

    void runMemberSync();
  }, [accountAddress, runMemberSync, status]);

  useEffect(() => {
    if (!isCompletedMember || !memberSync.member?.email) {
      return;
    }

    void loadAnnouncements(
      memberSync.member.email,
      selectedRecipientScope,
      selectedRecipientFilter,
    );
  }, [
    isCompletedMember,
    loadAnnouncements,
    memberSync.member?.email,
    selectedRecipientScope,
    selectedRecipientFilter,
  ]);

  async function handleSendAnnouncement() {
    if (!memberSync.member?.email || !accountAddress || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitNotice(null);

    try {
      const response = await fetch("/api/announcements", {
        body: JSON.stringify({
          body,
          email: memberSync.member.email,
          href,
          recipientFilter: selectedRecipientFilter,
          recipientScope: selectedRecipientScope,
          title,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | MemberAnnouncementsResponse
        | { error?: string };

      if (
        !response.ok ||
        !("history" in data) ||
        !("recipients" in data)
      ) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errors.sendFailed,
        );
      }

      setAnnouncementsState({
        error: null,
        history: data.history,
        recipients: data.recipients,
        status: "ready",
      });
      setSubmitNotice(copy.notices.sent);
      setTitle("");
      setBody("");
      setHref("");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : copy.errors.sendFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,161,58,0.16),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.12),transparent_24%),linear-gradient(180deg,#f6efe3_0%,#fbf7ef_38%,#f7f1e8_100%)]" />

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
              className="inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={returnToHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="eyebrow">{copy.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {copy.title}
                </h1>
                <p className="text-sm text-slate-600">{copy.description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <LanguageSwitcher
              label={dictionary.common.languageLabel}
              locale={locale}
            />
            {accountLabel ? (
              <a
                className="inline-flex h-10 items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50"
                href={accountUrl}
                rel="noreferrer"
                target="_blank"
              >
                {accountLabel}
                <ArrowUpRight className="size-4" />
              </a>
            ) : null}
            {status === "connected" ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                onClick={() => {
                  void runMemberSync();
                }}
                type="button"
              >
                <RefreshCcw className="mr-2 size-4" />
                {copy.actions.refresh}
              </button>
            ) : (
              <button
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                onClick={() => {
                  setIsLoginDialogOpen(true);
                }}
                type="button"
              >
                {dictionary.common.connectWallet}
              </button>
            )}
          </div>
        </header>

        {status !== "connected" ? (
          <MessageCard>{copy.disconnected}</MessageCard>
        ) : memberSync.status === "syncing" ? (
          <MessageCard>{copy.loading}</MessageCard>
        ) : memberSync.error ? (
          <MessageCard tone="error">{memberSync.error}</MessageCard>
        ) : !isCompletedMember ? (
          <MessageCard>{copy.paymentRequired}</MessageCard>
        ) : (
          <>
            <LandingReveal delay={40} variant="soft">
              <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="glass-card rounded-[28px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="eyebrow">{copy.labels.deliveryTarget}</p>
                      <h2 className="text-base font-semibold text-slate-950">
                        {copy.recipientSummaryTitle}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.recipientSummaryDescription}
                      </p>
                    </div>
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#1e293b)] text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                      <Users className="size-5" />
                    </div>
                  </div>

                  {announcementsState.error ? (
                    <div className="mt-4">
                      <MessageCard tone="error">{announcementsState.error}</MessageCard>
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="sm:col-span-2 xl:col-span-4">
                      <p className="mb-2 text-sm font-semibold text-slate-950">
                        {copy.labels.recipientScope}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recipientScopeOrder.map((recipientScope) => {
                          const isActive =
                            selectedRecipientScope === recipientScope;

                          return (
                            <button
                              className={cn(
                                "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                                isActive
                                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                              )}
                              key={recipientScope}
                              onClick={() => {
                                setSelectedRecipientScope(recipientScope);
                                setSubmitError(null);
                                setSubmitNotice(null);
                              }}
                              type="button"
                            >
                              {copy.scopes[recipientScope]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="sm:col-span-2 xl:col-span-4">
                      <p className="mb-2 text-sm font-semibold text-slate-950">
                        {copy.labels.recipientFilter}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recipientFilterOrder.map((recipientFilter) => {
                          const isActive =
                            selectedRecipientFilter === recipientFilter;

                          return (
                            <button
                              className={cn(
                                "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                                isActive
                                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                              )}
                              key={recipientFilter}
                              onClick={() => {
                                setSelectedRecipientFilter(recipientFilter);
                                setSubmitError(null);
                                setSubmitNotice(null);
                              }}
                              type="button"
                            >
                              {copy.filters[recipientFilter]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <StatusChip
                      label={copy.labels.totalRecipients}
                      value={new Intl.NumberFormat(locale).format(
                        announcementsState.recipients?.totalCount ?? 0,
                      )}
                    />
                    <StatusChip
                      label={copy.labels.completedRecipients}
                      value={new Intl.NumberFormat(locale).format(
                        announcementsState.recipients?.completedCount ?? 0,
                      )}
                    />
                    <StatusChip
                      label={copy.labels.pendingRecipients}
                      value={new Intl.NumberFormat(locale).format(
                        announcementsState.recipients?.pendingCount ?? 0,
                      )}
                    />
                    <StatusChip
                      label={copy.labels.pushRecipients}
                      value={new Intl.NumberFormat(locale).format(
                        announcementsState.recipients?.pushSubscribedCount ?? 0,
                      )}
                    />
                  </div>

                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {copy.labels.recipientPreview}
                    </p>
                    {announcementsState.recipients?.preview.length ? (
                      <div className="flex flex-wrap gap-2">
                        {announcementsState.recipients.preview.map((recipient) => (
                          <div
                            className={cn(
                              "flex w-full flex-col gap-2 rounded-[24px] border px-4 py-3 text-sm sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:px-3 sm:py-1.5",
                              recipient.status === "completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                : "border-amber-200 bg-amber-50 text-amber-950",
                            )}
                            key={`${recipient.email}:${recipient.status}`}
                          >
                            <span className="min-w-0 font-medium break-all sm:break-normal">
                              {recipient.email}
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-white/75 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-700">
                                {recipient.status === "completed"
                                  ? copy.labels.completedRecipients
                                  : copy.labels.pendingRecipients}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em]",
                                  recipient.pushSubscribed
                                    ? "bg-slate-950 text-white"
                                    : "bg-white/70 text-slate-500",
                                )}
                              >
                                <Smartphone className="size-3" />
                                {recipient.pushSubscribed
                                  ? copy.labels.pushReady
                                  : copy.labels.pushUnavailable}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <MessageCard>{copy.emptyRecipients}</MessageCard>
                    )}
                  </div>
                </div>

                <div className="glass-card rounded-[28px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="eyebrow">{copy.labels.latestMessages}</p>
                      <h2 className="text-base font-semibold text-slate-950">
                        {copy.actions.send}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600">
                        {copy.help.hrefOptional}
                      </p>
                    </div>
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#1e293b)] text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                      <Megaphone className="size-5" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-950">
                        {copy.labels.title}
                      </span>
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        maxLength={80}
                        onChange={(event) => {
                          setTitle(event.target.value);
                        }}
                        placeholder={copy.placeholders.title}
                        value={title}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-950">
                        {copy.labels.body}
                      </span>
                      <textarea
                        className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        maxLength={500}
                        onChange={(event) => {
                          setBody(event.target.value);
                        }}
                        placeholder={copy.placeholders.body}
                        value={body}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-slate-950">
                        {copy.labels.sendLink}
                      </span>
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        onChange={(event) => {
                          setHref(event.target.value);
                        }}
                        placeholder={copy.placeholders.href}
                        value={href}
                      />
                    </label>
                  </div>

                  <div className="mt-4 space-y-3">
                    {submitError ? (
                      <MessageCard tone="error">{submitError}</MessageCard>
                    ) : null}
                    {submitNotice ? (
                      <MessageCard tone="success">{submitNotice}</MessageCard>
                    ) : null}
                  </div>

                  <button
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={
                      isSubmitting ||
                      (announcementsState.recipients?.totalCount ?? 0) < 1
                    }
                    onClick={() => {
                      void handleSendAnnouncement();
                    }}
                    type="button"
                  >
                    <Send className="size-4" />
                    {isSubmitting ? copy.actions.sending : copy.actions.send}
                  </button>
                </div>
              </section>
            </LandingReveal>

            <LandingReveal delay={120} variant="soft">
              <section className="glass-card rounded-[28px] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="eyebrow">{copy.labels.history}</p>
                    <h2 className="text-base font-semibold text-slate-950">
                      {copy.labels.latestMessages}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {copy.description}
                    </p>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#1e293b)] text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                    <Clock3 className="size-5" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {announcementsState.status === "loading" &&
                  announcementsState.history.length === 0 ? (
                    <MessageCard>{copy.loading}</MessageCard>
                  ) : announcementsState.history.length === 0 ? (
                    <MessageCard>{copy.emptyHistory}</MessageCard>
                  ) : (
                    announcementsState.history.map((announcement) => (
                      <article
                        className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                        key={announcement.announcementId}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white">
                                {copy.title}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
                                {copy.scopes[announcement.recipientScope]}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
                                {copy.filters[announcement.recipientFilter]}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                                {copy.labels.totalRecipients}
                                <span className="ml-2 text-slate-950">
                                  {new Intl.NumberFormat(locale).format(
                                    announcement.recipientCount,
                                  )}
                                </span>
                              </span>
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-sm font-semibold text-slate-950">
                                {announcement.title}
                              </h3>
                              <p className="text-sm leading-6 text-slate-600">
                                {announcement.body}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>
                                {copy.labels.completedRecipients}:{" "}
                                {new Intl.NumberFormat(locale).format(
                                  announcement.completedRecipientCount,
                                )}
                              </span>
                              <span>
                                {copy.labels.pendingRecipients}:{" "}
                                {new Intl.NumberFormat(locale).format(
                                  announcement.pendingRecipientCount,
                                )}
                              </span>
                            </div>
                            {announcement.recipientPreview.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {announcement.recipientPreview.map((recipient) => (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                                    key={`${announcement.announcementId}:${recipient.email}`}
                                  >
                                    {recipient.email}
                                    {recipient.pushSubscribed ? (
                                      <Smartphone className="size-3 text-slate-950" />
                                    ) : null}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="shrink-0 space-y-2 text-right">
                            <p className="text-xs font-medium text-slate-500">
                              {formatDateTime(announcement.createdAt, locale)}
                            </p>
                            {announcement.href ? (
                              <Link
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                href={announcement.href}
                              >
                                {copy.labels.sendLink}
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </LandingReveal>
          </>
        )}
      </main>
    </div>
  );
}
