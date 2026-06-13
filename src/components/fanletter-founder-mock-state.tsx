"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  GitBranch,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import type { FunnelEventMetadata } from "@/lib/funnel";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { Locale } from "@/lib/i18n";

const FANLETTER_FOUNDER_MOCK_MEMBERSHIPS_STORAGE_KEY =
  "fanletter:v2:mock-founder-memberships";
const FANLETTER_FOUNDER_MOCK_MEMBERSHIP_EVENT =
  "fanletter:mock-founder-membership-change";

export type FanletterFounderMockMembership = {
  joinedAt: string;
  joinMode?: "live" | "mock" | "preview";
  joinState?: "created" | "existing";
  placement?: FanletterFounderMockPlacement | null;
  referralCode: string | null;
  role?: string | null;
  source: "direct" | "referral";
  starId: string;
  status: "founder";
};

type StoredFounderMockMemberships = Record<
  string,
  FanletterFounderMockMembership
>;

type FanletterFounderMockPlacement = {
  depth: number | null;
  parentMemberEmail: string | null;
  role: string | null;
  rootResolved: boolean;
  source: "computed" | "direct" | "preview";
  uplineMemberEmails: string[];
};

type FanletterFounderMockJoinResponse = {
  membership: FanletterFounderMockMembership;
  mode: "live" | "mock" | "preview";
  next: {
    founderClubHref: string;
    universeHref: string;
  };
  placement?: FanletterFounderMockPlacement | null;
  runtime?: {
    blockedReasons?: string[];
  };
  rewards: {
    cp: number;
    creatorProgressPercent: number;
    influenceScore: number;
  };
  star: {
    id: string;
    name: string;
    universeName: string;
  };
};

function isPlacement(value: unknown): value is FanletterFounderMockPlacement {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FanletterFounderMockPlacement>;

  return (
    (typeof candidate.depth === "number" || candidate.depth === null) &&
    (typeof candidate.parentMemberEmail === "string" ||
      candidate.parentMemberEmail === null) &&
    (typeof candidate.role === "string" || candidate.role === null) &&
    typeof candidate.rootResolved === "boolean" &&
    (candidate.source === "computed" ||
      candidate.source === "direct" ||
      candidate.source === "preview") &&
    Array.isArray(candidate.uplineMemberEmails) &&
    candidate.uplineMemberEmails.every((email) => typeof email === "string")
  );
}

function isMembership(value: unknown): value is FanletterFounderMockMembership {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FanletterFounderMockMembership>;

  return (
    typeof candidate.joinedAt === "string" &&
    (candidate.joinMode === undefined ||
      candidate.joinMode === "live" ||
      candidate.joinMode === "mock" ||
      candidate.joinMode === "preview") &&
    (candidate.joinState === undefined ||
      candidate.joinState === "created" ||
      candidate.joinState === "existing") &&
    (candidate.placement === undefined ||
      candidate.placement === null ||
      isPlacement(candidate.placement)) &&
    (typeof candidate.referralCode === "string" ||
      candidate.referralCode === null) &&
    (candidate.role === undefined ||
      typeof candidate.role === "string" ||
      candidate.role === null) &&
    (candidate.source === "direct" || candidate.source === "referral") &&
    typeof candidate.starId === "string" &&
    candidate.status === "founder"
  );
}

