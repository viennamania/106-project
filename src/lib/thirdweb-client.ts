"use client";

import { useEffect, useState } from "react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import {
  getThirdwebConnectionState,
  hasThirdwebClientId,
} from "@/lib/thirdweb";

const THIRDWEB_EMAIL_RETRY_DELAYS_MS = [0, 250, 500, 1000, 1500];
const THIRDWEB_EMAIL_ATTEMPT_TIMEOUT_MS = 2500;
const THIRDWEB_CONNECTION_RESOLVE_GRACE_MS = 3000;
let thirdwebEmailPromise: Promise<string | null> | null = null;

type ThirdwebWalletConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "unknown"
  | (string & {});

export async function getThirdwebUserEmail(
  options: Parameters<typeof getUserEmail>[0],
) {
  if (thirdwebEmailPromise) {
    return thirdwebEmailPromise;
  }

  thirdwebEmailPromise = resolveThirdwebUserEmail(options).finally(() => {
    thirdwebEmailPromise = null;
  });

  return thirdwebEmailPromise;
}

async function resolveThirdwebUserEmail(
  options: Parameters<typeof getUserEmail>[0],
) {
  let lastEmail: string | null | undefined = null;

  for (const delayMs of THIRDWEB_EMAIL_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    lastEmail = await getThirdwebUserEmailAttempt(options);

    if (lastEmail) {
      return lastEmail;
    }
  }

  return lastEmail ?? null;
}

async function getThirdwebUserEmailAttempt(
  options: Parameters<typeof getUserEmail>[0],
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      getUserEmail(options).catch(() => null),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(
          () => resolve(null),
          THIRDWEB_EMAIL_ATTEMPT_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function useThirdwebConnectionState({
  accountAddress,
  clientConfigured = hasThirdwebClientId,
  disconnectedResolveGraceMs = 0,
  resolveGraceMs = THIRDWEB_CONNECTION_RESOLVE_GRACE_MS,
  status,
}: {
  accountAddress?: string | null;
  clientConfigured?: boolean;
  disconnectedResolveGraceMs?: number;
  resolveGraceMs?: number;
  status: ThirdwebWalletConnectionStatus;
}) {
  const shouldGraceDisconnected =
    clientConfigured &&
    disconnectedResolveGraceMs > 0 &&
    status === "disconnected" &&
    !accountAddress;
  const shouldExpireResolving =
    clientConfigured &&
    (status === "unknown" ||
      status === "connecting" ||
      (status === "connected" && !accountAddress));
  const resolveGraceKey = shouldExpireResolving || shouldGraceDisconnected
    ? `${status}:${accountAddress ?? ""}`
    : null;
  const [elapsedResolveGraceKey, setElapsedResolveGraceKey] =
    useState<string | null>(null);

  useEffect(() => {
    if (!resolveGraceKey) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setElapsedResolveGraceKey(resolveGraceKey);
    }, shouldGraceDisconnected ? disconnectedResolveGraceMs : resolveGraceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    disconnectedResolveGraceMs,
    resolveGraceKey,
    resolveGraceMs,
    shouldGraceDisconnected,
  ]);

  const connectionState = getThirdwebConnectionState({
    accountAddress,
    clientConfigured,
    status,
  });

  if (
    shouldGraceDisconnected &&
    resolveGraceKey !== null &&
    elapsedResolveGraceKey !== resolveGraceKey
  ) {
    return {
      isConnected: false,
      isDisconnected: false,
      isResolving: true,
    };
  }

  if (
    connectionState.isResolving &&
    shouldExpireResolving &&
    resolveGraceKey !== null &&
    elapsedResolveGraceKey === resolveGraceKey
  ) {
    return {
      isConnected: false,
      isDisconnected: true,
      isResolving: false,
    };
  }

  return connectionState;
}
