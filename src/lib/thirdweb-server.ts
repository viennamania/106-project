import "server-only";

import { createThirdwebClient } from "thirdweb";

import { thirdwebClientId } from "@/lib/thirdweb";

const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY?.trim() ?? "";

export const hasThirdwebSecretKey = thirdwebSecretKey.length > 0;

export const serverThirdwebClient = createThirdwebClient(
  hasThirdwebSecretKey
    ? {
        secretKey: thirdwebSecretKey,
      }
    : {
        clientId: thirdwebClientId || "demo",
      },
);

type ThirdwebServerWalletProfile = {
  identifier?: string;
  type?: string;
};

type ThirdwebServerWalletResult = {
  address?: string;
  createdAt?: string;
  profiles?: ThirdwebServerWalletProfile[];
  smartWalletAddress?: string;
  userId?: string;
};

type ThirdwebServerWalletListResponse = {
  result?: {
    wallets?: ThirdwebServerWalletResult[];
  };
};

type ThirdwebServerWalletResponse = {
  result?: ThirdwebServerWalletResult;
};

const THIRDWEB_API_BASE_URL = "https://api.thirdweb.com";

function assertThirdwebSecretKey() {
  if (!hasThirdwebSecretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is required to create seller wallets.");
  }
}

async function requestThirdwebServerWallet<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  assertThirdwebSecretKey();

  const response = await fetch(`${THIRDWEB_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": thirdwebSecretKey,
      ...init?.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as
    | { error?: unknown; message?: string }
    | T;

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `thirdweb server wallet request failed with ${response.status}.`;

    throw new Error(message);
  }

  return data as T;
}

function resolveServerWalletAddress(wallet: ThirdwebServerWalletResult) {
  return wallet.smartWalletAddress?.trim() || wallet.address?.trim() || "";
}

async function findThirdwebServerWalletByIdentifier(identifier: string) {
  const data = await requestThirdwebServerWallet<ThirdwebServerWalletListResponse>(
    `/v1/wallets/server?limit=100&page=1`,
  );
  const wallets = data.result?.wallets ?? [];

  return wallets.find((wallet) =>
    (wallet.profiles ?? []).some(
      (profile) =>
        profile.type === "server" && profile.identifier === identifier,
    ),
  ) ?? null;
}

export async function createOrGetThirdwebSellerWallet(identifier: string) {
  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier) {
    throw new Error("Seller wallet identifier is required.");
  }

  const created = await requestThirdwebServerWallet<ThirdwebServerWalletResponse>(
    "/v1/wallets/server",
    {
      body: JSON.stringify({
        identifier: normalizedIdentifier,
      }),
      method: "POST",
    },
  );
  const createdSmartAccount = created.result?.smartWalletAddress?.trim() ?? "";

  if (createdSmartAccount) {
    return createdSmartAccount;
  }

  const listed = await findThirdwebServerWalletByIdentifier(normalizedIdentifier);
  const listedAddress = listed ? resolveServerWalletAddress(listed) : "";

  if (listedAddress) {
    return listedAddress;
  }

  const createdAddress = created.result?.address?.trim() ?? "";

  if (!createdAddress) {
    throw new Error("Failed to create seller wallet.");
  }

  return createdAddress;
}
