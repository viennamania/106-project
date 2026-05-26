import { normalizeEmail } from "@/lib/member";
import { WALLET_UNLOCK_SESSION_MS } from "@/lib/wallet-unlock";

type WalletUnlockSessionRecord = {
  expiresAt: number;
};

export const WALLET_UNLOCK_SESSION_CHANGE_EVENT =
  "wallet-unlock-session-change";

function getWalletUnlockSessionKey(email: string, walletAddress: string) {
  return `wallet-unlock:${normalizeEmail(email)}:${walletAddress.trim().toLowerCase()}`;
}

function dispatchWalletUnlockSessionChange({
  email,
  unlocked,
  walletAddress,
}: {
  email: string | null | undefined;
  unlocked: boolean;
  walletAddress: string | null | undefined;
}) {
  if (!email || !walletAddress || typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(WALLET_UNLOCK_SESSION_CHANGE_EVENT, {
      detail: {
        key: getWalletUnlockSessionKey(email, walletAddress),
        unlocked,
      },
    }),
  );
}

export function isWalletUnlockedForSession({
  email,
  walletAddress,
}: {
  email: string | null | undefined;
  walletAddress: string | null | undefined;
}) {
  if (!email || !walletAddress || typeof window === "undefined") {
    return false;
  }

  const key = getWalletUnlockSessionKey(email, walletAddress);
  const rawSession = window.sessionStorage.getItem(key);

  if (!rawSession) {
    return false;
  }

  try {
    const session = JSON.parse(rawSession) as WalletUnlockSessionRecord;

    if (typeof session.expiresAt === "number" && session.expiresAt > Date.now()) {
      return true;
    }
  } catch {
    // Fall through and clear malformed session data.
  }

  window.sessionStorage.removeItem(key);
  return false;
}

export function markWalletUnlockedForSession({
  email,
  walletAddress,
}: {
  email: string;
  walletAddress: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getWalletUnlockSessionKey(email, walletAddress),
    JSON.stringify({
      expiresAt: Date.now() + WALLET_UNLOCK_SESSION_MS,
    } satisfies WalletUnlockSessionRecord),
  );
  dispatchWalletUnlockSessionChange({
    email,
    unlocked: true,
    walletAddress,
  });
}

export function clearWalletUnlockedForSession({
  email,
  walletAddress,
}: {
  email: string | null | undefined;
  walletAddress: string | null | undefined;
}) {
  if (!email || !walletAddress || typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(
    getWalletUnlockSessionKey(email, walletAddress),
  );
  dispatchWalletUnlockSessionChange({
    email,
    unlocked: false,
    walletAddress,
  });
}
