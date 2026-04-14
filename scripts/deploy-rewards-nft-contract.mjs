import { createThirdwebClient } from "thirdweb";
import { bsc } from "thirdweb/chains";
import { deployERC721Contract } from "thirdweb/deploys";
import { privateKeyToAccount } from "thirdweb/wallets";

const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY?.trim() ?? "";
const adminPrivateKey =
  process.env.THIRDWEB_REWARDS_NFT_ADMIN_PRIVATE_KEY?.trim() ?? "";
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

if (!adminPrivateKey) {
  throw new Error("THIRDWEB_REWARDS_NFT_ADMIN_PRIVATE_KEY is required.");
}

const client = createThirdwebClient({
  secretKey: thirdwebSecretKey,
});
const account = privateKeyToAccount({
  client,
  privateKey: adminPrivateKey,
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
