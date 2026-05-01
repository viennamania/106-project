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
  clearServerMemberSession,
  readServerMemberSession,
  validateServerMemberSession,
} from "@/lib/member-session-client";
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
      void clearServerMemberSession();
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
        const result = await validateServerMemberSession({
          email: normalizedEmail,
          walletAddress: normalizedWalletAddress,
        });

        if (!result.ok) {
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
        void clearServerMemberSession();
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

        const serverSessionResult = await readServerMemberSession();

        if (cancelled) {
          return;
        }

        if (serverSessionResult.ok) {
          if (
            isMemberSessionWalletMatch(serverSessionResult.member, accountAddress)
          ) {
            writeCachedMemberSession({
              email: serverSessionResult.email,
              member: serverSessionResult.member,
              walletAddress: accountAddress,
            });
            setSession({
              accountAddress,
              email: serverSessionResult.email,
              error: null,
              isFromCache: false,
              isValidating: false,
              member: serverSessionResult.member,
              source: "server",
              status: "ready",
            });
            serverSessionKeyRef.current = `${serverSessionResult.email}:${normalizeWalletAddress(accountAddress)}:${serverSessionResult.member.updatedAt}`;
            return;
          }

          serverSessionKeyRef.current = null;
          await clearServerMemberSession();
        } else if (serverSessionResult.status === 403) {
          serverSessionKeyRef.current = null;
          await clearServerMemberSession();
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

        const validatedSession = await validateServerMemberSession({
          email: normalizedEmail,
          walletAddress: accountAddress,
        });

        if (cancelled) {
          return;
        }

        if (!validatedSession.ok) {
          clearCachedMemberSession(accountAddress);
          setSession({
            accountAddress,
            email: normalizedEmail,
            error: validatedSession.error,
            isFromCache: false,
            isValidating: false,
            member: null,
            source: null,
            status: "error",
          });
          return;
        }

        if (!isMemberSessionWalletMatch(validatedSession.member, accountAddress)) {
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
          email: validatedSession.email,
          member: validatedSession.member,
          walletAddress: accountAddress,
        });
        serverSessionKeyRef.current = `${validatedSession.email}:${normalizeWalletAddress(accountAddress)}:${validatedSession.member.updatedAt}`;
        setSession({
          accountAddress,
          email: validatedSession.email,
          error: null,
          isFromCache: false,
          isValidating: false,
          member: validatedSession.member,
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
