import "server-only";

import {
  getAddress,
  getContract,
  isAddress,
  parseEventLogs,
  sendAndConfirmTransaction,
} from "thirdweb";
import {
  mintTo,
  transferEvent as erc721TransferEvent,
} from "thirdweb/extensions/erc721";
import { privateKeyToAccount } from "thirdweb/wallets";

import type { RewardCatalogId } from "@/lib/points";
import { hasThirdwebSecretKey, serverThirdwebClient } from "@/lib/thirdweb-server";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";
import { smartWalletChain } from "@/lib/thirdweb";

const REWARDS_NFT_CONTRACT_ADDRESS =
  process.env.THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS?.trim() ?? "";
const REWARDS_NFT_ADMIN_PRIVATE_KEY =
  process.env.THIRDWEB_REWARDS_NFT_ADMIN_PRIVATE_KEY?.trim() ?? "";
const REWARDS_APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

export function isOnchainRewardCatalogId(rewardId: RewardCatalogId) {
  return rewardId === "silver-card" || rewardId === "gold-card" || rewardId === "vip-pass";
}

export function hasRewardsNftMintingConfig() {
  return (
    hasThirdwebSecretKey &&
    REWARDS_NFT_ADMIN_PRIVATE_KEY.length > 0 &&
    REWARDS_NFT_CONTRACT_ADDRESS.length > 0
  );
}

function getRewardsNftContractAddress() {
  if (!REWARDS_NFT_CONTRACT_ADDRESS) {
    throw new Error("THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS is not configured.");
  }

  if (!isAddress(REWARDS_NFT_CONTRACT_ADDRESS)) {
    throw new Error("THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS is invalid.");
  }

  return getAddress(REWARDS_NFT_CONTRACT_ADDRESS);
}

function getRewardsNftAdminAccount() {
  if (!hasThirdwebSecretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is required for reward NFT minting.");
  }

  if (!REWARDS_NFT_ADMIN_PRIVATE_KEY) {
    throw new Error("THIRDWEB_REWARDS_NFT_ADMIN_PRIVATE_KEY is not configured.");
  }

  return privateKeyToAccount({
    client: serverThirdwebClient,
    privateKey: REWARDS_NFT_ADMIN_PRIVATE_KEY,
  });
}

function getRewardsNftMetadata(rewardId: RewardCatalogId) {
  const baseMetadata = {
    external_url: REWARDS_APP_URL || undefined,
    properties: {
      app: "Pocket Smart Wallet",
      chain: smartWalletChain.name ?? "BSC",
      rewardId,
    },
  };

  if (rewardId === "silver-card") {
    return {
      ...baseMetadata,
      attributes: [
        { trait_type: "Reward", value: "Silver Member Card" },
        { trait_type: "Tier", value: "Silver" },
      ],
      description:
        "Pocket Smart Wallet silver member card issued on BNB Smart Chain after redeeming 1,000 points.",
      name: "Pocket Silver Member Card",
    };
  }

  if (rewardId === "gold-card") {
    return {
      ...baseMetadata,
      attributes: [
        { trait_type: "Reward", value: "Gold Member Card" },
        { trait_type: "Tier", value: "Gold" },
      ],
      description:
        "Pocket Smart Wallet gold member card issued on BNB Smart Chain after redeeming 5,000 points.",
      name: "Pocket Gold Member Card",
    };
  }

  if (rewardId === "vip-pass") {
    return {
      ...baseMetadata,
      attributes: [
        { trait_type: "Reward", value: "VIP Pass" },
        { trait_type: "Tier", value: "VIP" },
      ],
      description:
        "Pocket Smart Wallet VIP pass NFT issued on BNB Smart Chain after redeeming 10,000 points.",
      name: "Pocket VIP Pass NFT",
    };
  }

  throw new Error(`Reward ${rewardId} does not mint an NFT.`);
}

export async function mintRewardNftToWallet({
  rewardId,
  walletAddress,
}: {
  rewardId: RewardCatalogId;
  walletAddress: string;
}) {
  if (!isOnchainRewardCatalogId(rewardId)) {
    throw new Error(`Reward ${rewardId} does not mint an NFT.`);
  }

  if (!isAddress(walletAddress)) {
    throw new Error("Member wallet address is invalid for NFT minting.");
  }

  const contract = getContract({
    address: getRewardsNftContractAddress(),
    chain: smartWalletChain,
    client: serverThirdwebClient,
  });
  const normalizedWalletAddress = getAddress(walletAddress);
  const account = getRewardsNftAdminAccount();
  const transaction = mintTo({
    contract,
    nft: getRewardsNftMetadata(rewardId),
    to: normalizedWalletAddress,
  });
  const receipt = await sendAndConfirmTransaction({
    account,
    transaction,
  });
  const transferLogs = parseEventLogs({
    events: [erc721TransferEvent({ to: normalizedWalletAddress })],
    logs: receipt.logs,
  });
  const mintLog = [...transferLogs]
    .reverse()
    .find((log) => normalizeAddress(log.args.to) === normalizeAddress(normalizedWalletAddress));

  if (!mintLog) {
    throw new Error(
      `Mint transaction ${receipt.transactionHash} did not emit an ERC721 transfer event.`,
    );
  }

  const tokenId = mintLog.args.tokenId;
  return {
    contractAddress: contract.address,
    tokenId: tokenId.toString(),
    tokenUri: null,
    transactionHash: receipt.transactionHash,
  };
}
