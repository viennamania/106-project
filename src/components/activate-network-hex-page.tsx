"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronUp,
  GitBranch,
  Hexagon,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LandingReveal } from "@/components/landing/landing-reveal";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import {
  createEmptyReferralNetworkSummary,
  type ManagedMemberReferralsResponse,
  type ManagedReferralTreeNodeRecord,
  type MemberRecord,
  REFERRAL_SIGNUP_LIMIT,
  type SyncMemberResponse,
} from "@/lib/member";
import { type Dictionary, type Locale } from "@/lib/i18n";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type ActivateNetworkHexState = {
  error: string | null;
  levelCounts: number[];
  member: MemberRecord | null;
  members: ManagedReferralTreeNodeRecord[];
  referrals: ManagedReferralTreeNodeRecord[];
  status: "idle" | "loading" | "ready" | "error";
  summary: ReturnType<typeof createEmptyReferralNetworkSummary>;
  totalReferrals: number;
};

const slotPositions = [
  "left-1/2 top-[1.75rem] -translate-x-1/2",
  "right-[0.6rem] top-[6.35rem] sm:right-[1.1rem] sm:top-[7.1rem] lg:right-[1.6rem] lg:top-[7.8rem]",
  "right-[0.6rem] bottom-[6.35rem] sm:right-[1.1rem] sm:bottom-[7.1rem] lg:right-[1.6rem] lg:bottom-[7.8rem]",
  "left-1/2 bottom-[1.75rem] -translate-x-1/2",
  "left-[0.6rem] bottom-[6.35rem] sm:left-[1.1rem] sm:bottom-[7.1rem] lg:left-[1.6rem] lg:bottom-[7.8rem]",
  "left-[0.6rem] top-[6.35rem] sm:left-[1.1rem] sm:top-[7.1rem] lg:left-[1.6rem] lg:top-[7.8rem]",
] as const;

const hexClipPath =
  "polygon(24% 5%, 76% 5%, 100% 50%, 76% 95%, 24% 95%, 0 50%)";

function getHexCopy(locale: Locale) {
  const copy = {
    en: {
      backToRoot: "Back to root",
      boardHint:
        "Tap any occupied face to recenter the board around that member.",
      description:
        "The center tile shows the active member, while the six faces show direct signup slots as a game dashboard.",
      emptySlot: "Empty slot",
      focusRoot: "Your code root",
      hexView: "Hex dashboard",
      openList: "Open list view",
      slot: "Slot",
      stepUp: "Go up",
    },
    id: {
      backToRoot: "Kembali ke root",
      boardHint:
        "Ketuk slot yang terisi untuk memusatkan papan ke anggota tersebut.",
      description:
        "Hexagon tengah menampilkan anggota aktif, dan enam sisinya menunjukkan slot signup langsung seperti dashboard game.",
      emptySlot: "Slot kosong",
      focusRoot: "Root kode saya",
      hexView: "Dasbor heks",
      openList: "Buka tampilan daftar",
      slot: "Slot",
      stepUp: "Naik satu tingkat",
    },
    ja: {
      backToRoot: "ルートへ戻る",
      boardHint:
        "埋まっている面をタップすると、その会員を中心に盤面を再配置します。",
      description:
        "中央の六角形は現在の会員、周囲の6面は直接登録スロットをゲームダッシュボードのように表示します。",
      emptySlot: "空きスロット",
      focusRoot: "自分のコードのルート",
      hexView: "ヘックスダッシュボード",
      openList: "一覧管理を開く",
      slot: "スロット",
      stepUp: "一段上へ",
    },
    ko: {
      backToRoot: "처음으로",
      boardHint:
        "채워진 면을 누르면 그 회원을 중심으로 육각형 보드를 다시 정렬합니다.",
      description:
        "중앙 육각형은 현재 회원, 주변 6면은 직속 가입 슬롯을 게임 대시보드처럼 보여줍니다.",
      emptySlot: "빈 슬롯",
      focusRoot: "내 코드 루트",
      hexView: "육각형 대시보드",
      openList: "목록 관리 열기",
      slot: "슬롯",
      stepUp: "한 단계 위",
    },
    vi: {
      backToRoot: "Về gốc",
      boardHint:
        "Chạm vào ô đã có thành viên để lấy người đó làm trung tâm của bảng.",
      description:
        "Lục giác trung tâm là thành viên đang xem, còn 6 mặt xung quanh thể hiện các slot đăng ký trực tiếp như một dashboard game.",
      emptySlot: "Ô trống",
      focusRoot: "Gốc mã của tôi",
      hexView: "Bảng lục giác",
      openList: "Mở dạng danh sách",
      slot: "Slot",
      stepUp: "Lên một cấp",
    },
    zh: {
      backToRoot: "回到根节点",
      boardHint:
        "点击已占用的六边形，即可把该会员重新置于画面中心。",
      description:
        "中央六边形显示当前会员，周围六个面像游戏面板一样展示直属注册槽位。",
      emptySlot: "空槽位",
      focusRoot: "我的代码根节点",
      hexView: "六角仪表盘",
      openList: "打开列表管理",
      slot: "槽位",
      stepUp: "返回上一级",
    },
  } satisfies Record<
    Locale,
    {
      backToRoot: string;
      boardHint: string;
      description: string;
      emptySlot: string;
      focusRoot: string;
      hexView: string;
      openList: string;
      slot: string;
      stepUp: string;
    }
  >;

  return copy[locale];
}

