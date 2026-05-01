"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import type { MemberRecord } from "@/lib/member";
import {
  clearCachedMemberSession,
  isMemberSessionWalletMatch,
  readCachedMemberSession,
  writeCachedMemberSession,
} from "@/lib/member-session-cache";
import {
  hasThirdwebClientId,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type MemberSessionStatus = "error" | "idle" | "ready" | "validating";
type MemberSessionSource = "cache" | "server" | null;

type MemberSessionState = {
  accountAddress: string | null;
  email: string | null;
  error: string | null;
  isFromCache: boolean;
  isValidating: boolean;
  member: MemberRecord | null;
  source: MemberSessionSource;
  status: MemberSessionStatus;
};

type MemberSessionContextValue = MemberSessionState & {
  clearMemberSession: (walletAddress?: string | null) => void;
  updateMemberSession: (input: {
    email?: string | null;
    member: MemberRecord | null;
    source?: Exclude<MemberSessionSource, null>;
    walletAddress?: string | null;
  }) => void;
};

const emptyMemberSession: MemberSessionState = {
  accountAddress: null,
  email: null,
  error: null,
  isFromCache: false,
  isValidating: false,
  member: null,
  source: null,
  status: "idle",
};

const MemberSessionContext = createContext<MemberSessionContextValue | null>(
  null,
);

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function MemberSessionProvider({ children }: { children: ReactNode }) {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address ?? null;
  const { isResolving } = useThirdwebConnectionState({
    accountAddress,
    status,
  });
  const [session, setSession] =
    useState<MemberSessionState>(emptyMemberSession);
  const validationKeyRef = useRef<string | null>(null);

  const clearMemberSession = useCallback(
    (walletAddress?: string | null) => {
      const resolvedWalletAddress = walletAddress ?? accountAddress;

      clearCachedMemberSession(resolvedWalletAddress);
      setSession({
        ...emptyMemberSession,
        accountAddress: accountAddress ?? null,
      });
    },
    [accountAddress],
  );

  const updateMemberSession = useCallback(
    ({
      email,
      member,
      source = "server",
      walletAddress,
    }: {
      email?: string | null;
      member: MemberRecord | null;
      source?: Exclude<MemberSessionSource, null>;
      walletAddress?: string | null;
    }) => {
      const resolvedWalletAddress = walletAddress ?? accountAddress;

      if (!member || !isMemberSessionWalletMatch(member, resolvedWalletAddress)) {
        return;
      }

      const resolvedEmail = normalizeEmail(email ?? member.email);

      if (!resolvedEmail) {
        return;
      }

      writeCachedMemberSession({
        email: resolvedEmail,
        member,
        walletAddress: resolvedWalletAddress,
      });

      setSession({
        accountAddress: resolvedWalletAddress ?? null,
        email: resolvedEmail,
        error: null,
        isFromCache: source === "cache",
        isValidating: false,
        member,
        source,
        status: "ready",
      });
    },
    [accountAddress],
  );

  useEffect(() => {
    if (!accountAddress || status === "disconnected" || !hasThirdwebClientId) {
      if (accountAddress && status === "disconnected") {
        clearCachedMemberSession(accountAddress);
      }

      setSession({
        ...emptyMemberSession,
        accountAddress,
      });
      validationKeyRef.current = null;
      return;
    }

    const cachedSession = readCachedMemberSession(accountAddress);

    if (!cachedSession) {
      setSession((current) => ({
        ...(current.accountAddress === accountAddress
          ? current
          : emptyMemberSession),
        accountAddress,
        isFromCache: false,
        isValidating:
          hasThirdwebClientId && status === "connected" && !isResolving,
        source: current.accountAddress === accountAddress ? current.source : null,
        status:
          hasThirdwebClientId && status === "connected" && !isResolving
            ? "validating"
            : "idle",
      }));
      return;
    }

    setSession({
      accountAddress,
      email: cachedSession.email,
      error: null,
      isFromCache: true,
      isValidating:
        hasThirdwebClientId && status === "connected" && !isResolving,
      member: cachedSession.member,
      source: "cache",
      status: "ready",
    });
  }, [accountAddress, isResolving, status]);

  useEffect(() => {
    if (
      isResolving ||
      status !== "connected" ||
      !accountAddress ||
      !hasThirdwebClientId
    ) {
      if (!accountAddress || status === "disconnected") {
        validationKeyRef.current = null;
      }
      return;
    }

    const validationKey = `${accountAddress}:${status}`;

    if (validationKeyRef.current === validationKey) {
      return;
    }

    validationKeyRef.current = validationKey;
    let cancelled = false;

    async function validateMemberSession() {
      setSession((current) => ({
        ...current,
        accountAddress,
        error: null,
        isValidating: true,
        status: current.member ? current.status : "validating",
      }));

      try {
        const email = await getThirdwebUserEmail({ client: thirdwebClient });
        const normalizedEmail = normalizeEmail(email);

        if (cancelled) {
          return;
        }

        if (!normalizedEmail) {
          setSession((current) => ({
            ...current,
            accountAddress,
            error: "Thirdweb email is not available yet.",
            isValidating: false,
            status: current.member ? "ready" : "error",
          }));
          return;
        }

        const response = await fetch(
          `/api/members?email=${encodeURIComponent(normalizedEmail)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as
          | { member?: MemberRecord | null }
          | { error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok || !("member" in data) || !data.member) {
          clearCachedMemberSession(accountAddress);
          setSession({
            accountAddress,
            email: normalizedEmail,
            error:
              "error" in data && data.error
                ? data.error
                : "Member not found.",
            isFromCache: false,
            isValidating: false,
            member: null,
            source: null,
            status: "error",
          });
          return;
        }

        if (!isMemberSessionWalletMatch(data.member, accountAddress)) {
          clearCachedMemberSession(accountAddress);
          setSession({
            accountAddress,
            email: normalizedEmail,
            error: "Member wallet does not match the active wallet.",
            isFromCache: false,
            isValidating: false,
            member: null,
            source: null,
            status: "error",
          });
          return;
        }

        writeCachedMemberSession({
          email: normalizedEmail,
          member: data.member,
          walletAddress: accountAddress,
        });
        setSession({
          accountAddress,
          email: normalizedEmail,
          error: null,
          isFromCache: false,
          isValidating: false,
          member: data.member,
          source: "server",
          status: "ready",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSession((current) => ({
          ...current,
          accountAddress,
          error:
            error instanceof Error
              ? error.message
              : "Failed to validate member session.",
          isValidating: false,
          status: current.member ? "ready" : "error",
        }));
      }
    }

    void validateMemberSession();

    return () => {
      cancelled = true;
    };
  }, [accountAddress, isResolving, status]);

  const value = useMemo<MemberSessionContextValue>(
    () => ({
      ...session,
      clearMemberSession,
      updateMemberSession,
    }),
    [clearMemberSession, session, updateMemberSession],
  );

  return (
    <MemberSessionContext.Provider value={value}>
      {children}
    </MemberSessionContext.Provider>
  );
}

export function useMemberSession() {
  const context = useContext(MemberSessionContext);

  if (!context) {
    throw new Error("useMemberSession must be used within MemberSessionProvider.");
  }

  return context;
}
