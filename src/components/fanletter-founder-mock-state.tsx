"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import type { Locale } from "@/lib/i18n";

const FANLETTER_FOUNDER_MOCK_MEMBERSHIPS_STORAGE_KEY =
  "fanletter:v2:mock-founder-memberships";
const FANLETTER_FOUNDER_MOCK_MEMBERSHIP_EVENT =
  "fanletter:mock-founder-membership-change";

export type FanletterFounderMockMembership = {
  joinedAt: string;
  joinState?: "created" | "existing";
  placement?: FanletterFounderMockPlacement | null;
  referralCode: string | null;
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
    (candidate.joinState === undefined ||
      candidate.joinState === "created" ||
      candidate.joinState === "existing") &&
    (candidate.placement === undefined ||
      candidate.placement === null ||
      isPlacement(candidate.placement)) &&
    (typeof candidate.referralCode === "string" ||
      candidate.referralCode === null) &&
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
  joinState,
  placement,
  referralCode,
  source,
  starId,
}: {
  joinedAt?: string | null;
  joinState?: FanletterFounderMockMembership["joinState"];
  placement?: FanletterFounderMockPlacement | null;
  referralCode?: string | null;
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
    joinState: joinState ?? existingMembership?.joinState,
    placement: placement ?? existingMembership?.placement ?? null,
    referralCode:
      normalizedReferralCode ?? existingMembership?.referralCode ?? null,
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
  children,
  className,
  href,
  locale,
  mode = "live",
  referralCode,
  starId,
  useResponseUniverseHref = false,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  locale: Locale;
  mode?: FanletterFounderJoinMode;
  referralCode?: string | null;
  starId: string;
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
        recordFanletterFounderMockMembership({
          joinedAt: response.membership.joinedAt,
          joinState: response.membership.joinState,
          placement: response.placement,
          referralCode: response.membership.referralCode,
          source: response.membership.source,
          starId: response.membership.starId,
        });

        window.location.assign(
          resolveLocalUniverseHref({
            fallbackHref: nextHref,
            response,
            useResponseUniverseHref,
          }),
        );
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
        }

        window.location.assign(nextHref);
      }

      void completeJoin();
    },
    [locale, mode, referralCode, starId, useResponseUniverseHref],
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
      ? `${starName} Founder 참여 완료`
      : locale === "ja"
        ? `${starName} Founder参加完了`
        : `${starName} Founder join complete`;
  const body =
    locale === "ko"
      ? "이 브라우저에서 mock Founder 참여 상태가 저장되었습니다. 추천 링크 공유와 Creator 진행률 미리보기를 계속 확인할 수 있습니다."
      : locale === "ja"
        ? "このブラウザにmock Founder参加状態を保存しました。紹介リンク共有とCreator進捗のプレビューを続けられます。"
        : "Mock Founder status is saved in this browser. Continue previewing referral sharing and Creator progress.";
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
  const networkLabel =
    locale === "ko"
      ? "파운더 네트워크"
      : locale === "ja"
        ? "Founder Network"
        : "Founder Network";
  const parentLabel =
    locale === "ko" ? "상위 멤버" : locale === "ja" ? "上位メンバー" : "Parent";

  return (
    <div
      className={[
        "mx-auto max-w-6xl rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-[0_18px_44px_rgba(16,185,129,0.12)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight">{title}</p>
          <p className="mt-1 text-sm font-medium leading-5 text-emerald-900/72">
            {body}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {membership.referralCode ? (
              <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-semibold text-emerald-900">
                {codeLabel}: {membership.referralCode}
              </span>
            ) : null}
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-900">
              {dateLabel}: {joinedAtLabel}
            </span>
            {placementDepthLabel ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-900">
                {networkLabel}: {placementDepthLabel}
                {placementRoleLabel ? ` · ${placementRoleLabel}` : ""}
              </span>
            ) : null}
            {placement?.parentMemberEmail ? (
              <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-semibold text-emerald-900">
                {parentLabel}: {getMemberHandle(placement.parentMemberEmail)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