function formatInteger(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatAddressLabel(address: string) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEmailLabel(email: string) {
  if (!email) {
    return "-";
  }

  if (email.length <= 20) {
    return email;
  }

  const [localPart, domain = ""] = email.split("@");

  if (!domain) {
    return `${email.slice(0, 10)}...${email.slice(-7)}`;
  }

  return `${localPart.slice(0, 8)}...@${domain}`;
}

function getMemberStatusLabel(
  dictionary: Dictionary,
  status: MemberRecord["status"] | ManagedReferralTreeNodeRecord["status"],
) {
  return status === "completed"
    ? dictionary.member.completedValue
    : dictionary.member.pendingValue;
}

function getMembershipCardLabel(
  locale: Locale,
  membershipCardTier: ManagedReferralTreeNodeRecord["membershipCardTier"],
) {
  const labels = {
    en: { gold: "Gold card", none: "No card", silver: "Silver card" },
    id: { gold: "Kartu Gold", none: "Belum ada kartu", silver: "Kartu Silver" },
    ja: { gold: "Goldカード", none: "カードなし", silver: "Silverカード" },
    ko: { gold: "Gold 카드", none: "카드 없음", silver: "Silver 카드" },
    vi: { gold: "Thẻ Gold", none: "Chưa có thẻ", silver: "Thẻ Silver" },
    zh: { gold: "Gold 卡", none: "无卡", silver: "Silver 卡" },
  } satisfies Record<Locale, { gold: string; none: string; silver: string }>;

  if (membershipCardTier === "gold") {
    return labels[locale].gold;
  }

  if (membershipCardTier === "silver") {
    return labels[locale].silver;
  }

  return labels[locale].none;
}

function getTierLabel(
  locale: Locale,
  tier: ManagedReferralTreeNodeRecord["tier"],
) {
  const labels = {
    en: { basic: "Basic", gold: "Gold", silver: "Silver", vip: "VIP" },
    id: { basic: "Basic", gold: "Gold", silver: "Silver", vip: "VIP" },
    ja: { basic: "Basic", gold: "Gold", silver: "Silver", vip: "VIP" },
    ko: { basic: "Basic", gold: "Gold", silver: "Silver", vip: "VIP" },
    vi: { basic: "Basic", gold: "Gold", silver: "Silver", vip: "VIP" },
    zh: { basic: "Basic", gold: "Gold", silver: "Silver", vip: "VIP" },
  } satisfies Record<
    Locale,
    { basic: string; gold: string; silver: string; vip: string }
  >;

  if (tier === "silver") {
    return labels[locale].silver;
  }

  if (tier === "gold") {
    return labels[locale].gold;
  }

  if (tier === "vip") {
    return labels[locale].vip;
  }

  return labels[locale].basic;
}

function ConnectionStatusChip({
  labels,
  status,
}: {
  labels: Dictionary["common"]["status"];
  status: ReturnType<typeof useActiveWalletConnectionStatus>;
}) {
  const normalizedStatus =
    status === "connected"
      ? {
          className:
            "border-emerald-300/70 bg-emerald-50 text-emerald-700 shadow-[0_12px_24px_rgba(16,185,129,0.12)]",
          label: labels.connected,
        }
      : status === "connecting"
        ? {
            className:
              "border-amber-300/70 bg-amber-50 text-amber-700 shadow-[0_12px_24px_rgba(245,158,11,0.12)]",
            label: labels.connecting,
          }
        : {
            className:
              "border-slate-200 bg-white text-slate-600 shadow-[0_12px_24px_rgba(15,23,42,0.05)]",
            label: labels.disconnected,
          };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.2em] uppercase",
        normalizedStatus.className,
      )}
    >
      <span className="size-2 rounded-full bg-current" />
      {normalizedStatus.label}
    </span>
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
    <section
      className={cn(
        "rounded-[28px] border px-5 py-5 text-sm leading-7 shadow-[0_20px_55px_rgba(15,23,42,0.08)]",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-white/80 bg-white/92 text-slate-600",
      )}
    >
      {children}
    </section>
  );
}

function HudStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/8 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur">
      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/55">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold tracking-tight text-white sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 break-all text-sm font-semibold leading-6 text-slate-950">
        {value}
      </p>
    </div>
  );
}

function HexTile({
  accent = "node",
  badge,
  body,
  className,
  interactive = false,
  onClick,
  title,
}: {
  accent?: "center" | "empty" | "node";
  badge?: string;
  body: string;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  title: string;
}) {
  const accentStyles =
    accent === "center"
      ? "border-white/25 bg-[linear-gradient(145deg,rgba(15,23,42,0.95),rgba(29,78,216,0.82))] text-white shadow-[0_32px_85px_rgba(15,23,42,0.4)]"
      : accent === "empty"
        ? "border-dashed border-white/12 bg-white/5 text-white/55 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
        : "border-white/18 bg-[linear-gradient(155deg,rgba(255,255,255,0.15),rgba(255,255,255,0.06))] text-white shadow-[0_18px_45px_rgba(15,23,42,0.2)]";

  return (
    <div className={cn("absolute w-[7.15rem] sm:w-[8.8rem] lg:w-[9.8rem]", className)}>
      <button
        className={cn(
          "group relative aspect-[0.92] w-full overflow-hidden border px-4 py-4 text-left transition",
          accentStyles,
          interactive &&
            "hover:-translate-y-1 hover:border-sky-200/70 hover:bg-[linear-gradient(155deg,rgba(96,165,250,0.22),rgba(255,255,255,0.1))]",
        )}
        onClick={onClick}
        style={{ clipPath: hexClipPath }}
        type="button"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(250,204,21,0.08),transparent_28%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="space-y-1">
            {badge ? (
              <p className="text-[0.58rem] uppercase tracking-[0.28em] text-current/65">
                {badge}
              </p>
            ) : null}
            <p className="line-clamp-3 text-[0.84rem] font-semibold leading-5 sm:text-[0.92rem]">
              {title}
            </p>
          </div>
          <p className="line-clamp-2 text-[0.7rem] leading-5 text-current/78 sm:text-xs">
            {body}
          </p>
        </div>
      </button>
    </div>
  );
}

