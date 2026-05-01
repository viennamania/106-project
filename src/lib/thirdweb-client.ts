"use client";

import { useEffect, useState } from "react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import {
  getThirdwebConnectionState,
  hasThirdwebClientId,
} from "@/lib/thirdweb";

const THIRDWEB_EMAIL_RETRY_DELAYS_MS = [0, 250, 500, 1000, 1500];
const THIRDWEB_CONNECTION_RESOLVE_GRACE_MS = 3000;

type ThirdwebWalletConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "unknown"
  | (string & {});

export async function getThirdwebUserEmail(
  options: Parameters<typeof getUserEmail>[0],
) {
  let lastEmail: string | null | undefined = null;

  for (const delayMs of THIRDWEB_EMAIL_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    lastEmail = await getUserEmail(options);

    if (lastEmail) {
      return lastEmail;
    }
  }

  return lastEmail ?? null;
}

export function useThirdwebConnectionState({
  accountAddress,
  clientConfigured = hasThirdwebClientId,
  resolveGraceMs = THIRDWEB_CONNECTION_RESOLVE_GRACE_MS,
  status,
}: {
  accountAddress?: string | null;
  clientConfigured?: boolean;
  resolveGraceMs?: number;
  status: ThirdwebWalletConnectionStatus;
}) {
  const shouldExpireResolving =
    clientConfigured &&
    (status === "unknown" ||
      status === "connecting" ||
      (status === "connected" && !accountAddress));
  const resolveGraceKey = shouldExpireResolving
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
    }, resolveGraceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [resolveGraceKey, resolveGraceMs]);

  const connectionState = getThirdwebConnectionState({
    accountAddress,
    clientConfigured,
    status,
  });

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