function readStoredFounderMemberships() {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(
    FANLETTER_FOUNDER_MOCK_MEMBERSHIPS_STORAGE_KEY,
  );

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<StoredFounderMockMemberships>(
      (memberships, [starId, membership]) => {
        if (isMembership(membership) && membership.starId === starId) {
          memberships[starId] = membership;
        }

        return memberships;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeStoredFounderMemberships(
  memberships: StoredFounderMockMemberships,
) {
  window.localStorage.setItem(
    FANLETTER_FOUNDER_MOCK_MEMBERSHIPS_STORAGE_KEY,
    JSON.stringify(memberships),
  );
}

function dispatchFounderMembershipChange(
  membership: FanletterFounderMockMembership,
) {
  window.dispatchEvent(
    new CustomEvent(FANLETTER_FOUNDER_MOCK_MEMBERSHIP_EVENT, {
      detail: membership,
    }),
  );
}

export function getFanletterFounderMockMembership(starId: string | null) {
  if (!starId) {
    return null;
  }

  return readStoredFounderMemberships()[starId] ?? null;
}

export function getFanletterFounderMockMemberships() {
  return readStoredFounderMemberships();
}

export function recordFanletterFounderMockMembership({
  joinedAt,
  joinMode,
  joinState,
  placement,
  referralCode,
  role,
  source,
  starId,
}: {
  joinedAt?: string | null;
  joinMode?: FanletterFounderMockMembership["joinMode"];
  joinState?: FanletterFounderMockMembership["joinState"];
  placement?: FanletterFounderMockPlacement | null;
  referralCode?: string | null;
  role?: string | null;
  source?: FanletterFounderMockMembership["source"];
  starId: string;
}) {
  if (typeof window === "undefined") {
    return null;
  }

  const normalizedReferralCode = referralCode?.trim() || null;
  const memberships = readStoredFounderMemberships();
  const existingMembership = memberships[starId] ?? null;
  const membership: FanletterFounderMockMembership = {
    joinedAt: existingMembership?.joinedAt ?? joinedAt ?? new Date().toISOString(),
    joinMode: joinMode ?? existingMembership?.joinMode,
    joinState: joinState ?? existingMembership?.joinState,
    placement: placement ?? existingMembership?.placement ?? null,
    referralCode:
      normalizedReferralCode ?? existingMembership?.referralCode ?? null,
    role: role ?? existingMembership?.role ?? placement?.role ?? null,
    source:
      source ??
      (normalizedReferralCode || existingMembership?.source === "referral"
        ? "referral"
        : "direct"),
    starId,
    status: "founder",
  };

  memberships[starId] = membership;
  writeStoredFounderMemberships(memberships);
  dispatchFounderMembershipChange(membership);

  return membership;
}

type FanletterFounderJoinMode = "live" | "preview";

class FanletterFounderJoinRequestError extends Error {
  data: unknown;
  status: number;

  constructor({
    data,
    message,
    status,
  }: {
    data: unknown;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "FanletterFounderJoinRequestError";
    this.data = data;
    this.status = status;
  }
}

function isLiveModeDisabledError(error: unknown) {
  if (!(error instanceof FanletterFounderJoinRequestError)) {
    return false;
  }

  if (error.status !== 409) {
    return false;
  }

  const data = error.data as
    | { runtime?: { blockedReasons?: string[] } }
    | null
    | undefined;

  return Boolean(
    data?.runtime?.blockedReasons?.includes("founder_join_live_flag_disabled"),
  );
}

function resolveLocalUniverseHref({
  fallbackHref,
  response,
  useResponseUniverseHref,
}: {
  fallbackHref: string;
  response: FanletterFounderMockJoinResponse;
  useResponseUniverseHref: boolean;
}) {
  if (!useResponseUniverseHref) {
    return fallbackHref;
  }

  try {
    const url = new URL(response.next.universeHref);

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return response.next.universeHref || fallbackHref;
  }
}

async function requestFanletterFounderJoin({
  locale,
  mode,
  referralCode,
  starId,
}: {
  locale: Locale;
  mode: FanletterFounderJoinMode;
  referralCode?: string | null;
  starId: string;
}) {
  const response = await fetch("/api/fanletter/founder-club/join", {
    body: JSON.stringify({
      locale,
      mode,
      referralCode,
      starId,
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as
    | FanletterFounderMockJoinResponse
    | { error?: string }
    | null;

  if (!response.ok || !data || !("membership" in data)) {
    throw new FanletterFounderJoinRequestError({
      data,
      message:
        data && "error" in data && data.error
          ? data.error
          : "Failed to process Founder join.",
      status: response.status,
    });
  }

  return data;
}

export function useFanletterFounderMockMembership(starId: string | null) {
  const [membership, setMembership] =
    useState<FanletterFounderMockMembership | null>(null);

  useEffect(() => {
    function refreshMembership() {
      setMembership(getFanletterFounderMockMembership(starId));
    }

    refreshMembership();

    function handleStorage(event: StorageEvent) {
      if (
        event.key === FANLETTER_FOUNDER_MOCK_MEMBERSHIPS_STORAGE_KEY ||
        event.key === null
      ) {
        refreshMembership();
      }
    }

    function handleMembershipChange() {
      refreshMembership();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      FANLETTER_FOUNDER_MOCK_MEMBERSHIP_EVENT,
      handleMembershipChange,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        FANLETTER_FOUNDER_MOCK_MEMBERSHIP_EVENT,
        handleMembershipChange,
      );
    };
  }, [starId]);

  return membership;
}

export function useFanletterFounderMockMemberships() {
  const [memberships, setMemberships] =
    useState<StoredFounderMockMemberships>({});

  useEffect(() => {
    function refreshMemberships() {
      setMemberships(getFanletterFounderMockMemberships());
    }

    refreshMemberships();

    function handleStorage(event: StorageEvent) {
      if (
        event.key === FANLETTER_FOUNDER_MOCK_MEMBERSHIPS_STORAGE_KEY ||
        event.key === null
      ) {
        refreshMemberships();
      }
    }

    function handleMembershipChange() {
      refreshMemberships();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      FANLETTER_FOUNDER_MOCK_MEMBERSHIP_EVENT,
      handleMembershipChange,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        FANLETTER_FOUNDER_MOCK_MEMBERSHIP_EVENT,
        handleMembershipChange,
      );
    };
  }, []);

  return memberships;
}

export function FanletterFounderJoinLink({
  agentRank,
  children,
  className,
  href,
  locale,
  mode = "live",
  referralCode,
  starId,
  trackingMetadata,
  useResponseUniverseHref = false,
}: {
  agentRank?: AgentRankInteractionSignal | null;
  children: ReactNode;
  className?: string;
  href: string;
  locale: Locale;
  mode?: FanletterFounderJoinMode;
  referralCode?: string | null;
  starId: string;
  trackingMetadata?: FunnelEventMetadata;
  useResponseUniverseHref?: boolean;
}) {
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.currentTarget.target
      ) {
        return;
      }

      event.preventDefault();

      const nextHref = event.currentTarget.href;

      async function recordJoinResponse(response: FanletterFounderMockJoinResponse) {
        const universeHref = resolveLocalUniverseHref({
          fallbackHref: nextHref,
          response,
          useResponseUniverseHref,
        });

        recordFanletterFounderMockMembership({
          joinedAt: response.membership.joinedAt,
          joinMode: response.mode,
          joinState: response.membership.joinState,
          placement: response.placement,
          referralCode: response.membership.referralCode,
          role: response.membership.role,
          source: response.membership.source,
          starId: response.membership.starId,
        });

        trackFunnelEvent("signup_cta_click", {
          agentRank,
          metadata: {
            ...trackingMetadata,
            founderJoinMode: response.mode,
            founderJoinState: response.membership.joinState ?? null,
            founderPlacementDepth: response.placement?.depth ?? null,
            founderPlacementRole: response.placement?.role ?? null,
            founderPlacementSource: response.placement?.source ?? null,
          },
          referralCode: response.membership.referralCode ?? referralCode,
          targetHref: universeHref,
        });

        window.location.assign(universeHref);
      }

      async function completeJoin() {
        try {
          const response = await requestFanletterFounderJoin({
            locale,
            mode,
            referralCode,
            starId,
          });

          await recordJoinResponse(response);
          return;
        } catch (error) {
          if (
            mode === "live" &&
            error instanceof FanletterFounderJoinRequestError &&
            error.status === 401
          ) {
            window.location.assign(nextHref);
            return;
          }

          if (mode === "live" && isLiveModeDisabledError(error)) {
            const preview = await requestFanletterFounderJoin({
              locale,
              mode: "preview",
              referralCode,
              starId,
            });

            await recordJoinResponse(preview);
            return;
          }

          if (mode === "live") {
            window.alert(
              error instanceof Error
                ? error.message
                : "Founder join could not be completed.",
            );
            return;
          }

          recordFanletterFounderMockMembership({
            referralCode,
            starId,
          });
          trackFunnelEvent("signup_cta_click", {
            agentRank,
            metadata: {
              ...trackingMetadata,
              founderJoinMode: "local_mock",
            },
            referralCode,
            targetHref: nextHref,
          });
        }

        window.location.assign(nextHref);
      }

      void completeJoin();
    },
    [
      agentRank,
      locale,
      mode,
      referralCode,
      starId,
      trackingMetadata,
      useResponseUniverseHref,
    ],
  );

  return (
    <Link className={className} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}

export function FanletterFounderMockJoinLink(
  props: Omit<
    Parameters<typeof FanletterFounderJoinLink>[0],
    "mode" | "useResponseUniverseHref"
  >,
) {
  return <FanletterFounderJoinLink {...props} mode="preview" />;
}

function getPlacementRoleLabel(role: string | null, locale: Locale) {
  const roleLabels: Record<string, Partial<Record<Locale, string>>> = {
    creator: {
      en: "Creator",
      ja: "クリエイター",
      ko: "크리에이터",
    },
    founder: {
      en: "Founder",
      ja: "Founder",
      ko: "파운더",
    },
    genesis_founder: {
      en: "Genesis Founder",
      ja: "Genesis Founder",
      ko: "제네시스 파운더",
    },
    legend: {
      en: "Legend",
      ja: "Legend",
      ko: "레전드",
    },
    mentor: {
      en: "Mentor",
      ja: "Mentor",
      ko: "멘토",
    },
    partner: {
      en: "Partner",
      ja: "Partner",
      ko: "파트너",
    },
    producer: {
      en: "Producer",
      ja: "Producer",
      ko: "프로듀서",
    },
  };

  return role ? roleLabels[role]?.[locale] ?? roleLabels[role]?.en ?? role : null;
}

function getMemberHandle(email: string) {
  return email.split("@")[0]?.trim() || email;
}

function getEstimatedDepthPrefix(locale: Locale) {
  if (locale === "ko") {
    return "예상 ";
  }

  if (locale === "ja") {
    return "予想 ";
  }

  return "Est. ";
}

function getJoinStatusLabel(
  membership: FanletterFounderMockMembership,
  locale: Locale,
) {
  if (membership.joinMode === "live") {
    return locale === "ko"
      ? "Founder 활성"
      : locale === "ja"
        ? "Founder有効"
        : "Founder active";
  }

  return locale === "ko"
    ? "Preview 저장"
    : locale === "ja"
      ? "Preview保存"
      : "Preview saved";
}

function getPlacementFallbackLabel(locale: Locale) {
  return locale === "ko"
    ? "배치 확인 전"
    : locale === "ja"
      ? "配置確認前"
      : "Placement pending";
}

function getParentFallbackLabel({
  locale,
  placement,
}: {
  locale: Locale;
  placement: FanletterFounderMockPlacement | null;
}) {
  if (placement?.rootResolved) {
    return locale === "ko"
      ? "AI 스타 Creator"
      : locale === "ja"
        ? "AI Star Creator"
        : "AI Star Creator";
  }

  return locale === "ko"
    ? "확인 중"
    : locale === "ja"
      ? "確認中"
      : "Checking";
}

export function FanletterFounderMockStatusBanner({
  className,
  locale,
  starId,
  starName,
}: {
  className?: string;
  locale: Locale;
  starId: string;
  starName: string;
}) {
  const membership = useFanletterFounderMockMembership(starId);

  if (!membership) {
    return null;
  }

  const joinedAtLabel = new Intl.DateTimeFormat(
    locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(membership.joinedAt));
  const title =
    locale === "ko"
      ? `${starName} Founder 배치 완료`
      : locale === "ja"
        ? `${starName} Founder配置完了`
        : `${starName} Founder placement complete`;
  const isLiveJoin = membership.joinMode === "live";
  const body =
    locale === "ko"
      ? isLiveJoin
        ? "Founder 참여가 완료되었습니다. 내 네트워크 위치와 추천 코드를 확인하고 다음 Founder를 초대하세요."
        : "이 브라우저에서 Founder 참여 미리보기가 저장되었습니다. 네트워크 위치와 추천 링크 흐름을 계속 확인할 수 있습니다."
      : locale === "ja"
        ? isLiveJoin
          ? "Founder参加が完了しました。ネットワーク上の位置と紹介コードを確認し、次のFounderを招待してください。"
          : "このブラウザにFounder参加プレビューを保存しました。配置と紹介リンクの流れを確認できます。"
        : isLiveJoin
          ? "Founder join is complete. Review your network position and invite the next Founder."
          : "Founder join preview is saved in this browser. Continue reviewing placement and referral flow.";
  const codeLabel =
    locale === "ko" ? "추천 코드" : locale === "ja" ? "紹介コード" : "Referral";
  const dateLabel =
    locale === "ko" ? "참여일" : locale === "ja" ? "参加日" : "Joined";
  const placement = membership.placement ?? null;
  const placementDepthLabel =
    placement && placement.depth !== null
      ? `${placement.rootResolved ? "" : getEstimatedDepthPrefix(locale)}L${
          placement.depth
        }`
      : null;
  const placementRoleLabel = getPlacementRoleLabel(
    placement?.role ?? null,
    locale,
  );
  const placementValue = placementDepthLabel
    ? `${placementDepthLabel}${placementRoleLabel ? ` / ${placementRoleLabel}` : ""}`
    : getPlacementFallbackLabel(locale);
  const parentValue = placement?.parentMemberEmail
    ? getMemberHandle(placement.parentMemberEmail)
    : getParentFallbackLabel({ locale, placement });
  const statusLabel = getJoinStatusLabel(membership, locale);
  const networkLabel =
    locale === "ko"
      ? "파운더 네트워크"
      : locale === "ja"
        ? "Founder Network"
        : "Founder Network";
  const parentLabel =
    locale === "ko" ? "상위 멤버" : locale === "ja" ? "上位メンバー" : "Parent";
  const referralMetricLabel =
    locale === "ko" ? "내 추천 코드" : locale === "ja" ? "紹介コード" : "Referral";
  const nextRewardLabel =
    locale === "ko" ? "다음 초대 보상" : locale === "ja" ? "次の招待報酬" : "Next invite";
  const nextRewardValue =
    locale === "ko"
      ? "CP +100 / 영향력 +5"
      : locale === "ja"
        ? "CP +100 / 影響力 +5"
        : "CP +100 / Influence +5";
  const universeHref = `/${locale}/fanletter/${encodeURIComponent(
    starId,
  )}/universe`;
  const starHref = `/${locale}/fanletter/${encodeURIComponent(starId)}${
    membership.referralCode
      ? `?ref=${encodeURIComponent(membership.referralCode)}`
      : ""
  }`;
  const shareHref = `${starHref}#referral-builder`;
  const creatorUnlockHref = `/${locale}/fanletter/creator-unlock`;
  const flowLabels =
    locale === "ko"
      ? ["AI 스타", "내 Founder 위치", "추천 공유"]
      : locale === "ja"
        ? ["AI Star", "自分のFounder位置", "紹介共有"]
        : ["AI Star", "My Founder slot", "Share referral"];
  const actionLabels =
    locale === "ko"
      ? {
          creator: "Creator 진행률",
          network: "네트워크 보기",
          share: "추천 링크 공유",
        }
      : locale === "ja"
        ? {
            creator: "Creator進捗",
            network: "Networkを見る",
            share: "紹介リンク共有",
          }
        : {
            creator: "Creator progress",
            network: "View network",
            share: "Share referral",
          };
  const metricItems = [
    {
      icon: Crown,
      label: networkLabel,
      value: placementValue,
    },
    {
      icon: GitBranch,
      label: parentLabel,
      value: parentValue,
    },
    {
      icon: Share2,
      label: referralMetricLabel,
      mono: true,
      value: membership.referralCode ?? "-",
    },
    {
      icon: Sparkles,
      label: nextRewardLabel,
      value: nextRewardValue,
    },
  ];

  return (
    <div
      className={[
        "mx-auto max-w-6xl overflow-hidden rounded-[1.35rem] border border-violet-100 bg-white text-[#12041f] shadow-[0_24px_70px_rgba(88,28,135,0.12)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold leading-tight sm:text-lg">
                  {title}
                </p>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-5 text-black/58">
                {body}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {metricItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="min-w-0 rounded-2xl border border-violet-100 bg-[#fbfaff] p-3"
                  key={item.label}
                >
                  <div className="flex items-center gap-2 text-[0.72rem] font-semibold text-[#6d5a7f]">
                    <Icon className="size-3.5 shrink-0 text-[#7c3aed]" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <p
                    className={[
                      "mt-2 truncate text-sm font-semibold text-[#12041f]",
                      item.mono ? "font-mono" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-violet-100 bg-white px-3 py-1 text-xs font-semibold text-[#5b21b6]">
              {dateLabel}: {joinedAtLabel}
            </span>
            {membership.referralCode ? (
              <span className="rounded-full border border-violet-100 bg-white px-3 py-1 font-mono text-xs font-semibold text-[#5b21b6]">
                {codeLabel}: {membership.referralCode}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-[13rem] gap-2 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-emerald-50 p-3">
          {flowLabels.map((label, index) => (
            <div className="flex items-center gap-2" key={label}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#7c3aed] shadow-sm">
                {index + 1}
              </span>
              <span className="text-sm font-semibold text-[#12041f]">
                {label}
              </span>
              {index < flowLabels.length - 1 ? (
                <ArrowRight className="ml-auto size-4 text-[#7c3aed]" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-violet-100 bg-[#fbfaff] p-4 sm:flex-row sm:p-5">
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,58,237,0.2)] transition hover:bg-[#6d28d9]"
          href={universeHref}
        >
          <GitBranch className="size-4" />
          {actionLabels.network}
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-[#5b21b6] transition hover:border-violet-300 hover:bg-violet-50"
          href={shareHref}
        >
          <Share2 className="size-4" />
          {actionLabels.share}
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
          href={creatorUnlockHref}
        >
          <Sparkles className="size-4" />
          {actionLabels.creator}
        </Link>
      </div>
    </div>
  );
}
