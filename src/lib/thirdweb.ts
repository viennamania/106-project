import { createThirdwebClient } from "thirdweb";
import { bsc } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";

import { SERVICE_BRAND_NAME } from "@/lib/service-branding";

export const thirdwebClientId =
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? "";
export const hasThirdwebClientId = thirdwebClientId.length > 0;

export const thirdwebClient = createThirdwebClient({
  clientId: thirdwebClientId || "demo",
});

export const smartWalletChain = bsc;

export function getAppMetadata(description: string) {
  return {
    name: SERVICE_BRAND_NAME,
    description,
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    logoUrl: "/favicon.ico",
  };
}

export const smartWalletOptions = {
  chain: smartWalletChain,
  sponsorGas: true,
};

export const emailWallet = inAppWallet({
  auth: {
    options: ["email"],
    mode: "popup",
  },
  executionMode: {
    mode: "EIP4337",
    smartAccount: smartWalletOptions,
  },
  metadata: {
    name: SERVICE_BRAND_NAME,
    image: {
      src: "/favicon.ico",
      alt: SERVICE_BRAND_NAME,
      width: 96,
      height: 96,
    },
  },
  hidePrivateKeyExport: true,
});

export const supportedWallets = [emailWallet];

export const BSC_EXPLORER = "https://bscscan.com";
export const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
export const BSC_USDT_URL = `${BSC_EXPLORER}/token/${BSC_USDT_ADDRESS}`;

type ThirdwebWalletConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "unknown"
  | (string & {});

export function getThirdwebConnectionState({
  accountAddress,
  clientConfigured = hasThirdwebClientId,
  status,
}: {
  accountAddress?: string | null;
  clientConfigured?: boolean;
  status: ThirdwebWalletConnectionStatus;
}) {
  const isConnected = status === "connected" && Boolean(accountAddress);
  const isResolving =
    clientConfigured &&
    (status === "unknown" ||
      status === "connecting" ||
      (status === "connected" && !accountAddress));

  return {
    isConnected,
    isDisconnected: !isResolving && !isConnected,
    isResolving,
  };
}
