import "server-only";

import {
  Engine,
  getAddress,
  isAddress,
  prepareTransaction,
} from "thirdweb";
import type { ExecutionResult } from "thirdweb/engine";
import { toTokens } from "thirdweb/utils";
import { getWalletBalance } from "thirdweb/wallets";

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

const SILVER_REWARD_USD_AMOUNT = 10;
const SILVER_REWARD_PRICE_SCALE = 8;
const BNB_WEI_DECIMALS = 18;
const SILVER_REWARD_TX_WAIT_TIMEOUT_SECONDS = 20;

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

function getProjectServerWallet() {
  if (!hasThirdwebSecretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is required for server wallet transfers.");
  }

  return Engine.serverWallet({
    address: getProjectWalletAddress(),
    chain: smartWalletChain,
    client: serverThirdwebClient,
  });
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

function stringifyUnknownError(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getEngineExecutionFailureReason(
  executionResult: ExecutionResult,
): string | null {
  if (executionResult.status === "FAILED") {
    const reason = stringifyUnknownError(executionResult.error);

    return reason
      ? `Transaction failed: ${reason}`
      : "Transaction failed unexpectedly.";
  }

  if (
    executionResult.status === "CONFIRMED" &&
    executionResult.onchainStatus === "REVERTED"
  ) {
    const errorName = executionResult.revertData?.errorName ?? "unknown error";
    const errorArgs = executionResult.revertData?.errorArgs
      ? ` ${stringifyUnknownError(executionResult.revertData.errorArgs)}`
      : "";
    const txHash = executionResult.transactionHash
      ? ` - ${executionResult.transactionHash}`
      : "";

    return `Transaction reverted: ${errorName}${errorArgs}${txHash}`;
  }

  return null;
}

async function syncPendingSilverRewardClaim(
  claim: SilverRewardClaimDocument | null,
) {
  if (
    !claim ||
    claim.status !== "pending" ||
    !claim.transactionId ||
    !hasThirdwebSecretKey
  ) {
    return claim;
  }

  try {
    const executionResult = await Engine.getTransactionStatus({
      client: serverThirdwebClient,
      transactionId: claim.transactionId,
    });
    const failureReason = getEngineExecutionFailureReason(executionResult);

    if (failureReason) {
      const updatedClaim: SilverRewardClaimDocument = {
        ...claim,
        failureReason,
        status: "failed",
        txHash:
          executionResult.status === "CONFIRMED"
            ? executionResult.transactionHash
            : claim.txHash ?? null,
        updatedAt: new Date(),
      };
      const collection = await getSilverRewardClaimsCollection();

      await collection.updateOne(
        { claimId: claim.claimId, status: "pending" },
        {
          $set: {
            failureReason: updatedClaim.failureReason,
            status: updatedClaim.status,
            txHash: updatedClaim.txHash,
            updatedAt: updatedClaim.updatedAt,
          },
        },
      );

      return updatedClaim;
    }

    if (executionResult.status === "CONFIRMED") {
      const updatedClaim: SilverRewardClaimDocument = {
        ...claim,
        failureReason: null,
        status: "completed",
        txHash: executionResult.transactionHash,
        updatedAt: new Date(),
      };
      const collection = await getSilverRewardClaimsCollection();

      await collection.updateOne(
        { claimId: claim.claimId, status: "pending" },
        {
          $set: {
            failureReason: null,
            status: "completed",
            txHash: updatedClaim.txHash,
            updatedAt: updatedClaim.updatedAt,
          },
        },
      );

      return updatedClaim;
    }

    return claim;
  } catch {
    return claim;
  }
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
  const [rawClaim, quote, rewardRedemption] = await Promise.all([
    getExistingSilverRewardClaim(member.email),
    getSilverRewardQuote(),
    getSilverCardRedemption(member.email),
  ]);
  const claim = await syncPendingSilverRewardClaim(rawClaim);
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
  const [quote, rewardRedemption, rawExistingClaim] = await Promise.all([
    getSilverRewardQuote(),
    getSilverCardRedemption(member.email),
    getExistingSilverRewardClaim(member.email),
  ]);
  const existingClaim = await syncPendingSilverRewardClaim(rawExistingClaim);
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
    transactionId: null,
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
              transactionId: null,
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
    const { transactionId } = await getProjectServerWallet().enqueueTransaction({
      transaction,
    });
    const queueUpdateResult = await collection.updateOne(
      { claimId },
      {
        $set: {
          transactionId,
          updatedAt: new Date(),
        },
      },
    );

    if (queueUpdateResult.modifiedCount === 0) {
      throw new Error(
        "Silver reward transaction was queued but the claim record could not store the transaction reference.",
      );
    }

    try {
      const receipt = await Engine.waitForTransactionHash({
        client: serverThirdwebClient,
        timeoutInSeconds: SILVER_REWARD_TX_WAIT_TIMEOUT_SECONDS,
        transactionId,
      });
      const updateResult = await collection.updateOne(
        { claimId },
        {
          $set: {
            failureReason: null,
            status: "completed",
            txHash: receipt.transactionHash,
            updatedAt: new Date(),
          },
        },
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error(
          "Silver reward transfer succeeded but the claim record was not updated.",
        );
      }
    } catch (error) {
      const executionResult = await Engine.getTransactionStatus({
        client: serverThirdwebClient,
        transactionId,
      }).catch(() => null);
      const failureReason = executionResult
        ? getEngineExecutionFailureReason(executionResult)
        : null;

      if (failureReason) {
        await markClaimFailed(claimId, failureReason);
        throw new Error(failureReason);
      }

      const timeoutMessage =
        error instanceof Error ? error.message : "Silver reward transfer is pending.";
      await collection.updateOne(
        { claimId },
        {
          $set: {
            failureReason: timeoutMessage,
            transactionId,
            updatedAt: new Date(),
          },
        },
      );

      return getSilverRewardClaimSummary(member);
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
