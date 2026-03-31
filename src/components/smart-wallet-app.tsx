"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Layers3,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletMinimal,
  Zap,
} from "lucide-react";
import { prepareTransaction } from "thirdweb";
import {
  AutoConnect,
  ConnectButton,
  ConnectEmbed,
  TransactionButton,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { LanguageSwitcher } from "@/components/language-switcher";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import { cn } from "@/lib/utils";
import {
  BSC_EXPLORER,
  BSC_USDT_ADDRESS,
  BSC_USDT_URL,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { thirdwebLocales, type Dictionary, type Locale } from "@/lib/i18n";

type NoticeTone = "info" | "success" | "error";

type WalletNotice = {
  tone: NoticeTone;
  text: string;
  href?: string;
};

type MemberSyncState = {
  email: string | null;
  error: string | null;
  isNewMember: boolean;
  member: MemberRecord | null;
  status: "idle" | "syncing" | "ready" | "error";
};

export function SmartWalletApp({
  dictionary,
  incomingReferralCode,
  locale,
}: {
  dictionary: Dictionary;
  incomingReferralCode: string | null;
  locale: Locale;
}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const { data: balance } = useWalletBalance({
    client: thirdwebClient,
    chain: smartWalletChain,
    address: account?.address,
    tokenAddress: BSC_USDT_ADDRESS,
  });
  const [notice, setNotice] = useState<WalletNotice | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberSync, setMemberSync] = useState<MemberSyncState>({
    email: null,
    error: null,
    isNewMember: false,
    member: null,
    status: "idle",
  });

  const appMetadata = getAppMetadata(dictionary.meta.description);
  const signer = wallet?.getAdminAccount?.();
  const accountAddress = account?.address;
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const referralLink = memberSync.member?.referralCode
    ? getReferralLink(memberSync.member.referralCode, locale)
    : null;

  async function runMemberSync() {
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
          error: dictionary.member.errors.missingEmail,
          isNewMember: false,
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
          referredByCode: incomingReferralCode,
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
          "error" in data && data.error
            ? data.error
            : dictionary.member.errors.syncFailed,
        );
      }

      setMemberSync({
        email: data.member.email,
        error: null,
        isNewMember: data.isNewMember,
        member: data.member,
        status: "ready",
      });
    } catch (error) {
      setMemberSync((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : dictionary.member.errors.syncFailed,
        isNewMember: false,
        status: "error",
      }));
    }
  }

  const syncMemberRegistration = useEffectEvent(async () => {
    await runMemberSync();
  });

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setMemberSync({
        email: null,
        error: null,
        isNewMember: false,
        member: null,
        status: "idle",
      });
      return;
    }

    void syncMemberRegistration();
  }, [accountAddress, status, locale, chain.id, chain.name, incomingReferralCode]);

  async function handleCopyAddress() {
    if (!accountAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(accountAddress);
      setCopied(true);
      setNotice({
        tone: "info",
        text: dictionary.notices.copySuccess,
      });

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setNotice({
        tone: "error",
        text: dictionary.notices.copyError,
      });
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(15,118,110,0.2),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.14),transparent_26%)]" />

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
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)]">
              <WalletMinimal className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="eyebrow">{dictionary.common.headerEyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.common.appName}
                </h1>
                <p className="text-sm text-slate-600">
                  {dictionary.common.headerDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <LanguageSwitcher
              label={dictionary.common.languageLabel}
              locale={locale}
            />
            <StatusChip
              labels={dictionary.common.status}
              status={status}
            />
            {hasThirdwebClientId ? (
              <ConnectButton
                accountAbstraction={smartWalletOptions}
                appMetadata={appMetadata}
                chain={smartWalletChain}
                client={thirdwebClient}
                connectButton={{
                  className:
                    "!h-11 !rounded-full !border !border-slate-200 !bg-slate-950 !px-4 !text-sm !font-medium !text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]",
                  label: dictionary.common.connectWallet,
                }}
                connectModal={{
                  title: dictionary.common.connectModalTitle,
                  titleIcon: "/favicon.ico",
                }}
                detailsButton={{
                  className:
                    "!h-11 !rounded-full !border !border-slate-200 !bg-white !px-4 !text-sm !font-medium !text-slate-950",
                  displayBalanceToken: {
                    [smartWalletChain.id]: BSC_USDT_ADDRESS,
                  },
                }}
                detailsModal={{
                  showTestnetFaucet: false,
                }}
                locale={thirdwebLocales[locale]}
                theme="dark"
                wallets={supportedWallets}
              />
            ) : (
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {dictionary.common.clientIdRequired}
              </div>
            )}
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-card relative overflow-hidden rounded-[32px] p-5 sm:p-7">
            <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_68%)] blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge icon={<Smartphone className="size-3.5" />}>
                  {dictionary.hero.badges[0]}
                </Badge>
                <Badge icon={<ShieldCheck className="size-3.5" />}>
                  {dictionary.hero.badges[1]}
                </Badge>
                <Badge icon={<Zap className="size-3.5" />}>
                  {dictionary.hero.badges[2]}
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="eyebrow">{dictionary.hero.eyebrow}</p>
                <h2 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl">
                  {dictionary.hero.title}
                </h2>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  {dictionary.hero.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {dictionary.metrics.map((metric) => (
                  <MetricCard
                    hint={metric.hint}
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                  />
                ))}
              </div>

              {incomingReferralCode ? (
                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/90 p-5 text-sm text-emerald-950">
                  <p className="font-semibold">
                    {dictionary.member.incomingReferralTitle}
                  </p>
                  <p className="mt-2 leading-6">
                    {dictionary.member.incomingReferralDescription.replace(
                      "{code}",
                      incomingReferralCode,
                    )}
                  </p>
                </div>
              ) : null}

              {!hasThirdwebClientId ? (
                <div className="rounded-[28px] border border-amber-300 bg-amber-50/90 p-5 text-sm text-amber-950">
                  <p className="font-semibold">{dictionary.env.title}</p>
                  <p className="mt-2 leading-6">{dictionary.env.description}</p>
                </div>
              ) : status === "connected" && accountAddress ? (
                <div className="grid gap-3 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:grid-cols-[1.25fr_0.75fr]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">{dictionary.connected.eyebrow}</p>
                        <h3 className="text-xl font-semibold text-slate-950">
                          {shortenAddress(accountAddress)}
                        </h3>
                      </div>
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                        onClick={handleCopyAddress}
                        type="button"
                      >
                        {copied ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copied
                          ? dictionary.common.copied
                          : dictionary.common.copyAddress}
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow
                        label={dictionary.connected.labels.chain}
                        value={chain.name ?? "BSC"}
                      />
                      <InfoRow
                        label={dictionary.connected.labels.balance}
                        value={formatBalance(
                          balance?.displayValue,
                          balance?.symbol ?? "USDT",
                          locale,
                        )}
                      />
                      <InfoRow
                        label={dictionary.connected.labels.walletType}
                        value={
                          signer
                            ? dictionary.common.walletTypeAbstracted
                            : wallet?.id ?? dictionary.common.notAvailable
                        }
                      />
                      <InfoRow
                        label={dictionary.connected.labels.adminSigner}
                        value={
                          signer
                            ? shortenAddress(signer.address)
                            : dictionary.common.notAvailable
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-[24px] bg-slate-950 p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                      {dictionary.connected.quickActionsTitle}
                    </p>
                    <ActionLink
                      href={accountUrl}
                      label={dictionary.connected.actions.explorer}
                    />
                    <ActionLink
                      href={BSC_USDT_URL}
                      label={dictionary.connected.actions.contract}
                    />
                    <ActionLink
                      href="https://thirdweb.com/dashboard"
                      label={dictionary.connected.actions.dashboard}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                    <p className="eyebrow mb-3">{dictionary.onboarding.eyebrow}</p>
                    <ConnectEmbed
                      accountAbstraction={smartWalletOptions}
                      appMetadata={appMetadata}
                      chain={smartWalletChain}
                      client={thirdwebClient}
                      locale={thirdwebLocales[locale]}
                      modalSize="compact"
                      theme="dark"
                      wallets={supportedWallets}
                    />
                  </div>

                  <div className="grid gap-3">
                    {dictionary.onboarding.cards.map((card, index) => (
                      <FlowCard
                        description={card.description}
                        icon={
                          index === 0 ? (
                            <Sparkles className="size-4" />
                          ) : index === 1 ? (
                            <Layers3 className="size-4" />
                          ) : (
                            <Zap className="size-4" />
                          )
                        }
                        key={card.title}
                        title={card.title}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <Panel
              contentClassName="gap-3"
              eyebrow={dictionary.runway.eyebrow}
              title={dictionary.runway.title}
            >
              {dictionary.runway.steps.map((step, index) => (
                <RunwayStep
                  description={step.description}
                  index={`0${index + 1}`}
                  key={step.title}
                  title={step.title}
                />
              ))}
            </Panel>

            <Panel
              contentClassName="gap-4"
              eyebrow={dictionary.member.eyebrow}
              title={dictionary.member.title}
            >
              {memberSync.status === "idle" ? (
                <MessageCard>{dictionary.member.disconnected}</MessageCard>
              ) : null}

              {memberSync.status === "syncing" ? (
                <MessageCard>{dictionary.member.syncing}</MessageCard>
              ) : null}

              {memberSync.status === "error" ? (
                <MessageCard tone="error">
                  {memberSync.error ?? dictionary.member.errors.syncFailed}
                </MessageCard>
              ) : null}

              {memberSync.member ? (
                <>
                  <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.member.synced}
                    </p>
                    {memberSync.isNewMember ? (
                      <p className="mt-2 text-sm font-semibold text-emerald-700">
                        {dictionary.member.newMember}
                      </p>
                    ) : null}
                    {memberSync.member.referredByCode ? (
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {dictionary.member.appliedReferralDescription.replace(
                          "{code}",
                          memberSync.member.referredByCode,
                        )}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow
                      label={dictionary.member.labels.emailKey}
                      value={memberSync.member.email}
                    />
                    <InfoRow
                      label={dictionary.member.labels.lastWallet}
                      value={shortenAddress(memberSync.member.lastWalletAddress)}
                    />
                    <InfoRow
                      label={dictionary.member.labels.walletCount}
                      value={String(memberSync.member.walletAddresses.length)}
                    />
                    <InfoRow
                      label={dictionary.member.labels.registeredAt}
                      value={formatDateTime(memberSync.member.createdAt, locale)}
                    />
                    <InfoRow
                      label={dictionary.member.labels.updatedAt}
                      value={formatDateTime(memberSync.member.updatedAt, locale)}
                    />
                    <InfoRow
                      label={dictionary.member.labels.lastConnectedAt}
                      value={formatDateTime(
                        memberSync.member.lastConnectedAt,
                        locale,
                      )}
                    />
                    <InfoRow
                      label={dictionary.member.labels.referralCode}
                      value={memberSync.member.referralCode}
                    />
                    <InfoRow
                      label={dictionary.member.labels.referredByCode}
                      value={
                        memberSync.member.referredByCode ??
                        dictionary.member.noReferralApplied
                      }
                    />
                  </div>

                  {referralLink ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {dictionary.member.labels.referralLink}
                      </p>
                      <a
                        className="mt-3 block break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                        href={referralLink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {referralLink}
                      </a>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {dictionary.member.shareHint}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={memberSync.status === "syncing"}
                      onClick={() => {
                        void runMemberSync();
                      }}
                      type="button"
                    >
                      {dictionary.member.actions.syncNow}
                    </button>

                    <Link
                      className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                      href={`/${locale}/referrals`}
                    >
                      {dictionary.member.actions.viewReferrals}
                    </Link>
                  </div>
                </>
              ) : null}
            </Panel>

            <Panel
              contentClassName="gap-4"
              eyebrow={dictionary.sponsored.eyebrow}
              title={dictionary.sponsored.title}
            >
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] p-5 text-white shadow-[0_24px_60px_rgba(29,78,216,0.22)]">
                <p className="text-sm leading-6 text-white/70">
                  {dictionary.sponsored.description}
                </p>
                <TransactionButton
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!accountAddress || !hasThirdwebClientId}
                  onError={(error) =>
                    setNotice({
                      tone: "error",
                      text: error.message,
                    })
                  }
                  onTransactionConfirmed={(receipt) =>
                    setNotice({
                      tone: "success",
                      text: dictionary.sponsored.txConfirmed,
                      href: `${BSC_EXPLORER}/tx/${receipt.transactionHash}`,
                    })
                  }
                  onTransactionSent={(result) =>
                    setNotice({
                      tone: "info",
                      text: dictionary.sponsored.txSent,
                      href: `${BSC_EXPLORER}/tx/${result.transactionHash}`,
                    })
                  }
                  transaction={() => {
                    if (!accountAddress) {
                      throw new Error(dictionary.sponsored.connectFirst);
                    }

                    return prepareTransaction({
                      chain: smartWalletChain,
                      client: thirdwebClient,
                      to: accountAddress,
                      value: BigInt(0),
                    });
                  }}
                  type="button"
                  unstyled
                >
                  {dictionary.sponsored.cta}
                </TransactionButton>
              </div>

              <NoticeCard
                notice={notice}
                openExplorerLabel={dictionary.sponsored.openExplorer}
                placeholder={dictionary.sponsored.emptyNotice}
              />
            </Panel>

            <Panel
              contentClassName="gap-3"
              eyebrow={dictionary.surface.eyebrow}
              title={dictionary.surface.title}
            >
              {dictionary.surface.points.map((point) => (
                <SurfacePoint
                  description={point.description}
                  key={point.title}
                  title={point.title}
                />
              ))}
            </Panel>

            <Panel
              contentClassName="flex-row flex-wrap"
              eyebrow={dictionary.signInMix.eyebrow}
              title={dictionary.signInMix.title}
            >
              {dictionary.signInMix.methods.map((method) => (
                <div
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  key={method}
                >
                  {method}
                </div>
              ))}
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
  contentClassName,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <section className="glass-card rounded-[30px] p-5 sm:p-6">
      <div className="mb-4 space-y-1">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
      </div>
      <div className={cn("flex flex-col", contentClassName)}>{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function FlowCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function RunwayStep({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
          {index}
        </div>
        <div>
          <h4 className="font-semibold text-slate-950">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SurfacePoint({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
      <h4 className="font-semibold text-slate-950">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function Badge({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur">
      {icon}
      {children}
    </div>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : "border-slate-200 bg-white/90 text-slate-600",
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

function NoticeCard({
  notice,
  placeholder,
  openExplorerLabel,
}: {
  notice: WalletNotice | null;
  placeholder: string;
  openExplorerLabel: string;
}) {
  if (!notice) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
        {placeholder}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6",
        notice.tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-950",
        notice.tone === "info" && "border-blue-200 bg-blue-50 text-blue-950",
        notice.tone === "error" && "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <p>{notice.text}</p>
      {notice.href ? (
        <a
          className="mt-2 inline-flex items-center gap-2 font-semibold underline decoration-current underline-offset-4"
          href={notice.href}
          rel="noreferrer"
          target="_blank"
        >
          {openExplorerLabel}
          <ArrowUpRight className="size-4" />
        </a>
      ) : null}
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <ArrowUpRight className="size-4" />
    </a>
  );
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getReferralLink(referralCode: string, locale: Locale) {
  const path = `/${locale}?ref=${encodeURIComponent(referralCode)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    return path;
  }

  try {
    return new URL(path, appUrl).toString();
  } catch {
    return path;
  }
}

function formatBalance(
  value: string | undefined,
  symbol: string,
  locale: Locale,
) {
  if (!value) {
    return `0 ${symbol}`;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return `${value} ${symbol}`;
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: parsed > 1 ? 4 : 6,
  }).format(parsed)} ${symbol}`;
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
