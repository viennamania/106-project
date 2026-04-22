"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ChevronUp,
  GitBranch,
  Hexagon,
  RefreshCcw,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
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

const mobileSlotPositions = [
  { left: "50%", top: "16%" },
  { left: "80.5%", top: "34%" },
  { left: "80.5%", top: "66%" },
  { left: "50%", top: "84%" },
  { left: "19.5%", top: "66%" },
  { left: "19.5%", top: "34%" },
] as const;

const desktopSlotPositions = [
  { left: "50%", top: "15%" },
  { left: "82%", top: "33%" },
  { left: "82%", top: "67%" },
  { left: "50%", top: "85%" },
  { left: "18%", top: "67%" },
  { left: "18%", top: "33%" },
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
      slotJump: "Slot jump",
      slotMoveEmpty: "Empty",
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
      slotJump: "Pindah slot",
      slotMoveEmpty: "Kosong",
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
      slotJump: "スロット移動",
      slotMoveEmpty: "空き",
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
      slotJump: "슬롯 바로 이동",
      slotMoveEmpty: "빈 슬롯",
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
      slotJump: "Nhảy slot",
      slotMoveEmpty: "Trống",
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
      slotJump: "槽位跳转",
      slotMoveEmpty: "空位",
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
      slotJump: string;
      slotMoveEmpty: string;
    }
  >;

  return copy[locale];
}

