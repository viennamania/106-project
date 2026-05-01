"use client";

import type { MemberRecord } from "@/lib/member";

const MEMBER_SESSION_CACHE_VERSION = 1;
const MEMBER_SESSION_CACHE_PREFIX = "member-session";
export const MEMBER_SESSION_CACHE_TTL_MS = 10 * 60 * 1000;

export type CachedMemberSession = {
  email: string;
  member: MemberRecord;
  savedAt: number;
  version: typeof MEMBER_SESSION_CACHE_VERSION;
  walletAddress: string;
};

function normalizeSessionAddress(address?: string | null) {
  return address?.trim().toLowerCase() ?? "";
}

function normalizeSessionEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function getCacheKey(walletAddress?: string | null) {
  const normalizedWalletAddress = normalizeSessionAddress(walletAddress);

  return normalizedWalletAddress
    ? `${MEMBER_SESSION_CACHE_PREFIX}:${MEMBER_SESSION_CACHE_VERSION}:${normalizedWalletAddress}`
    : null;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function isMemberSessionWalletMatch(
  member: MemberRecord | null | undefined,
  walletAddress?: string | null,
) {
  const normalizedWalletAddress = normalizeSessionAddress(walletAddress);

  if (!member || !normalizedWalletAddress) {
    return false;
  }

  return [member.lastWalletAddress, ...member.walletAddresses]
    .map((address) => normalizeSessionAddress(address))
    .includes(normalizedWalletAddress);
}

export function readCachedMemberSession(
  walletAddress?: string | null,
  now = Date.now(),
) {
  const storage = getStorage();
  const cacheKey = getCacheKey(walletAddress);

  if (!storage || !cacheKey) {
    return null;
  }

  try {
    const raw = storage.getItem(cacheKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedMemberSession>;
    const member = parsed.member ?? null;
    const normalizedWalletAddress = normalizeSessionAddress(walletAddress);
    const normalizedCachedWalletAddress = normalizeSessionAddress(
      parsed.walletAddress,
    );

    if (
      parsed.version !== MEMBER_SESSION_CACHE_VERSION ||
      typeof parsed.savedAt !== "number" ||
      now - parsed.savedAt > MEMBER_SESSION_CACHE_TTL_MS ||
      !member ||
      !parsed.email ||
      normalizedCachedWalletAddress !== normalizedWalletAddress ||
      normalizeSessionEmail(parsed.email) !== normalizeSessionEmail(member.email) ||
      !isMemberSessionWalletMatch(member, normalizedWalletAddress)
    ) {
      storage.removeItem(cacheKey);
      return null;
    }

    return {
      email: normalizeSessionEmail(parsed.email),
      member,
      savedAt: parsed.savedAt,
      version: MEMBER_SESSION_CACHE_VERSION,
      walletAddress: normalizedWalletAddress,
    } satisfies CachedMemberSession;
  } catch {
    storage.removeItem(cacheKey);
    return null;
  }
}

export function writeCachedMemberSession({
  email,
  member,
  walletAddress,
}: {
  email?: string | null;
  member: MemberRecord | null | undefined;
  walletAddress?: string | null;
}) {
  const storage = getStorage();
  const cacheKey = getCacheKey(walletAddress);
  const normalizedEmail = normalizeSessionEmail(email ?? member?.email);
  const normalizedWalletAddress = normalizeSessionAddress(walletAddress);

  if (
    !storage ||
    !cacheKey ||
    !member ||
    !normalizedEmail ||
    !isMemberSessionWalletMatch(member, normalizedWalletAddress)
  ) {
    return;
  }

  try {
    storage.setItem(
      cacheKey,
      JSON.stringify({
        email: normalizedEmail,
        member,
        savedAt: Date.now(),
        version: MEMBER_SESSION_CACHE_VERSION,
        walletAddress: normalizedWalletAddress,
      } satisfies CachedMemberSession),
    );
  } catch {}
}

export function clearCachedMemberSession(walletAddress?: string | null) {
  const storage = getStorage();
  const cacheKey = getCacheKey(walletAddress);

  if (!storage || !cacheKey) {
    return;
  }

  storage.removeItem(cacheKey);
}
