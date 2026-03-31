import { createThirdwebClient } from "thirdweb";
import { bsc } from "thirdweb/chains";
import { createWallet, inAppWallet } from "thirdweb/wallets";

export const thirdwebClientId =
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? "";
export const hasThirdwebClientId = thirdwebClientId.length > 0;

export const thirdwebClient = createThirdwebClient({
  clientId: thirdwebClientId || "demo",
});

export const smartWalletChain = bsc;

export function getAppMetadata(description: string) {
  return {
    name: "Pocket Smart Wallet",
    description,
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    logoUrl: "/favicon.ico",
  };
}

export const smartWalletOptions = {
  chain: smartWalletChain,
  sponsorGas: true,
};

export const supportedWallets = [
  inAppWallet({
    auth: {
      options: ["email", "google", "apple", "passkey", "guest"],
      mode: "popup",
    },
    metadata: {
      name: "Pocket Smart Wallet",
      image: {
        src: "/favicon.ico",
        alt: "Pocket Smart Wallet",
        width: 96,
        height: 96,
      },
    },
    hidePrivateKeyExport: true,
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
];

export const BSC_EXPLORER = "https://bscscan.com";
export const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
export const BSC_USDT_URL = `${BSC_EXPLORER}/token/${BSC_USDT_ADDRESS}`;
