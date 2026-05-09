"use client";

import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import { hasThirdwebClientId } from "@/lib/thirdweb";
import { useThirdwebConnectionState } from "@/lib/thirdweb-client";

export type FanletterAccountStatusKind =
  | "checking"
  | "connected"
  | "disconnected"
  | "issue"
  | "pendingPayment"
  | "setupMissing";

const DEFAULT_CONNECTION_RESOLVE_GRACE_MS = 3000;

export function resolveFanletterAccountStatus({
  connection,
  memberSession,
}: {
  connection: ReturnType<typeof useThirdwebConnectionState>;
  memberSession: ReturnType<typeof useMemberSession>;
}): FanletterAccountStatusKind {
  if (!hasThirdwebClientId) {
    return "setupMissing";
  }

  if (
    connection.isResolving ||
    memberSession.isValidating ||
    memberSession.status === "validating"
  ) {
    return "checking";
  }

  if (connection.isDisconnected) {
    return "disconnected";
  }

  if (memberSession.member?.serviceSuspendedAt) {
    return "issue";
  }

  if (memberSession.member?.status === "pending_payment") {
    return "pendingPayment";
  }

  if (memberSession.status === "error" && !memberSession.member) {
    return "issue";
  }

  if (connection.isConnected) {
    return "connected";
  }

  return "disconnected";
}

export function useFanletterAccountStatus({
  disconnectedResolveGraceMs = DEFAULT_CONNECTION_RESOLVE_GRACE_MS,
  resolveGraceMs = DEFAULT_CONNECTION_RESOLVE_GRACE_MS,
}: {
  disconnectedResolveGraceMs?: number;
  resolveGraceMs?: number;
} = {}) {
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs,
    resolveGraceMs,
    status: connectionStatus,
  });
  const status = resolveFanletterAccountStatus({
    connection,
    memberSession,
  });

  return {
    accountAddress,
    connection,
    connectionStatus,
    email: memberSession.email,
    member: memberSession.member,
    memberSession,
    status,
  };
}
