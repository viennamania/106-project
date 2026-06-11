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
  referralCode: string | null;
  source: "direct" | "referral";
  starId: string;
  status: "founder";
};

type StoredFounderMockMemberships = Record<
  string,
  FanletterFounderMockMembership
>;

type FanletterFounderMockJoinResponse = {
  membership: FanletterFounderMockMembership;
  mode: "mock";
  next: {
    founderClubHref: string;
    universeHref: string;
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

function isMembership(value: unknown): value is FanletterFounderMockMembership {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FanletterFounderMockMembership>;

  return (
    typeof candidate.joinedAt === "string" &&
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
  referralCode,
  source,
  starId,
}: {
  joinedAt?: string | null;
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

async function requestFanletterFounderMockJoin({
  locale,
  referralCode,
  starId,
}: {
  locale: Locale;
  referralCode?: string | null;
  starId: string;
}) {
  const response = await fetch("/api/fanletter/founder-club/mock-join", {
    body: JSON.stringify({
      locale,
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
    throw new Error(
      data && "error" in data && data.error
        ? data.error
        : "Failed to preview Founder join.",
    );
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

export function FanletterFounderMockJoinLink({
  children,
  className,
  href,
  locale,
  referralCode,
  starId,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  locale: Locale;
  referralCode?: string | null;
  starId: string;
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

      async function completeMockJoin() {
        try {
          const preview = await requestFanletterFounderMockJoin({
            locale,
            referralCode,
            starId,
          });

          recordFanletterFounderMockMembership({
            joinedAt: preview.membership.joinedAt,
            referralCode: preview.membership.referralCode,
            source: preview.membership.source,
            starId: preview.membership.starId,
          });
        } catch {
          recordFanletterFounderMockMembership({
            referralCode,
            starId,
          });
        }

        window.location.assign(nextHref);
      }

      void completeMockJoin();
    },
    [locale, referralCode, starId],
  );

  return (
    <Link className={className} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
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
          </div>
        </div>
      </div>
    </div>
  );
}
