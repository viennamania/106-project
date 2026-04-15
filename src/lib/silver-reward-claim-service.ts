import "server-only";

import {
  getAddress,
  isAddress,
  prepareTransaction,
  sendAndConfirmTransaction,
} from "thirdweb";
import { toTokens } from "thirdweb/utils";
import { getWalletBalance, privateKeyToAccount } from "thirdweb/wallets";

import {
  getMongoClient,
  getRewardRedemptionsCollection,
  getSilverRewardClaimsCollection,
} from "@/lib/mongodb";
import { type MemberDocument, serializeMember } from "@/lib/member";
import { serializeRewardRedemption } from "@/lib/points";
import type { RewardRedemptionDocument } from "@/lib/points";
import { fetchBithumbTicker } from "@/lib/bithumb-market";
import {
  serializeSilverRewardClaim,
  type SilverRewardClaimDocument,
  type SilverRewardClaimEligibilityReason,
  type SilverRewardClaimResponse,
  type SilverRewardClaimSummaryResponse,
  type SilverRewardQuoteRecord,
} from "@/lib/silver-reward-claim";
import { smartWalletChain } from "@/lib/thirdweb";
import { hasThirdwebSecretKey, serverThirdwebClient } from "@/lib/thirdweb-server";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

const SILVER_REWARD_USD_AMOUNT = 10;
const SILVER_REWARD_PRICE_SCALE = 8;
const BNB_WEI_DECIMALS = 18;
const PROJECT_WALLET_PRIVATE_KEY =
  process.env.PROJECT_WALLET_PRIVATE_KEY?.trim() ?? "";

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function trimTokenAmount(value: string, maxFractionDigits = 8) {
  const [wholePart, fractionPart = ""] = value.split(".");

  if (!fractionPart) {
    return wholePart;
  }

  const normalizedFraction = fractionPart
    .slice(0, maxFractionDigits)
    .replace(/0+$/, "");

  return normalizedFraction ? `${wholePart}.${normalizedFraction}` : wholePart;
}

function parseDecimalToScaled(value: string, scale: number) {
  const normalized = value.replaceAll(",", "").trim();

  if (!normalized) {
    return BigInt(0);
  }

  const [wholePartRaw = "0", fractionPartRaw = ""] = normalized.split(".");
  const wholePart = wholePartRaw || "0";
  const fractionPart = fractionPartRaw.replace(/\D/g, "");
  const paddedFraction = `${fractionPart}${"0".repeat(scale)}`.slice(0, scale);

  return (
    BigInt(wholePart) * BigInt(10) ** BigInt(scale) +
    BigInt(paddedFraction || "0")
  );
}

function getSilverRewardEligibilityReason({
  claim,
  member,
  rewardRedemption,
  walletAddress,
}: {
  claim: SilverRewardClaimDocument | null;
  member: MemberDocument;
  rewardRedemption: RewardRedemptionDocument | null;
  walletAddress: string | null;
}): SilverRewardClaimEligibilityReason | null {
  if (member.status !== "completed") {
    return "signup_incomplete";
  }

  if (!rewardRedemption || rewardRedemption.status !== "completed") {
    return "silver_card_incomplete";
  }

  if (!walletAddress) {
    return "wallet_missing";
  }

  if (claim?.status === "completed") {
    return "already_claimed";
  }

  if (claim?.status === "pending") {
    return "claim_pending";
  }

  return null;
}

function getEligibilityErrorMessage(reason: SilverRewardClaimEligibilityReason) {
  if (reason === "signup_incomplete") {
    return "Member signup is not complete.";
  }

  if (reason === "silver_card_incomplete") {
    return "Silver member card redemption is not complete.";
  }

  if (reason === "wallet_missing") {
    return "Member does not have a valid wallet address for the silver reward claim.";
  }

  if (reason === "already_claimed") {
    return "Silver reward has already been claimed.";
  }

  return "Silver reward claim is already in progress.";
}

function getProjectWalletAddress() {
  const projectWallet = process.env.PROJECT_WALLET?.trim() ?? "";

  if (!projectWallet) {
    throw new Error("PROJECT_WALLET is not configured.");
  }

  if (!isAddress(projectWallet)) {
    throw new Error("PROJECT_WALLET is invalid.");
  }

  return getAddress(projectWallet);
}

