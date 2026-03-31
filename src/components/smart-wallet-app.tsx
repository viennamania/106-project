"use client";

import { useState } from "react";
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

import {
  appMetadata,
  BSC_EXPLORER,
  BSC_USDT_ADDRESS,
  BSC_USDT_URL,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "error";

type WalletNotice = {
  tone: NoticeTone;
  text: string;
  href?: string;
};

const loginMethods = ["Email", "Google", "Apple", "Passkey", "Guest"];

export function SmartWalletApp() {
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

  const signer = wallet?.getAdminAccount?.();
  const accountAddress = account?.address;
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;

  async function handleCopyAddress() {
    if (!accountAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(accountAddress);
      setCopied(true);
      setNotice({
        tone: "info",
        text: "스마트 월렛 주소를 클립보드에 복사했습니다.",
      });

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setNotice({
        tone: "error",
        text: "주소 복사에 실패했습니다. 브라우저 권한을 확인하세요.",
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
              <p className="eyebrow">V0-compatible x thirdweb</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  Pocket Smart Wallet
                </h1>
                <p className="text-sm text-slate-600">
                  모바일 우선 Smart Account 온보딩과 가스 스폰서 데모를 한 화면에 묶었습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusChip status={status} />
            {hasThirdwebClientId ? (
              <ConnectButton
                accountAbstraction={smartWalletOptions}
                appMetadata={appMetadata}
                chain={smartWalletChain}
                client={thirdwebClient}
                connectButton={{
                  className:
                    "!h-11 !rounded-full !border !border-slate-200 !bg-slate-950 !px-4 !text-sm !font-medium !text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]",
                  label: "지갑 연결",
                }}
                connectModal={{
                  title: "Pocket Smart Wallet 시작",
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
                theme="dark"
                wallets={supportedWallets}
              />
            ) : (
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                client id 필요
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
                  Thumb-first flow
                </Badge>
                <Badge icon={<ShieldCheck className="size-3.5" />}>
                  ERC-4337 smart account
                </Badge>
                <Badge icon={<Zap className="size-3.5" />}>
                  Sponsored gas demo
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="eyebrow">Mobile Smart Wallet</p>
                <h2 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl">
                  이메일이나 패스키로 바로 들어오고, Smart Wallet으로 바로 전환되는 온체인 앱.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  `v0`가 다루기 좋은 컴포넌트 구조와 `thirdweb` Smart Wallet
                  연결 흐름을 결합했습니다. 모바일에서 긴 입력을 줄이고, Base
                  Smart Wallet 위에서 BSC USDT 잔액만 빠르게 확인할 수 있게
                  정리했습니다.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="체인"
                  value="BSC"
                  hint="BNB Smart Chain"
                />
                <MetricCard
                  label="표시 토큰"
                  value="USDT"
                  hint="BSC only"
                />
                <MetricCard
                  label="가스 정책"
                  value="sponsorGas"
                  hint="always true"
                />
              </div>

              {!hasThirdwebClientId ? (
                <div className="rounded-[28px] border border-amber-300 bg-amber-50/90 p-5 text-sm text-amber-950">
                  <p className="font-semibold">환경변수 설정 필요</p>
                  <p className="mt-2 leading-6">
                    `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`가 비어 있어 Connect UI를
                    숨겼습니다. `.env.example`을 복사한 뒤 client id를 넣으면
                    바로 연결됩니다.
                  </p>
                </div>
              ) : status === "connected" && accountAddress ? (
                <div className="grid gap-3 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:grid-cols-[1.25fr_0.75fr]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">Active Smart Wallet</p>
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
                        {copied ? "복사됨" : "주소 복사"}
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow
                        label="연결된 체인"
                        value={chain.name ?? "BSC"}
                      />
                      <InfoRow
                        label="USDT 잔액"
                        value={formatBalance(
                          balance?.displayValue,
                          balance?.symbol ?? "USDT",
                        )}
                      />
                      <InfoRow
                        label="지갑 타입"
                        value={signer ? "Abstracted smart wallet" : wallet?.id ?? "-"}
                      />
                      <InfoRow
                        label="관리자 signer"
                        value={signer ? shortenAddress(signer.address) : "N/A"}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-[24px] bg-slate-950 p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                      Quick Actions
                    </p>
                    <ActionLink href={accountUrl} label="BscScan에서 보기" />
                    <ActionLink href={BSC_USDT_URL} label="BSC USDT 컨트랙트" />
                    <ActionLink
                      href="https://thirdweb.com/dashboard"
                      label="thirdweb dashboard"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                    <p className="eyebrow mb-3">Wallet Onboarding</p>
                    <ConnectEmbed
                      accountAbstraction={smartWalletOptions}
                      appMetadata={appMetadata}
                      chain={smartWalletChain}
                      client={thirdwebClient}
                      modalSize="compact"
                      theme="dark"
                      wallets={supportedWallets}
                    />
                  </div>

                  <div className="grid gap-3">
                    <FlowCard
                      icon={<Sparkles className="size-4" />}
                      title="지갑 없는 유저도 바로 진입"
                      description="Email, Google, Apple, Passkey, Guest를 같은 진입점에서 받아 모바일 입력량을 줄였습니다."
                    />
                    <FlowCard
                      icon={<Layers3 className="size-4" />}
                      title="연결 즉시 Smart Account 추상화"
                      description="BSC 기준 Smart Wallet 플로우를 기본값으로 잡고 sponsorGas=true 정책을 고정했습니다."
                    />
                    <FlowCard
                      icon={<Zap className="size-4" />}
                      title="USDT 중심 지갑 뷰"
                      description="연결 후 native token 대신 BSC USDT 잔액만 노출해 필요한 정보만 보이도록 줄였습니다."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <Panel
              title="Session Runway"
              eyebrow="3-step mobile flow"
              contentClassName="gap-3"
            >
              <RunwayStep
                index="01"
                title="로그인 방식 선택"
                description="이메일, 소셜, 패스키, 게스트 계정을 인라인으로 노출해 첫 진입 마찰을 낮춥니다."
              />
              <RunwayStep
                index="02"
                title="Smart Wallet 활성화"
                description="연결된 지갑을 BSC Smart Wallet 흐름으로 전환하고 sponsorGas=true 설정을 유지합니다."
              />
              <RunwayStep
                index="03"
                title="USDT만 확인"
                description="잔액, explorer, 토큰 컨트랙트 링크를 USDT 기준으로 제한해 모바일 화면에서 정보 밀도를 낮췄습니다."
              />
            </Panel>

            <Panel
              title="Sponsored Demo"
              eyebrow="transaction test"
              contentClassName="gap-4"
            >
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] p-5 text-white shadow-[0_24px_60px_rgba(29,78,216,0.22)]">
                <p className="text-sm leading-6 text-white/70">
                  연결되면 자기 주소로 `0 BNB` self-transaction을 보내 BSC Smart
                  Wallet과 paymaster 연결을 테스트합니다.
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
                      text: "트랜잭션이 확인되었습니다.",
                      href: `${BSC_EXPLORER}/tx/${receipt.transactionHash}`,
                    })
                  }
                  onTransactionSent={(result) =>
                    setNotice({
                      tone: "info",
                      text: "트랜잭션이 전송되었습니다. explorer에서 추적할 수 있습니다.",
                      href: `${BSC_EXPLORER}/tx/${result.transactionHash}`,
                    })
                  }
                  transaction={() => {
                    if (!accountAddress) {
                      throw new Error("먼저 스마트 월렛을 연결하세요.");
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
                  Sponsored Self Ping 보내기
                </TransactionButton>
              </div>

              <NoticeCard notice={notice} />
            </Panel>

            <Panel
              title="Wallet Surface"
              eyebrow="mobile decisions"
              contentClassName="gap-3"
            >
              <SurfacePoint
                title="헤더는 한 손 조작 기준"
                description="상단에 연결 상태와 ConnectButton만 남겨 핵심 동작을 손가락이 닿는 범위에 유지했습니다."
              />
              <SurfacePoint
                title="연결 전과 후를 분리"
                description="비연결 상태는 온보딩 중심, 연결 후에는 BSC USDT 잔액과 계정 액션 중심으로 화면 목적이 바뀝니다."
              />
              <SurfacePoint
                title="v0 추가 작업 대응"
                description="`components.json`, alias, Tailwind 구조를 정리해 이후 v0 Add to Codebase 흐름으로 이어가기 쉽게 맞췄습니다."
              />
            </Panel>

            <Panel
              title="Sign-in Mix"
              eyebrow="auth channels"
              contentClassName="flex-row flex-wrap"
            >
              {loginMethods.map((method) => (
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
  children: React.ReactNode;
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
  icon: React.ReactNode;
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
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur">
      {icon}
      {children}
    </div>
  );
}

function StatusChip({
  status,
}: {
  status: "connected" | "disconnected" | "connecting" | "unknown";
}) {
  const copy =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting"
        : status === "unknown"
          ? "Loading"
          : "Disconnected";

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

function NoticeCard({ notice }: { notice: WalletNotice | null }) {
  if (!notice) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
        트랜잭션 결과가 여기에 표시됩니다. paymaster 설정이 없는 경우 오류 메시지가
        그대로 노출됩니다.
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
          Explorer 열기
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

function formatBalance(value: string | undefined, symbol: string) {
  if (!value) {
    return `0 ${symbol}`;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return `${value} ${symbol}`;
  }

  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: parsed > 1 ? 4 : 6,
  }).format(parsed)} ${symbol}`;
}