function formatInteger(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
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

function formatHexMemberLabel(email: string, isMobileCompact: boolean) {
  if (!isMobileCompact) {
    return formatEmailLabel(email);
  }

  if (!email) {
    return "-";
  }

  const [localPart, domain = ""] = email.split("@");

  if (!domain) {
    return email.length <= 10 ? email : `${email.slice(0, 8)}…`;
  }

  if (localPart.length <= 8) {
    return `${localPart}@…`;
  }

  return `${localPart.slice(0, 7)}…`;
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

function HexTile({
  accent = "node",
  badge,
  body,
  className,
  depthLabel,
  interactive = false,
  isMobileCompact = false,
  onClick,
  style,
  subtitle,
  title,
}: {
  accent?: "center" | "empty" | "node";
  badge?: string;
  body: string;
  className?: string;
  depthLabel?: string | null;
  interactive?: boolean;
  isMobileCompact?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  subtitle?: string | null;
  title: string;
}) {
  const accentStyles =
    accent === "center"
      ? "border-transparent bg-[linear-gradient(145deg,rgba(254,240,138,0.99),rgba(245,158,11,0.97)_42%,rgba(146,64,14,0.92)_100%)] text-slate-950 shadow-[0_34px_95px_rgba(120,53,15,0.42)]"
      : accent === "empty"
        ? "border-transparent bg-[linear-gradient(155deg,rgba(120,53,15,0.32),rgba(51,25,8,0.2))] text-amber-100/60 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
        : "border-transparent bg-[linear-gradient(155deg,rgba(251,191,36,0.26),rgba(180,83,9,0.24)_55%,rgba(15,23,42,0.44)_100%)] text-amber-50 shadow-[0_22px_50px_rgba(120,53,15,0.24)]";

  return (
    <div
      className={cn(
        isMobileCompact
          ? "absolute w-[5.15rem] sm:w-[9rem] lg:w-[11rem]"
          : "absolute w-[7.1rem] sm:w-[9rem] lg:w-[11rem]",
        className,
      )}
      style={style}
    >
      <button
        className={cn(
          "group relative aspect-[0.92] w-full overflow-hidden border text-left transition duration-500",
          isMobileCompact ? "px-2.5 py-2.5" : "px-3.5 py-3.5 sm:px-4 sm:py-4",
          accentStyles,
          interactive &&
            "hover:-translate-y-1.5 hover:scale-[1.02] hover:border-sky-200/70 hover:bg-[linear-gradient(155deg,rgba(96,165,250,0.22),rgba(255,255,255,0.1))]",
        )}
        onClick={onClick}
        style={{ clipPath: hexClipPath }}
        type="button"
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            accent === "center"
              ? "border-[2px] border-amber-50/90 shadow-[inset_0_0_0_1px_rgba(255,251,235,0.86),0_0_24px_rgba(251,191,36,0.42)]"
              : accent === "empty"
                ? "border border-amber-200/34 shadow-[inset_0_0_0_1px_rgba(253,230,138,0.16)]"
                : "border-[1.5px] border-amber-100/58 shadow-[inset_0_0_0_1px_rgba(255,248,220,0.28),0_0_18px_rgba(251,191,36,0.16)]",
          )}
          style={{ clipPath: hexClipPath }}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-[4px]",
            accent === "center"
              ? "border border-white/42"
              : accent === "empty"
                ? "border border-amber-100/10"
                : "border border-amber-50/22",
          )}
          style={{ clipPath: hexClipPath }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,251,235,0.26),transparent_36%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.12),transparent_30%),radial-gradient(circle_at_center,rgba(253,230,138,0.12),transparent_54%)]" />
        <div
          className={cn(
            "relative flex h-full flex-col justify-between",
            isMobileCompact ? "px-[16%] py-[15%]" : "px-[16%] py-[14%]",
          )}
        >
          <div className={cn("space-y-2", isMobileCompact && "space-y-1.5")}>
            <div className="flex items-start justify-between gap-2">
              {badge ? (
                <p
                  className={cn(
                    "uppercase text-current/72",
                    isMobileCompact
                      ? "text-[0.38rem] tracking-[0.16em]"
                      : "text-[0.5rem] tracking-[0.24em] sm:text-[0.58rem]",
                  )}
                >
                  {badge}
                </p>
              ) : <span />}
              {depthLabel ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full border border-current/15 bg-white/8 font-semibold uppercase text-current/74",
                    isMobileCompact
                      ? "px-1.5 py-0.5 text-[0.36rem] tracking-[0.12em]"
                      : "px-1.5 py-0.5 text-[0.48rem] tracking-[0.18em] sm:px-2 sm:py-1 sm:text-[0.52rem]",
                  )}
                >
                  {depthLabel}
                </span>
              ) : null}
            </div>
            <p
              className={cn(
                "font-semibold tracking-tight text-center",
                isMobileCompact
                  ? "line-clamp-1 text-[0.54rem] leading-4"
                  : "line-clamp-2 text-[0.76rem] leading-4.5 sm:line-clamp-3 sm:text-[0.94rem] sm:leading-5",
              )}
            >
              {title}
            </p>
            {subtitle ? (
              <p
                className={cn(
                  "text-current/70 text-center",
                  isMobileCompact
                    ? "line-clamp-1 text-[0.38rem] leading-3"
                    : "line-clamp-1 text-[0.6rem] leading-4 sm:line-clamp-2 sm:text-[0.72rem]",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          <p
            className={cn(
              "text-current/84 text-center",
              isMobileCompact
                ? "line-clamp-2 text-[0.42rem] leading-3.5"
                : "line-clamp-2 text-[0.64rem] leading-4.5 sm:line-clamp-3 sm:text-[0.78rem] sm:leading-5",
            )}
          >
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
  isMobileCompact = false,
  memberState,
  subtitle,
  title,
}: {
  body: string;
  eyebrow: string;
  isMobileCompact?: boolean;
  memberState: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        isMobileCompact ? "w-[8rem]" : "w-[11.2rem] sm:w-[13rem] lg:w-[16.25rem]",
      )}
    >
      <div
        className={cn(
          "relative aspect-[0.92] overflow-hidden border border-transparent bg-[linear-gradient(145deg,rgba(254,249,195,0.99),rgba(250,204,21,0.97)_36%,rgba(245,158,11,0.97)_70%,rgba(146,64,14,0.94)_100%)] text-slate-950 shadow-[0_36px_95px_rgba(120,53,15,0.42)] animate-[hex-core-glow_3.6s_ease-in-out_infinite]",
          isMobileCompact ? "px-[14%] py-[14%]" : "px-[16%] py-[14%]",
        )}
        style={{ clipPath: hexClipPath }}
      >
        <div
          className="pointer-events-none absolute inset-0 border-[2.5px] border-amber-50/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.82),0_0_30px_rgba(250,204,21,0.42)]"
          style={{ clipPath: hexClipPath }}
        />
        <div
          className="pointer-events-none absolute inset-[5px] border border-white/40"
          style={{ clipPath: hexClipPath }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.48),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(254,240,138,0.28),transparent_24%),radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_46%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className={cn("space-y-2", isMobileCompact && "space-y-1.5")}>
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  "uppercase text-slate-900/58",
                  isMobileCompact
                    ? "text-[0.46rem] tracking-[0.16em]"
                    : "text-[0.54rem] tracking-[0.22em] sm:text-[0.62rem] sm:tracking-[0.3em]",
                )}
              >
                {eyebrow}
              </p>
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-full border border-black/8 bg-white/18 font-semibold uppercase text-slate-950/78",
                  isMobileCompact
                    ? "px-1.5 py-0.5 text-[0.42rem] tracking-[0.12em]"
                    : "px-2 py-0.5 text-[0.48rem] tracking-[0.18em] sm:px-2.5 sm:py-1 sm:text-[0.56rem] sm:tracking-[0.22em]",
                )}
              >
                {memberState}
              </span>
            </div>
            <p
              className={cn(
                "font-semibold tracking-tight text-center text-slate-950",
                isMobileCompact
                  ? "line-clamp-1 text-[0.74rem] leading-4.5"
                  : "line-clamp-2 text-[0.95rem] leading-5 sm:line-clamp-3 sm:text-[1.22rem] sm:leading-7",
              )}
            >
              {title}
            </p>
          </div>
          <div className={cn("space-y-2 sm:space-y-3", isMobileCompact && "space-y-1.5")}>
            <p
              className={cn(
                "font-medium text-slate-950/78 text-center",
                isMobileCompact ? "text-[0.56rem]" : "text-[0.75rem] sm:text-[0.92rem]",
              )}
            >
              {subtitle}
            </p>
            <p
              className={cn(
                "text-slate-950/72 text-center",
                isMobileCompact
                  ? "line-clamp-2 text-[0.5rem] leading-4"
                  : "line-clamp-3 text-[0.66rem] leading-4 sm:line-clamp-4 sm:text-[0.84rem] sm:leading-5",
              )}
            >
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
  const [isMobileCompact, setIsMobileCompact] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const sync = () => {
      setIsMobileCompact(mediaQuery.matches);
    };

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

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
  const boardKey = `${focusedEmail ?? rootEmail ?? "root"}-${slotMembers
    .map((member) => member?.email ?? "empty")
    .join("|")}`;
  const slotConnectionPoints = [
    { x: 50, y: 26 },
    { x: 68, y: 39 },
    { x: 68, y: 61 },
    { x: 50, y: 74 },
    { x: 32, y: 61 },
    { x: 32, y: 39 },
  ] as const;
  const slotAnchorPoints = isMobileCompact ? mobileSlotPositions : desktopSlotPositions;
  const canStepUp = !isRootFocus && Boolean(parentFocusEmail);

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

      <main className="mx-auto flex min-h-screen w-full max-w-[110rem] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="glass-card sticky top-[calc(env(safe-area-inset-top)+0.65rem)] z-30 -mx-4 rounded-none border-x-0 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[24px] lg:border-x lg:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
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
              <p className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                {copy.hexView}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                {formatEmailLabel(boardTitle)}
              </p>
            </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <ConnectionStatusChip labels={dictionary.common.status} status={status} />
              </div>
              <button
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 sm:size-11"
                disabled={isRootFocus}
                onClick={() => {
                  if (rootEmail) {
                    setFocusedEmail(rootEmail);
                  }
                }}
                title={copy.backToRoot}
                type="button"
              >
                <Hexagon className="size-4" />
              </button>
              <button
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 sm:size-11"
                disabled={isRootFocus || !parentFocusEmail}
                onClick={() => {
                  if (parentFocusEmail) {
                    setFocusedEmail(parentFocusEmail);
                  }
                }}
                title={copy.stepUp}
                type="button"
              >
                <ChevronUp className="size-4" />
              </button>
              <Link
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-800 sm:size-11"
                href={listViewHref}
                title={copy.openList}
              >
                <GitBranch className="size-4" />
              </Link>
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
          <section className="relative flex min-h-[calc(100vh-6.8rem)] flex-1 items-center justify-center overflow-hidden rounded-[34px] border border-amber-950/70 bg-[linear-gradient(180deg,#0d0803_0%,#1d1206_26%,#311b08_56%,#47230b_100%)] shadow-[0_34px_100px_rgba(67,20,7,0.42)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.18),transparent_22%),radial-gradient(circle_at_18%_16%,rgba(254,240,138,0.12),transparent_16%),radial-gradient(circle_at_86%_18%,rgba(245,158,11,0.12),transparent_20%),radial-gradient(circle_at_82%_80%,rgba(251,191,36,0.15),transparent_24%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,251,235,0.08),transparent)]" />
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,244,214,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,244,214,0.05)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]" />

            <div className="absolute inset-x-4 top-4 z-10 hidden items-start justify-between gap-3 sm:inset-x-6 sm:top-6 sm:flex">
              <div className="max-w-[14rem] rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 shadow-[0_16px_45px_rgba(15,23,42,0.24)] backdrop-blur">
                <p className="text-[0.6rem] uppercase tracking-[0.28em] text-white/52">
                  {copy.hexView}
                </p>
                <p className="mt-2 text-sm font-semibold text-white sm:text-base">
                  {formatEmailLabel(boardTitle)}
                </p>
                <p className="mt-2 text-[0.72rem] leading-5 text-white/56 sm:text-xs">
                  {copy.boardHint}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "relative mx-auto w-full animate-[hex-board-enter_540ms_cubic-bezier(0.16,1,0.3,1)]",
                isMobileCompact
                  ? "h-[34rem] max-w-[21.75rem]"
                  : "aspect-square max-w-[25.25rem] sm:max-w-[33rem] lg:max-w-[46rem] xl:max-w-[52rem]",
              )}
              key={boardKey}
            >
              <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2 sm:hidden">
                <button
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/18 bg-black/18 px-3 py-1.5 text-[0.62rem] font-semibold text-amber-50/82 shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur transition hover:border-amber-100/35 hover:bg-black/24 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canStepUp}
                  onClick={() => {
                    if (parentFocusEmail) {
                      setFocusedEmail(parentFocusEmail);
                    }
                  }}
                  type="button"
                >
                  <ChevronUp className="size-3.5" />
                  {copy.stepUp}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/18 bg-black/18 px-3 py-1.5 text-[0.62rem] font-semibold text-amber-50/82 shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur transition hover:border-amber-100/35 hover:bg-black/24 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isRootFocus}
                  onClick={() => {
                    if (rootEmail) {
                      setFocusedEmail(rootEmail);
                    }
                  }}
                  type="button"
                >
                  <Hexagon className="size-3.5" />
                  {copy.backToRoot}
                </button>
              </div>

              <svg
                className={cn(
                  "pointer-events-none absolute inset-0 h-full w-full",
                  isMobileCompact && "opacity-35",
                )}
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="hex-link-gradient" x1="20%" x2="80%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(254,240,138,0.9)" />
                    <stop offset="50%" stopColor="rgba(251,191,36,0.98)" />
                    <stop offset="100%" stopColor="rgba(245,158,11,0.84)" />
                  </linearGradient>
                </defs>
                {slotConnectionPoints.map((point, index) => {
                  const occupied = Boolean(slotMembers[index]);

                  return (
                    <g
                      className={cn(
                        "origin-center",
                        occupied
                          ? "animate-[hex-link-glow_2.8s_ease-in-out_infinite]"
                          : "opacity-28",
                      )}
                      key={`link-${index}`}
                    >
                      <line
                        stroke="url(#hex-link-gradient)"
                        strokeDasharray={occupied ? "2 0" : "2.6 2.6"}
                        strokeLinecap="round"
                        strokeOpacity={occupied ? 0.78 : 0.16}
                        strokeWidth={occupied ? 0.56 : 0.32}
                        x1="50"
                        x2={String(point.x)}
                        y1="50"
                        y2={String(point.y)}
                      />
                    </g>
                  );
                })}
              </svg>

              {slotMembers.map((member, slotIndex) => (
                <HexTile
                  accent={member ? "node" : "empty"}
                  badge={`${copy.slot} ${slotIndex + 1}`}
                  body={
                    member
                      ? isMobileCompact
                        ? `${formatInteger(member.lifetimePoints, locale)}P`
                        : `${formatInteger(member.lifetimePoints, locale)}P · ${getMembershipCardLabel(locale, member.membershipCardTier)}`
                      : copy.emptySlot
                  }
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2",
                    isMobileCompact
                      ? "animate-[hex-node-float_5.2s_ease-in-out_infinite]"
                      : "animate-[hex-node-float_5.2s_ease-in-out_infinite]",
                  )}
                  depthLabel={
                    member
                      ? isMobileCompact
                        ? `Lv ${member.depth}`
                        : `${dictionary.activateNetworkPage.labels.level} ${member.depth}`
                      : null
                  }
                  interactive={Boolean(member)}
                  isMobileCompact={isMobileCompact}
                  key={`slot-${slotIndex + 1}`}
                  onClick={
                    member
                      ? () => {
                          setFocusedEmail(member.email);
                        }
                      : undefined
                  }
                  subtitle={
                    member
                      ? isMobileCompact
                        ? `${getMemberStatusLabel(dictionary, member.status)} · ${getTierLabel(locale, member.tier)}`
                        : `${getMemberStatusLabel(dictionary, member.status)} · ${getTierLabel(locale, member.tier)}`
                      : null
                  }
                  title={
                    member
                      ? formatHexMemberLabel(member.email, isMobileCompact)
                      : copy.emptySlot
                  }
                  style={{
                    left: slotAnchorPoints[slotIndex].left,
                    top: slotAnchorPoints[slotIndex].top,
                  }}
                />
              ))}

              <HexCenterTile
                body={
                  isMobileCompact
                    ? isRootFocus || !focusedNode
                      ? `${formatInteger(state.summary.directMembers, locale)} 직속 · ${formatInteger(state.summary.totalMembers, locale)} 전체`
                      : `${formatInteger(focusedNode.directReferralCount, locale)} 직속 · ${formatInteger(focusedNode.totalReferralCount, locale)} 하위`
                    : boardBody
                }
                eyebrow={
                  isRootFocus
                    ? copy.focusRoot
                    : dictionary.activateNetworkPage.labels.currentMember
                }
                isMobileCompact={isMobileCompact}
                memberState={
                  isRootFocus || !focusedNode
                    ? getMemberStatusLabel(dictionary, state.member.status)
                    : getMemberStatusLabel(dictionary, focusedNode.status)
                }
                subtitle={
                  isMobileCompact
                    ? isRootFocus
                      ? copy.focusRoot
                      : `${dictionary.activateNetworkPage.labels.level} ${focusDepth}`
                    : boardSubtitle
                }
                title={formatHexMemberLabel(boardTitle, isMobileCompact)}
              />

              <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-6 sm:bottom-6">
                <div className="rounded-[24px] border border-white/10 bg-black/18 px-3 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:px-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-amber-100/78 sm:text-[0.66rem]">
                      {copy.slotJump}
                    </p>
                    {canStepUp ? (
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200/20 bg-white/10 px-2.5 py-1 text-[0.58rem] font-medium text-amber-50/80 transition hover:border-amber-200/35 hover:bg-white/16"
                        onClick={() => {
                          if (parentFocusEmail) {
                            setFocusedEmail(parentFocusEmail);
                          }
                        }}
                        type="button"
                      >
                        <ChevronUp className="size-3" />
                        {copy.stepUp}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {slotMembers.map((member, index) => (
                      <button
                        className={cn(
                          "rounded-2xl border px-2 py-2 text-left transition",
                          member
                            ? "border-amber-200/20 bg-[linear-gradient(145deg,rgba(251,191,36,0.18),rgba(120,53,15,0.16))] text-amber-50 shadow-[0_12px_26px_rgba(120,53,15,0.16)] hover:-translate-y-0.5 hover:border-amber-100/45 hover:bg-[linear-gradient(145deg,rgba(251,191,36,0.3),rgba(120,53,15,0.26))]"
                            : "border-white/8 bg-white/6 text-white/40",
                        )}
                        disabled={!member}
                        key={`slot-jump-${index + 1}`}
                        onClick={() => {
                          if (member) {
                            setFocusedEmail(member.email);
                          }
                        }}
                        type="button"
                      >
                        <p className="text-[0.48rem] uppercase tracking-[0.18em] text-current/72">
                          {copy.slot} {index + 1}
                        </p>
                        <p className="mt-1 truncate text-[0.64rem] font-semibold">
                          {member
                            ? formatHexMemberLabel(member.email, true)
                            : copy.slotMoveEmpty}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