function getProjectWalletAccount() {
  if (!hasThirdwebSecretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is required for server wallet transfers.");
  }

  if (!PROJECT_WALLET_PRIVATE_KEY) {
    throw new Error("PROJECT_WALLET_PRIVATE_KEY is not configured.");
  }

  const account = privateKeyToAccount({
    client: serverThirdwebClient,
    privateKey: PROJECT_WALLET_PRIVATE_KEY,
  });
  const projectWalletAddress = getProjectWalletAddress();

  if (
    normalizeAddress(account.address) !== normalizeAddress(projectWalletAddress)
  ) {
    throw new Error("PROJECT_WALLET_PRIVATE_KEY does not match PROJECT_WALLET.");
  }

  return account;
}

function getMemberRewardWalletAddress(member: MemberDocument) {
  const candidateWallets = [
    member.lastWalletAddress,
    ...member.walletAddresses,
  ].filter(Boolean);

  for (const walletAddress of candidateWallets) {
    if (isAddress(walletAddress)) {
      return getAddress(walletAddress);
    }
  }

  return null;
}

async function getSilverCardRedemption(memberEmail: string) {
  const collection = await getRewardRedemptionsCollection();

  return collection.findOne({
    memberEmail,
    rewardId: "silver-card",
  });
}

async function getExistingSilverRewardClaim(memberEmail: string) {
  const collection = await getSilverRewardClaimsCollection();

  return collection.findOne({
    memberEmail,
    rewardId: "silver-card",
  });
}

export async function getSilverRewardQuote(): Promise<SilverRewardQuoteRecord> {
  const [bnbTicker, usdtTicker] = await Promise.all([
    fetchBithumbTicker("BNB_KRW"),
    fetchBithumbTicker("USDT_KRW"),
  ]);
  const bnbKrwScaled = parseDecimalToScaled(
    bnbTicker.priceKrwRaw,
    SILVER_REWARD_PRICE_SCALE,
  );
  const usdtKrwScaled = parseDecimalToScaled(
    usdtTicker.priceKrwRaw,
    SILVER_REWARD_PRICE_SCALE,
  );

  if (bnbKrwScaled <= BigInt(0) || usdtKrwScaled <= BigInt(0)) {
    throw new Error("Bithumb ticker returned an invalid market price.");
  }

  const estimatedKrwScaled = BigInt(SILVER_REWARD_USD_AMOUNT) * usdtKrwScaled;
  const bnbAmountWei =
    estimatedKrwScaled * BigInt(10) ** BigInt(BNB_WEI_DECIMALS) / bnbKrwScaled;

  if (bnbAmountWei <= BigInt(0)) {
    throw new Error("Calculated silver reward amount is too small to transfer.");
  }

  const asOfMs = Math.max(Date.parse(bnbTicker.asOf), Date.parse(usdtTicker.asOf));

  return {
    asOf: new Date(asOfMs).toISOString(),
    bnbAmount: trimTokenAmount(toTokens(bnbAmountWei, BNB_WEI_DECIMALS)),
    bnbAmountWei: bnbAmountWei.toString(),
    bnbKrwPrice: bnbTicker.priceKrw,
    estimatedKrwAmount: SILVER_REWARD_USD_AMOUNT * usdtTicker.priceKrw,
    usdAmount: SILVER_REWARD_USD_AMOUNT,
    usdtKrwPrice: usdtTicker.priceKrw,
  };
}

export async function getSilverRewardClaimSummary(
  member: MemberDocument,
): Promise<SilverRewardClaimSummaryResponse> {
  const walletAddress = getMemberRewardWalletAddress(member);
  const [claim, quote, rewardRedemption] = await Promise.all([
    getExistingSilverRewardClaim(member.email),
    getSilverRewardQuote(),
    getSilverCardRedemption(member.email),
  ]);
  const eligibilityReason = getSilverRewardEligibilityReason({
    claim,
    member,
    rewardRedemption,
    walletAddress,
  });

  return {
    canClaim: eligibilityReason === null,
    claim: claim ? serializeSilverRewardClaim(claim) : null,
    eligibilityReason,
    member: serializeMember(member),
    quote,
    rewardRedemption: rewardRedemption
      ? serializeRewardRedemption(rewardRedemption)
      : null,
    walletAddress,
  };
}

