import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { Engine, createThirdwebClient, getAddress, isAddress } from "thirdweb";
import { bsc } from "thirdweb/chains";
import { deployERC721Contract } from "thirdweb/deploys";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const envLocalPath = path.join(rootDir, ".env.local");
const protectedKeys = new Set(Object.keys(process.env));
const shouldWriteEnv = process.argv.includes("--write-env");

loadEnvFile(envPath, { override: false, protectedKeys });
loadEnvFile(envLocalPath, { override: true, protectedKeys });

const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY?.trim() ?? "";
const rewardsServerWalletAddress =
  process.env.THIRDWEB_REWARDS_NFT_SERVER_WALLET_ADDRESS?.trim() ??
  process.env.PROJECT_WALLET?.trim() ??
  "";
const contractType =
  process.env.THIRDWEB_REWARDS_NFT_CONTRACT_TYPE?.trim() ?? "TokenERC721";
const contractName =
  process.env.THIRDWEB_REWARDS_NFT_NAME?.trim() ?? "Pocket Rewards NFT";
const contractSymbol =
  process.env.THIRDWEB_REWARDS_NFT_SYMBOL?.trim() ?? "PRWD";
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

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

if (!["DropERC721", "TokenERC721", "OpenEditionERC721", "LoyaltyCard"].includes(contractType)) {
  throw new Error(
    `THIRDWEB_REWARDS_NFT_CONTRACT_TYPE "${contractType}" is invalid.`,
  );
}

console.log("Using rewards NFT deployment config:");
console.log(`- env: ${fs.existsSync(envLocalPath) ? ".env.local" : fs.existsSync(envPath) ? ".env" : "shell only"}`);
console.log(`- chain: ${bsc.name} (${bsc.id})`);
console.log(`- type: ${contractType}`);
console.log(`- name: ${contractName}`);
console.log(`- symbol: ${contractSymbol}`);
console.log(`- wallet: ${getAddress(rewardsServerWalletAddress)}`);
console.log("");

const client = createThirdwebClient({
  secretKey: thirdwebSecretKey,
});
const account = Engine.serverWallet({
  address: getAddress(rewardsServerWalletAddress),
  chain: bsc,
  client,
});

console.log(`Deploying ${contractType} to BSC with admin ${account.address}...`);

const contractAddress = await deployERC721Contract({
  account,
  chain: bsc,
  client,
  params: {
    description:
      "Pocket Smart Wallet onchain membership and VIP reward collection.",
    external_link: appUrl || undefined,
    name: contractName,
    symbol: contractSymbol,
  },
  type: contractType,
});

console.log("");
console.log("Rewards NFT contract deployed.");
console.log(`THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS=${contractAddress}`);

if (shouldWriteEnv) {
  upsertEnvValue(
    fs.existsSync(envLocalPath) ? envLocalPath : envPath,
    "THIRDWEB_REWARDS_NFT_CONTRACT_ADDRESS",
    contractAddress,
  );
  console.log("Updated local env file with the deployed contract address.");
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

function upsertEnvValue(filePath, key, value) {
  const nextLine = `${key}=${value}`;
  const hasFile = fs.existsSync(filePath);
  const current = hasFile ? fs.readFileSync(filePath, "utf8") : "";
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const updated = pattern.test(current)
    ? current.replace(pattern, nextLine)
    : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${nextLine}\n`;

  fs.writeFileSync(filePath, updated, "utf8");
}
