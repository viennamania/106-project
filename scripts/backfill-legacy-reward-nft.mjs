import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { MongoClient } from "mongodb";
import {
  Engine,
  getAddress,
  getContract,
  isAddress,
  parseEventLogs,
  sendAndConfirmTransaction,
} from "thirdweb";
import { bsc } from "thirdweb/chains";
import {
  mintTo,
  transferEvent as erc721TransferEvent,
} from "thirdweb/extensions/erc721";
import { createThirdwebClient } from "thirdweb";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const envLocalPath = path.join(rootDir, ".env.local");
const protectedKeys = new Set(Object.keys(process.env));

loadEnvFile(envPath, { override: false, protectedKeys });
loadEnvFile(envLocalPath, { override: true, protectedKeys });

const args = process.argv.slice(2);
const email = readArgValue(args, "--email");
const rewardId = readArgValue(args, "--reward-id") ?? "silver-card";
const dryRun = args.includes("--dry-run");

const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY?.trim() ?? "";
const rewardsServerWalletAddress =
  process.env.THIRDWEB_REWARDS_NFT_SERVER_WALLET_ADDRESS?.trim() ??
  process.env.PROJECT_WALLET?.trim() ??
  "";
const rewardsContractAddress =
  process.env.THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS?.trim() ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
const mongoUri = process.env.MONGODB_URI?.trim() ?? "";
const mongoDbName = process.env.MONGODB_DB_NAME?.trim() ?? "";
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const pointBalancesCollectionName =
  process.env.MONGODB_POINT_BALANCES_COLLECTION?.trim() ?? "pointBalances";
const rewardRedemptionsCollectionName =
  process.env.MONGODB_REWARD_REDEMPTIONS_COLLECTION?.trim() ?? "rewardRedemptions";

if (!email) {
  throw new Error("--email is required.");
}

if (!["silver-card", "gold-card", "vip-pass"].includes(rewardId)) {
  throw new Error(`Unsupported reward id: ${rewardId}`);
}

if (!thirdwebSecretKey) {
  throw new Error("THIRDWEB_SECRET_KEY is required.");
}

if (!rewardsServerWalletAddress) {
  throw new Error(
    "THIRDWEB_REWARDS_NFT_SERVER_WALLET_ADDRESS or PROJECT_WALLET is required.",
  );
}

if (!isAddress(rewardsServerWalletAddress)) {
  throw new Error(
    "THIRDWEB_REWARDS_NFT_SERVER_WALLET_ADDRESS or PROJECT_WALLET is invalid.",
  );
}

if (!rewardsContractAddress) {
  throw new Error("THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS is required.");
}

if (!isAddress(rewardsContractAddress)) {
  throw new Error("THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS is invalid.");
}

if (!mongoUri) {
  throw new Error("MONGODB_URI is required.");
}

if (!mongoDbName) {
  throw new Error("MONGODB_DB_NAME is required.");
}

const normalizedEmail = email.trim().toLowerCase();
const client = createThirdwebClient({ secretKey: thirdwebSecretKey });
const account = Engine.serverWallet({
  address: getAddress(rewardsServerWalletAddress),
  chain: bsc,
  client,
});
const contract = getContract({
  address: getAddress(rewardsContractAddress),
  chain: bsc,
  client,
});
const mongoClient = new MongoClient(mongoUri);

await mongoClient.connect();