function HexCenterTile({
  body,
  eyebrow,
  subtitle,
  title,
}: {
  body: string;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[10rem] -translate-x-1/2 -translate-y-1/2 sm:w-[12.5rem] lg:w-[14rem]">
      <div
        className="relative aspect-[0.92] overflow-hidden border border-white/20 bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(37,99,235,0.84))] px-5 py-5 text-white shadow-[0_36px_95px_rgba(15,23,42,0.42)]"
        style={{ clipPath: hexClipPath }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="space-y-2">
            <p className="text-[0.62rem] uppercase tracking-[0.3em] text-white/60">
              {eyebrow}
            </p>
            <p className="line-clamp-3 text-base font-semibold leading-6 tracking-tight sm:text-lg">
              {title}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/80">{subtitle}</p>
            <p className="line-clamp-3 text-xs leading-5 text-white/62 sm:text-[0.82rem]">
              {body}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivateNetworkHexPage({
  dictionary,
  locale,
  referralCode = null,
  requestedMemberEmail = null,
  returnToHref,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  requestedMemberEmail?: string | null;
  returnToHref: string;
}) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const copy = getHexCopy(locale);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [focusedEmail, setFocusedEmail] = useState<string | null>(null);
  const [state, setState] = useState<ActivateNetworkHexState>({
    error: null,
    levelCounts: [],
    member: null,
    members: [],
    referrals: [],
    status: "idle",
    summary: createEmptyReferralNetworkSummary(),
    totalReferrals: 0,
  });
  const isDisconnected = status !== "connected" || !accountAddress;

  const loadNetwork = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setState({
          error: dictionary.activateNetworkPage.errors.missingEmail,
          levelCounts: [],
          member: null,
          members: [],
          referrals: [],
          status: "error",
          summary: createEmptyReferralNetworkSummary(),
          totalReferrals: 0,
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
            : dictionary.activateNetworkPage.errors.loadFailed,
        );
      }

      if ("validationError" in syncData && syncData.validationError) {
        setState({
          error: syncData.validationError,
          levelCounts: [],
          member: syncData.member,
          members: [],
          referrals: [],
          status: "error",
          summary: createEmptyReferralNetworkSummary(),
          totalReferrals: 0,
        });
        return;
      }

      if (!("member" in syncData) || !syncData.member) {
        throw new Error(dictionary.activateNetworkPage.errors.loadFailed);
      }

      if (syncData.member.status !== "completed") {
        setState({
          error: null,
          levelCounts: [],
          member: syncData.member,
          members: [],
          referrals: [],
          status: "ready",
          summary: createEmptyReferralNetworkSummary(),
          totalReferrals: 0,
        });
        return;
      }

      const response = await fetch(
        `/api/members/referrals/manage?email=${encodeURIComponent(email)}`,
      );
      const data = (await response.json()) as
        | ManagedMemberReferralsResponse
        | { error?: string };

      if (!response.ok || !("member" in data) || !("members" in data)) {
        throw new Error(
          response.status === 403
            ? dictionary.activateNetworkPage.paymentRequired
            : response.status === 404
              ? dictionary.activateNetworkPage.memberMissing
              : "error" in data && data.error
                ? data.error
                : dictionary.activateNetworkPage.errors.loadFailed,
        );
      }

      setState({
        error: null,
        levelCounts: data.levelCounts,
        member: data.member,
        members: data.members,
        referrals: data.referrals,
        status: "ready",
        summary: data.summary,
        totalReferrals: data.totalReferrals,
      });
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : dictionary.activateNetworkPage.errors.loadFailed,
        levelCounts: [],
        member: null,
        members: [],
        referrals: [],
        status: "error",
        summary: createEmptyReferralNetworkSummary(),
        totalReferrals: 0,
      });
    }
  }, [accountAddress, chain.id, chain.name, dictionary, locale]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setFocusedEmail(null);
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress) {
      return;
    }

    void loadNetwork();
  }, [accountAddress, loadNetwork, status]);

  const rootEmail = state.member?.email ?? null;
  const emailLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    if (rootEmail) {
      lookup.set(rootEmail.toLowerCase(), rootEmail);
    }

    for (const member of state.members) {
      lookup.set(member.email.toLowerCase(), member.email);
    }

    return lookup;
  }, [rootEmail, state.members]);

  const treeIndex = useMemo(() => {
    const byEmail = new Map<string, ManagedReferralTreeNodeRecord>();
    const parentByEmail = new Map<string, string>();

    if (!rootEmail) {
      return { byEmail, parentByEmail };
    }

    const visit = (
      nodes: ManagedReferralTreeNodeRecord[],
      parentEmail: string,
    ) => {
      for (const node of nodes) {
        byEmail.set(node.email, node);
        parentByEmail.set(node.email, parentEmail);
        visit(node.children, node.email);
      }
    };

    visit(state.referrals, rootEmail);

    return { byEmail, parentByEmail };
  }, [rootEmail, state.referrals]);

  useEffect(() => {
    if (!rootEmail) {
      setFocusedEmail(null);
      return;
    }

    const requestedEmail = requestedMemberEmail
      ? emailLookup.get(requestedMemberEmail.trim().toLowerCase()) ?? null
      : null;
    const preferredFocus = requestedEmail ?? rootEmail;

    if (!focusedEmail) {
      setFocusedEmail(preferredFocus);
      return;
    }

    if (!emailLookup.has(focusedEmail.toLowerCase())) {
      setFocusedEmail(preferredFocus);
    }
  }, [emailLookup, focusedEmail, requestedMemberEmail, rootEmail]);

  const isRootFocus = Boolean(rootEmail && focusedEmail === rootEmail);
  const focusedNode =
    !isRootFocus && focusedEmail
      ? treeIndex.byEmail.get(focusedEmail) ?? null
      : null;
  const focusedChildren = useMemo(
    () => (isRootFocus ? state.referrals : focusedNode?.children ?? []),
    [focusedNode?.children, isRootFocus, state.referrals],
  );
  const focusDepth = isRootFocus ? 0 : focusedNode?.depth ?? 0;
  const parentFocusEmail =
    !isRootFocus && focusedEmail ? treeIndex.parentByEmail.get(focusedEmail) ?? rootEmail : null;
  const currentHexHref = useMemo(
    () =>
      setPathSearchParams(
        buildPathWithReferral(`/${locale}/activate/network/hex`, referralCode),
        {
          member: focusedEmail,
          returnTo: returnToHref,
        },
      ),
    [focusedEmail, locale, referralCode, returnToHref],
  );
  const listViewHref = useMemo(
    () =>
      setPathSearchParams(
        buildPathWithReferral(`/${locale}/activate/network`, referralCode),
        {
          member: isRootFocus ? null : focusedEmail,
          returnTo: currentHexHref,
        },
      ),
    [currentHexHref, focusedEmail, isRootFocus, locale, referralCode],
  );

  const slotMembers = useMemo(() => {
    const slots = Array.from(
      { length: REFERRAL_SIGNUP_LIMIT },
      () => null as ManagedReferralTreeNodeRecord | null,
    );
    const overflow: ManagedReferralTreeNodeRecord[] = [];

    for (const child of focusedChildren) {
      const index = child.placementSlotIndex ?? 0;

      if (
        index >= 1 &&
        index <= REFERRAL_SIGNUP_LIMIT &&
        !slots[index - 1]
      ) {
        slots[index - 1] = child;
      } else {
        overflow.push(child);
      }
    }

    for (const child of overflow) {
      const nextEmptySlotIndex = slots.findIndex((slot) => slot === null);

      if (nextEmptySlotIndex === -1) {
        break;
      }

      slots[nextEmptySlotIndex] = child;
    }

    return slots;
  }, [focusedChildren]);

  const boardTitle =
    isRootFocus || !focusedNode ? state.member?.email ?? "-" : focusedNode.email;
  const boardSubtitle =
    isRootFocus || !focusedNode
      ? copy.focusRoot
      : `${dictionary.activateNetworkPage.labels.level} ${focusDepth}`;
  const boardBody =
    isRootFocus || !focusedNode
      ? `${dictionary.activateNetworkPage.labels.directMembers} ${formatInteger(state.summary.directMembers, locale)} · ${dictionary.activateNetworkPage.labels.totalMembers} ${formatInteger(state.summary.totalMembers, locale)}`
      : `${dictionary.activateNetworkPage.labels.directChildren} ${formatInteger(focusedNode.directReferralCount, locale)} · ${dictionary.activateNetworkPage.labels.descendants} ${formatInteger(focusedNode.totalReferralCount, locale)}`;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(250,204,21,0.14),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_28%,#111827_62%,#f6efe3_100%)]" />
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
        <header className="glass-card sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 -mx-4 flex flex-col gap-3 rounded-none border-x-0 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-[28px] lg:border-x lg:px-5 lg:py-4">
          <div className="flex items-center gap-3">
            <Link
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:size-12"
              href={returnToHref}
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>
            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.16)] sm:size-12">
              <Hexagon className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow hidden sm:block">
                {dictionary.activateNetworkPage.eyebrow}
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                {copy.hexView}
              </h1>
              <p className="hidden text-sm text-slate-600 lg:block">
                {copy.description}
              </p>
              <div className="mt-1 sm:hidden">
                <ConnectionStatusChip labels={dictionary.common.status} status={status} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:size-11"
                disabled={state.status === "loading"}
                onClick={() => {
                  void loadNetwork();
                }}
                type="button"
              >
                <RefreshCcw
                  className={cn("size-4", state.status === "loading" && "animate-spin")}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="hidden sm:block">
              <ConnectionStatusChip labels={dictionary.common.status} status={status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-800"
                href={listViewHref}
              >
                <GitBranch className="size-4" />
                {copy.openList}
              </Link>
              {hasThirdwebClientId ? (
                isDisconnected ? (
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:bg-slate-800"
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                    }}
                    type="button"
                  >
                    {dictionary.common.connectWallet}
                  </button>
                ) : null
              ) : (
                <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  {dictionary.common.clientIdRequired}
                </div>
              )}
            </div>
          </div>
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard>{dictionary.env.description}</MessageCard>
        ) : isDisconnected ? (
          <MessageCard>{dictionary.activateNetworkPage.disconnected}</MessageCard>
        ) : state.status === "loading" && !state.member ? (
          <MessageCard>{dictionary.activateNetworkPage.loading}</MessageCard>
        ) : state.member?.status !== "completed" ? (
          <MessageCard>{dictionary.activateNetworkPage.paymentRequired}</MessageCard>
        ) : state.error ? (
          <MessageCard tone="error">{state.error}</MessageCard>
        ) : !state.member ? (
          <MessageCard>{dictionary.activateNetworkPage.memberMissing}</MessageCard>
        ) : (
          <>
            <LandingReveal variant="hero">
              <section className="relative overflow-hidden rounded-[32px] border border-slate-900/90 bg-[linear-gradient(150deg,#09111f_0%,#0f172a_48%,#2563eb_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.12),transparent_24%)]" />
                <div className="relative">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/76">
                      <Sparkles className="size-3.5" />
                      {copy.hexView}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-300/35 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
                      {dictionary.member.completedValue}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="eyebrow text-white/70">
                      {dictionary.activateNetworkPage.eyebrow}
                    </p>
                    <h2 className="max-w-3xl text-[1.95rem] font-semibold leading-[1] tracking-tight text-white sm:text-[2.85rem] sm:leading-[1.04]">
                      {copy.hexView}
                    </h2>
                    <p className="max-w-3xl text-[0.98rem] leading-7 text-white/78 sm:text-lg">
                      {copy.description}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <HudStat
                      label={dictionary.activateNetworkPage.labels.directMembers}
                      value={formatInteger(state.summary.directMembers, locale)}
                    />
                    <HudStat
                      label={dictionary.activateNetworkPage.labels.totalMembers}
                      value={formatInteger(state.summary.totalMembers, locale)}
                    />
                    <HudStat
                      label={dictionary.activateNetworkPage.labels.totalLifetimePoints}
                      value={`${formatInteger(state.summary.totalLifetimePoints, locale)}P`}
                    />
                    <HudStat
                      label={dictionary.activateNetworkPage.labels.totalSpendablePoints}
                      value={`${formatInteger(state.summary.totalSpendablePoints, locale)}P`}
                    />
                  </div>
                </div>
              </section>
            </LandingReveal>

            <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
              <section className="glass-card overflow-hidden rounded-[32px] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="eyebrow">{copy.hexView}</p>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                      {boardTitle}
                    </h3>
                    <p className="max-w-2xl text-sm leading-6 text-slate-600">
                      {copy.boardHint}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={isRootFocus}
                      onClick={() => {
                        if (rootEmail) {
                          setFocusedEmail(rootEmail);
                        }
                      }}
                      type="button"
                    >
                      <Hexagon className="size-4" />
                      {copy.backToRoot}
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={isRootFocus || !parentFocusEmail}
                      onClick={() => {
                        if (parentFocusEmail) {
                          setFocusedEmail(parentFocusEmail);
                        }
                      }}
                      type="button"
                    >
                      <ChevronUp className="size-4" />
                      {copy.stepUp}
                    </button>
                  </div>
                </div>

                <div className="relative mt-5 min-h-[28rem] rounded-[30px] border border-slate-900/90 bg-[linear-gradient(165deg,#071120_0%,#0b1327_44%,#111f3d_100%)] p-3 shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:min-h-[34rem] sm:p-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.18),transparent_28%),radial-gradient(circle_at_18%_18%,rgba(250,204,21,0.12),transparent_22%),radial-gradient(circle_at_82%_80%,rgba(255,255,255,0.08),transparent_24%)]" />

                  {slotMembers.map((member, slotIndex) => (
                    <HexTile
                      accent={member ? "node" : "empty"}
                      badge={`${copy.slot} ${slotIndex + 1}`}
                      body={
                        member
                          ? `${formatInteger(member.lifetimePoints, locale)}P · ${getTierLabel(locale, member.tier)}`
                          : copy.emptySlot
                      }
                      className={slotPositions[slotIndex]}
                      interactive={Boolean(member)}
                      key={`slot-${slotIndex + 1}`}
                      onClick={
                        member
                          ? () => {
                              setFocusedEmail(member.email);
                            }
                          : undefined
                      }
                      title={member ? formatEmailLabel(member.email) : copy.emptySlot}
                    />
                  ))}

                  <HexCenterTile
                    body={boardBody}
                    eyebrow={isRootFocus ? copy.focusRoot : dictionary.activateNetworkPage.labels.currentMember}
                    subtitle={boardSubtitle}
                    title={formatEmailLabel(boardTitle)}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <section className="glass-card rounded-[28px] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="eyebrow">{dictionary.activateNetworkPage.labels.currentMember}</p>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {boardTitle}
                      </h3>
                    </div>
                    <Link
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50"
                      href={listViewHref}
                    >
                      <GitBranch className="size-4" />
                      {dictionary.activateNetworkPage.actions.openManagement}
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.memberStatus}
                      value={
                        isRootFocus || !focusedNode
                          ? getMemberStatusLabel(dictionary, state.member.status)
                          : getMemberStatusLabel(dictionary, focusedNode.status)
                      }
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.referralCode}
                      value={
                        isRootFocus || !focusedNode
                          ? state.member.referralCode ?? "-"
                          : focusedNode.referralCode ?? "-"
                      }
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.placementReferralCode}
                      value={
                        isRootFocus || !focusedNode
                          ? state.member.placementReferralCode ??
                            dictionary.member.topLevelPlacementValue
                          : focusedNode.placementReferralCode ??
                            dictionary.member.topLevelPlacementValue
                      }
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.placementEmail}
                      value={
                        isRootFocus || !focusedNode
                          ? state.member.placementEmail ??
                            dictionary.member.topLevelPlacementValue
                          : focusedNode.placementEmail ??
                            dictionary.member.topLevelPlacementValue
                      }
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.lastConnectedAt}
                      value={
                        isRootFocus || !focusedNode
                          ? `${state.member.lastConnectedAt} · ${formatAddressLabel(state.member.lastWalletAddress)}`
                          : `${focusedNode.lastConnectedAt} · ${formatAddressLabel(focusedNode.lastWalletAddress)}`
                      }
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.membershipCard}
                      value={
                        isRootFocus || !focusedNode
                          ? `${formatInteger(state.summary.totalMembers, locale)} ${dictionary.activateNetworkPage.labels.totalMembers}`
                          : getMembershipCardLabel(locale, focusedNode.membershipCardTier)
                      }
                    />
                  </div>
                </section>

                <section className="glass-card rounded-[28px] p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.directChildren}
                      value={formatInteger(
                        isRootFocus
                          ? state.summary.directMembers
                          : focusedNode?.directReferralCount ?? 0,
                        locale,
                      )}
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.descendants}
                      value={formatInteger(
                        isRootFocus
                          ? state.summary.totalMembers
                          : focusedNode?.totalReferralCount ?? 0,
                        locale,
                      )}
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.lifetimePoints}
                      value={`${formatInteger(
                        isRootFocus
                          ? state.summary.totalLifetimePoints
                          : focusedNode?.lifetimePoints ?? 0,
                        locale,
                      )}P`}
                    />
                    <DetailCard
                      label={dictionary.activateNetworkPage.labels.spendablePoints}
                      value={`${formatInteger(
                        isRootFocus
                          ? state.summary.totalSpendablePoints
                          : focusedNode?.spendablePoints ?? 0,
                        locale,
                      )}P`}
                    />
                  </div>
                </section>
              </section>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
