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
  AutoConnect,
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
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
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
const MEMBER_SESSION_VALIDATION_DEDUPE_DELAY_MS = 180;

const MemberSessionContext = createContext<MemberSessionContextValue | null>(
  null,
);

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeWalletAddress(walletAddress?: string | null) {
  return walletAddress?.trim().toLowerCase() ?? "";
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
  const sessionRef = useRef<MemberSessionState>(emptyMemberSession);
  const serverSessionKeyRef = useRef<string | null>(null);
  const validationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const clearMemberSession = useCallback(
    (walletAddress?: string | null) => {
      const resolvedWalletAddress = walletAddress ?? accountAddress;

      clearCachedMemberSession(resolvedWalletAddress);
      serverSessionKeyRef.current = null;
      void fetch("/api/session/member", { method: "DELETE" });
      setSession({
        ...emptyMemberSession,
        accountAddress: accountAddress ?? null,
      });
    },
    [accountAddress],
  );

  const persistServerMemberSession = useCallback(
    async ({
      email,
      member,
      walletAddress,
    }: {
      email: string;
      member: MemberRecord;
      walletAddress?: string | null;
    }) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      const serverSessionKey = `${normalizedEmail}:${normalizedWalletAddress}:${member.updatedAt}`;

      if (
        !normalizedEmail ||
        !normalizedWalletAddress ||
        serverSessionKeyRef.current === serverSessionKey
      ) {
        return;
      }

      serverSessionKeyRef.current = serverSessionKey;

      try {
        const response = await fetch("/api/session/member", {
          body: JSON.stringify({
            email: normalizedEmail,
            walletAddress: normalizedWalletAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          serverSessionKeyRef.current = null;
        }
      } catch {
        serverSessionKeyRef.current = null;
      }
    },
    [],
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
      void persistServerMemberSession({
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
    [accountAddress, persistServerMemberSession],
  );

  useEffect(() => {
    if (!accountAddress || status === "disconnected" || !hasThirdwebClientId) {
      if (accountAddress && status === "disconnected") {
        clearCachedMemberSession(accountAddress);
        serverSessionKeyRef.current = null;
        void fetch("/api/session/member", { method: "DELETE" });
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
        await new Promise((resolve) => {
          window.setTimeout(resolve, MEMBER_SESSION_VALIDATION_DEDUPE_DELAY_MS);
        });

        if (cancelled) {
          return;
        }

        const latestSession = sessionRef.current;

        if (
          latestSession.source === "server" &&
          isMemberSessionWalletMatch(latestSession.member, accountAddress)
        ) {
          return;
        }

        const serverSessionResponse = await fetch("/api/session/member", {
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        if (serverSessionResponse.ok) {
          const serverSessionData = (await serverSessionResponse.json()) as {
            email?: string | null;
            member?: MemberRecord | null;
          };
          const serverSessionEmail = normalizeEmail(serverSessionData.email);
          const serverSessionMember = serverSessionData.member ?? null;

          if (
            serverSessionEmail &&
            serverSessionMember &&
            isMemberSessionWalletMatch(serverSessionMember, accountAddress)
          ) {
            writeCachedMemberSession({
              email: serverSessionEmail,
              member: serverSessionMember,
              walletAddress: accountAddress,
            });
            setSession({
              accountAddress,
              email: serverSessionEmail,
              error: null,
              isFromCache: false,
              isValidating: false,
              member: serverSessionMember,
              source: "server",
              status: "ready",
            });
            serverSessionKeyRef.current = `${serverSessionEmail}:${normalizeWalletAddress(accountAddress)}:${serverSessionMember.updatedAt}`;
            return;
          }

          serverSessionKeyRef.current = null;
          await fetch("/api/session/member", { method: "DELETE" });
        } else if (serverSessionResponse.status === 403) {
          serverSessionKeyRef.current = null;
          await fetch("/api/session/member", { method: "DELETE" });
        }

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
        void persistServerMemberSession({
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
  }, [accountAddress, isResolving, persistServerMemberSession, status]);

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
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={getAppMetadata("1066friend+ member session")}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}
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