try {
  const db = mongoClient.db(mongoDbName);
  const membersCollection = db.collection(membersCollectionName);
  const pointBalancesCollection = db.collection(pointBalancesCollectionName);
  const rewardRedemptionsCollection = db.collection(rewardRedemptionsCollectionName);

  const member = await membersCollection.findOne({ email: normalizedEmail });

  if (!member) {
    throw new Error(`Member not found: ${normalizedEmail}`);
  }

  const rewardWalletAddress = getMemberRewardWalletAddress(member);

  if (!rewardWalletAddress) {
    throw new Error("Member does not have a valid wallet address for reward NFT minting.");
  }

  const redemption = await rewardRedemptionsCollection.findOne({
    memberEmail: normalizedEmail,
    rewardId,
    status: "completed",
  });

  if (!redemption) {
    throw new Error(
      `Completed redemption not found for ${normalizedEmail} / ${rewardId}.`,
    );
  }

  if (redemption.tokenId || redemption.contractAddress || redemption.txHash) {
    throw new Error(
      `Redemption ${redemption.redemptionId} already has onchain fields and does not need backfill.`,
    );
  }

  const existingBalance = await pointBalancesCollection.findOne({
    memberEmail: normalizedEmail,
  });

  const summary = {
    contractAddress: contract.address,
    memberEmail: normalizedEmail,
    redemptionId: redemption.redemptionId,
    rewardId,
    serverWalletAddress: account.address,
    walletAddress: rewardWalletAddress,
    currentLoyaltyCardTokenId: existingBalance?.loyaltyCardTokenId ?? null,
  };

  console.log("Legacy reward NFT backfill candidate:");
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) {
    console.log("Dry run complete. No onchain mint or database update was performed.");
    process.exit(0);
  }

  const transaction = mintTo({
    contract,
    nft: getRewardsNftMetadata(rewardId, appUrl),
    to: rewardWalletAddress,
  });
  const receipt = await sendAndConfirmTransaction({
    account,
    transaction,
  });
  const transferLogs = parseEventLogs({
    events: [erc721TransferEvent({ to: rewardWalletAddress })],
    logs: receipt.logs,
  });
  const mintLog = [...transferLogs]
    .reverse()
    .find((log) => normalizeAddress(log.args.to) === normalizeAddress(rewardWalletAddress));

  if (!mintLog) {
    throw new Error(
      `Mint transaction ${receipt.transactionHash} did not emit an ERC721 transfer event.`,
    );
  }

  const tokenId = mintLog.args.tokenId.toString();
  const updatedAt = new Date();

  await rewardRedemptionsCollection.updateOne(
    { redemptionId: redemption.redemptionId },
    {
      $set: {
        contractAddress: contract.address,
        tokenId,
        tokenUri: null,
        txHash: receipt.transactionHash,
        updatedAt,
      },
    },
  );

  await pointBalancesCollection.updateOne(
    { memberEmail: normalizedEmail },
    {
      $set: {
        loyaltyCardTokenId: tokenId,
        updatedAt,
      },
    },
  );

  console.log("");
  console.log("Legacy reward NFT backfill completed.");
  console.log(JSON.stringify({
    contractAddress: contract.address,
    memberEmail: normalizedEmail,
    redemptionId: redemption.redemptionId,
    tokenId,
    txHash: receipt.transactionHash,
    walletAddress: rewardWalletAddress,
  }, null, 2));
} finally {
  await mongoClient.close();
}

function getMemberRewardWalletAddress(member) {
  const candidateWallets = [
    member.lastWalletAddress,
    ...(Array.isArray(member.walletAddresses) ? member.walletAddresses : []),
  ].filter(Boolean);

  for (const walletAddress of candidateWallets) {
    if (isAddress(walletAddress)) {
      return getAddress(walletAddress);
    }
  }

  return null;
}

function getRewardsNftMetadata(rewardId, appUrl) {
  const baseMetadata = {
    external_url: appUrl || undefined,
    properties: {
      app: "Pocket Smart Wallet",
      chain: bsc.name,
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

function normalizeAddress(value) {
  return isAddress(value) ? getAddress(value) : value?.toLowerCase() ?? "";
}

function readArgValue(args, flag) {
  const index = args.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

function loadEnvFile(filePath, options) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = rawLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    const rawValue = rawLine.slice(separatorIndex + 1);

    if (!key) {
      continue;
    }

    if (options.protectedKeys.has(key) && typeof process.env[key] !== "undefined") {
      continue;
    }

    if (!options.override && typeof process.env[key] !== "undefined") {
      continue;
    }

    process.env[key] = normalizeEnvValue(rawValue);
  }
}

function normalizeEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}
