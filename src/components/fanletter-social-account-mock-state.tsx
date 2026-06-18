"use client";

import { useEffect, useState } from "react";

import type {
  FanletterAIStarSocialAccount,
  FanletterAIStarSocialAccountStatus,
  FanletterSocialPlatform,
} from "@/mock/fanletter-social-accounts";

const FANLETTER_AI_STAR_SOCIAL_ACCOUNT_STORAGE_KEY =
  "fanletter:v2:mock-ai-star-social-accounts";
const FANLETTER_AI_STAR_SOCIAL_ACCOUNT_EVENT =
  "fanletter:mock-ai-star-social-account-change";

type StoredAIStarSocialAccounts = Record<string, FanletterAIStarSocialAccount>;

function getSocialAccountKey(starId: string, platform: FanletterSocialPlatform) {
  return `${platform}:${starId}`;
}

function isSocialAccountStatus(
  value: unknown,
): value is FanletterAIStarSocialAccountStatus {
  return (
    value === "mock_connected" || value === "pending" || value === "verified"
  );
}

function isAIStarSocialAccount(
  value: unknown,
): value is FanletterAIStarSocialAccount {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FanletterAIStarSocialAccount>;

  return (
    typeof candidate.connectedAt === "string" &&
    typeof candidate.connectedByMemberId === "string" &&
    (candidate.connectedByMemberInitials === undefined ||
      candidate.connectedByMemberInitials === null ||
      typeof candidate.connectedByMemberInitials === "string") &&
    typeof candidate.connectedByMemberName === "string" &&
    (candidate.creatorRoleAtConnection === "creator" ||
      candidate.creatorRoleAtConnection === "owner") &&
    typeof candidate.handle === "string" &&
    candidate.platform === "tiktok" &&
    typeof candidate.profileUrl === "string" &&
    typeof candidate.starId === "string" &&
    isSocialAccountStatus(candidate.status)
  );
}

function readStoredAIStarSocialAccounts() {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(
    FANLETTER_AI_STAR_SOCIAL_ACCOUNT_STORAGE_KEY,
  );

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<StoredAIStarSocialAccounts>(
      (accounts, [accountKey, account]) => {
        if (
          isAIStarSocialAccount(account) &&
          accountKey === getSocialAccountKey(account.starId, account.platform)
        ) {
          accounts[accountKey] = account;
        }

        return accounts;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeStoredAIStarSocialAccounts(
  accounts: StoredAIStarSocialAccounts,
) {
  window.localStorage.setItem(
    FANLETTER_AI_STAR_SOCIAL_ACCOUNT_STORAGE_KEY,
    JSON.stringify(accounts),
  );
}

function dispatchAIStarSocialAccountChange(
  account: FanletterAIStarSocialAccount,
) {
  window.dispatchEvent(
    new CustomEvent(FANLETTER_AI_STAR_SOCIAL_ACCOUNT_EVENT, {
      detail: account,
    }),
  );
}

export function getFanletterAIStarMockSocialAccount({
  platform = "tiktok",
  starId,
}: {
  platform?: FanletterSocialPlatform;
  starId: string | null;
}) {
  if (!starId) {
    return null;
  }

  return readStoredAIStarSocialAccounts()[getSocialAccountKey(starId, platform)] ?? null;
}

export function recordFanletterAIStarMockSocialAccount(
  account: FanletterAIStarSocialAccount,
) {
  if (typeof window === "undefined") {
    return null;
  }

  const accounts = readStoredAIStarSocialAccounts();
  accounts[getSocialAccountKey(account.starId, account.platform)] = account;
  writeStoredAIStarSocialAccounts(accounts);
  dispatchAIStarSocialAccountChange(account);

  return account;
}

export function useFanletterAIStarMockSocialAccount({
  platform = "tiktok",
  starId,
}: {
  platform?: FanletterSocialPlatform;
  starId: string;
}) {
  const [account, setAccount] = useState<FanletterAIStarSocialAccount | null>(
    null,
  );

  useEffect(() => {
    function refreshAccount() {
      setAccount(getFanletterAIStarMockSocialAccount({ platform, starId }));
    }

    refreshAccount();

    function handleStorage(event: StorageEvent) {
      if (
        event.key === FANLETTER_AI_STAR_SOCIAL_ACCOUNT_STORAGE_KEY ||
        event.key === null
      ) {
        refreshAccount();
      }
    }

    function handleAccountChange() {
      refreshAccount();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      FANLETTER_AI_STAR_SOCIAL_ACCOUNT_EVENT,
      handleAccountChange,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        FANLETTER_AI_STAR_SOCIAL_ACCOUNT_EVENT,
        handleAccountChange,
      );
    };
  }, [platform, starId]);

  return account;
}