async function markClaimFailed(claimId: string, failureReason: string) {
  const collection = await getSilverRewardClaimsCollection();

  await collection.updateOne(
    { claimId },
    {
      $set: {
        failureReason,
        status: "failed",
        updatedAt: new Date(),
      },
    },
  );
}

export async function submitSilverRewardClaim(
  member: MemberDocument,
): Promise<SilverRewardClaimResponse> {
  const [quote, rewardRedemption, existingClaim] = await Promise.all([
    getSilverRewardQuote(),
    getSilverCardRedemption(member.email),
    getExistingSilverRewardClaim(member.email),
  ]);
  const walletAddress = getMemberRewardWalletAddress(member);
  const eligibilityReason = getSilverRewardEligibilityReason({
    claim: existingClaim,
    member,
    rewardRedemption,
    walletAddress,
  });

  if (eligibilityReason) {
    throw new Error(getEligibilityErrorMessage(eligibilityReason));
  }

  const now = new Date();
  const claimId = existingClaim?.claimId ?? crypto.randomUUID();
  const pendingClaim: SilverRewardClaimDocument = {
    bnbAmount: quote.bnbAmount,
    bnbAmountWei: quote.bnbAmountWei,
    bnbKrwPrice: quote.bnbKrwPrice,
    claimId,
    createdAt: existingClaim?.createdAt ?? now,
    failureReason: null,
    memberEmail: member.email,
    rewardId: "silver-card",
    status: "pending",
    txHash: null,
    updatedAt: now,
    usdAmount: quote.usdAmount,
    usdtKrwPrice: quote.usdtKrwPrice,
    walletAddress: walletAddress!,
  };
  const client = await getMongoClient();
  const collection = await getSilverRewardClaimsCollection();
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const currentClaim = await collection.findOne(
        {
          memberEmail: member.email,
          rewardId: "silver-card",
        },
        { session },
      );

      if (currentClaim?.status === "completed") {
        throw new Error("Silver reward has already been claimed.");
      }

      if (currentClaim?.status === "pending") {
        throw new Error("Silver reward claim is already in progress.");
      }

      if (currentClaim) {
        const updateResult = await collection.updateOne(
          {
            claimId: currentClaim.claimId,
            status: "failed",
          },
          {
            $set: {
              bnbAmount: pendingClaim.bnbAmount,
              bnbAmountWei: pendingClaim.bnbAmountWei,
              bnbKrwPrice: pendingClaim.bnbKrwPrice,
              failureReason: null,
              status: "pending",
              txHash: null,
              updatedAt: pendingClaim.updatedAt,
              usdAmount: pendingClaim.usdAmount,
              usdtKrwPrice: pendingClaim.usdtKrwPrice,
              walletAddress: pendingClaim.walletAddress,
            },
          },
          { session },
        );

        if (updateResult.modifiedCount === 0) {
          throw new Error("Silver reward claim could not be retried.");
        }

        return;
      }

      await collection.insertOne(pendingClaim, { session });
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new Error("Silver reward has already been claimed.");
    }

    throw error;
  } finally {
    await session.endSession();
  }

  try {
    const projectWalletAddress = getProjectWalletAddress();
    const projectWalletBalance = await getWalletBalance({
      address: projectWalletAddress,
      chain: smartWalletChain,
      client: serverThirdwebClient,
    });
    const transferAmountWei = BigInt(pendingClaim.bnbAmountWei);

    if (projectWalletBalance.value < transferAmountWei) {
      throw new Error("Project wallet does not have enough BNB for this claim.");
    }

    const transaction = prepareTransaction({
      chain: smartWalletChain,
      client: serverThirdwebClient,
      to: pendingClaim.walletAddress,
      value: transferAmountWei,
    });
    const receipt = await sendAndConfirmTransaction({
      account: getProjectWalletAccount(),
      transaction,
    });
    const updateResult = await collection.updateOne(
      { claimId },
      {
        $set: {
          status: "completed",
          txHash: receipt.transactionHash,
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Silver reward transfer succeeded but the claim record was not updated.");
    }
  } catch (error) {
    const failureReason =
      error instanceof Error
        ? error.message
        : "Silver reward transfer failed unexpectedly.";

    await markClaimFailed(claimId, failureReason);
    throw new Error(failureReason);
  }

  return getSilverRewardClaimSummary(member);
}
