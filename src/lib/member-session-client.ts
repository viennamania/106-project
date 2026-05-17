"use client";

import type {
  MemberRecord,
  SyncMemberRequest,
  SyncMemberResponse,
} from "@/lib/member";

export type ServerMemberSession = {
  email: string;
  member: MemberRecord;
  walletAddress: string;
};

export type ServerMemberSessionResult =
  | (ServerMemberSession & { ok: true })
  | {
      error: string;
      ok: false;
      status: number;
    };

const serverSessionValidationRequests = new Map<
  string,
  Promise<ServerMemberSessionResult>
>();
const memberSyncRequests = new Map<string, Promise<ServerMemberSyncResult>>();
const MEMBER_SESSION_REQUEST_TIMEOUT_MS = 10000;

export type ServerMemberSyncResult =
  | (SyncMemberResponse & { ok: true })
  | {
      error: string;
      ok: false;
      status: number;
    };

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeWalletAddress(walletAddress?: string | null) {
  return walletAddress?.trim().toLowerCase() ?? "";
}

function getMemberSyncRequestKey(input: SyncMemberRequest) {
  return JSON.stringify({
    chainId: input.chainId,
    chainName: input.chainName?.trim() ?? "",
    email: normalizeEmail(input.email),
    fanletterShareCreatorReferralCode:
      input.fanletterShareAttribution?.creatorReferralCode?.trim() ?? "",
    fanletterShareId: input.fanletterShareAttribution?.shareId?.trim() ?? "",
    fanletterShareSponsorSlug:
      input.fanletterShareAttribution?.sponsorSlug?.trim() ?? "",
    locale: input.locale?.trim() ?? "",
    referredByCode: input.referredByCode?.trim() ?? "",
    syncMode: input.syncMode ?? "full",
    walletAddress: normalizeWalletAddress(input.walletAddress),
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, MEMBER_SESSION_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseServerMemberSessionResponse(
  response: Response,
): Promise<ServerMemberSessionResult> {
  const data = (await response.json().catch(() => null)) as
    | Partial<ServerMemberSession>
    | { error?: string }
    | null;

  if (!response.ok) {
    return {
      error:
        data && "error" in data && data.error
          ? data.error
          : "Member session validation failed.",
      ok: false,
      status: response.status,
    };
  }

  const email =
    data && "email" in data ? normalizeEmail(data.email) : "";
  const walletAddress =
    data && "walletAddress" in data
      ? normalizeWalletAddress(data.walletAddress)
      : "";
  const member = data && "member" in data ? data.member : null;

  if (!email || !walletAddress || !member) {
    return {
      error: "Member session response is invalid.",
      ok: false,
      status: 500,
    };
  }

  return {
    email,
    member,
    ok: true,
    walletAddress,
  };
}

export async function readServerMemberSession() {
  const response = await fetchWithTimeout("/api/session/member", {
    cache: "no-store",
  });

  return parseServerMemberSessionResponse(response);
}

export async function validateServerMemberSession({
  email,
  walletAddress,
}: {
  email?: string | null;
  walletAddress?: string | null;
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
  const requestKey = `${normalizedEmail}:${normalizedWalletAddress}`;

  if (!normalizedEmail || !normalizedWalletAddress) {
    return {
      error: "Member session credentials are required.",
      ok: false,
      status: 400,
    } satisfies ServerMemberSessionResult;
  }

  const existingRequest = serverSessionValidationRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchWithTimeout("/api/session/member", {
    body: JSON.stringify({
      email: normalizedEmail,
      walletAddress: normalizedWalletAddress,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).then(parseServerMemberSessionResponse);

  serverSessionValidationRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    serverSessionValidationRequests.delete(requestKey);
  }
}

export async function clearServerMemberSession() {
  await fetchWithTimeout("/api/session/member", { method: "DELETE" }).catch(
    () => null,
  );
}

export async function syncServerMemberRegistration(input: SyncMemberRequest) {
  const requestKey = getMemberSyncRequestKey(input);
  const existingRequest = memberSyncRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchWithTimeout("/api/members", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).then(async (response): Promise<ServerMemberSyncResult> => {
    const data = (await response.json().catch(() => null)) as
      | Partial<SyncMemberResponse>
      | { error?: string }
      | null;

    if (!response.ok) {
      return {
        error:
          data && "error" in data && data.error
            ? data.error
            : "Failed to sync member.",
        ok: false,
        status: response.status,
      };
    }

    return {
      justCompleted:
        data && "justCompleted" in data ? Boolean(data.justCompleted) : false,
      member: data && "member" in data ? data.member ?? null : null,
      ok: true,
      validationError:
        data &&
        "validationError" in data &&
        typeof data.validationError === "string"
          ? data.validationError
          : null,
    };
  });

  memberSyncRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    memberSyncRequests.delete(requestKey);
  }
}
