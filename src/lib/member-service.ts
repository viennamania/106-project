import "server-only";

import { randomInt } from "node:crypto";

import {
  getMembersCollection,
  getThirdwebWebhookEventsCollection,
} from "@/lib/mongodb";
import type {
  IncomingReferralState,
  MemberDocument,
  SyncMemberRequest,
  SyncMemberResponse,
} from "@/lib/member";
import {
  MEMBER_SIGNUP_USDT_AMOUNT,
  MEMBER_SIGNUP_USDT_AMOUNT_WEI,
  REFERRAL_SIGNUP_LIMIT,
  normalizeEmail,
  normalizeReferralCode,
  serializeMember,
} from "@/lib/member";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import {
  BSC_USDT_ADDRESS,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  BSC_CHAIN_ID,
  ERC20_TRANSFER_SIG_HASH,
  extractTrackedTransferEvent,
  normalizeAddress,
  type ThirdwebInsightEventRecord,
  type ThirdwebWebhookEventDocument,
} from "@/lib/thirdweb-webhooks";
import { eth_blockNumber, eth_getBlockByNumber, eth_getLogs, getRpcClient } from "thirdweb/rpc";
import { getWalletBalance } from "thirdweb/wallets";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;
const BACKFILL_MIN_BLOCK_RANGE = BigInt(50_000);
const BACKFILL_MAX_BLOCK_RANGE = BigInt(500_000);
const BACKFILL_BLOCK_BUFFER = BigInt(10_000);
const BACKFILL_COOLDOWN_MS = 30_000;
const ESTIMATED_BSC_BLOCK_TIME_SECONDS = 3;

export class MemberSyncError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MemberSyncError";
    this.status = status;
  }
}

function generateReferralCode() {
  return Array.from({ length: REFERRAL_CODE_LENGTH }, () => {
    return REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)];
  }).join("");
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function getProjectWallet() {
  const projectWallet = process.env.PROJECT_WALLET?.trim();

  if (!projectWallet) {
    throw new Error("PROJECT_WALLET is not configured.");
  }

  return normalizeAddress(projectWallet);
}

async function generateUniqueReferralCode(
  collection: Awaited<ReturnType<typeof getMembersCollection>>,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const referralCode = generateReferralCode();
    const existing = await collection.findOne({ referralCode });

    if (!existing) {
      return referralCode;
    }
  }

  throw new Error("Failed to generate a unique referral code.");
}

async function getFreshMemberOrThrow(
  collection: Awaited<ReturnType<typeof getMembersCollection>>,
  email: string,
) {
  const member = await collection.findOne({ email });

  if (!member) {
    throw new Error("Member lookup failed.");
  }

  return member;
}

function resolveLocale(input?: string | null): Locale {
  return input && hasLocale(input) ? input : defaultLocale;
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}

function getReferralLimitReachedMessage({
  code,
  count,
  locale,
}: {
  code: string;
  count: number;
  locale: Locale;
}) {
  return formatTemplate(
    getDictionary(locale).member.errors.referralLimitReached,
    {
      code,
      count,
      limit: REFERRAL_SIGNUP_LIMIT,
    },
  );
}

function getInsufficientBalanceMessage(locale: Locale) {
  return formatTemplate(
    getDictionary(locale).member.errors.insufficientBalance,
    {
      amount: MEMBER_SIGNUP_USDT_AMOUNT,
    },
  );
}

async function assertSignupWalletHasRequiredBalance({
  locale,
  walletAddress,
}: {
  locale: Locale;
  walletAddress: string;
}) {
  const balance = await getWalletBalance({
    address: walletAddress,
    chain: smartWalletChain,
    client: thirdwebClient,
    tokenAddress: BSC_USDT_ADDRESS,
  });

  if (balance.value < BigInt(MEMBER_SIGNUP_USDT_AMOUNT_WEI)) {
    throw new MemberSyncError(getInsufficientBalanceMessage(locale), 409);
  }
}

async function findMatchingSignupPaymentEvent(
  member: MemberDocument,
  matchedEvent?: ThirdwebWebhookEventDocument | null,
) {
  if (matchedEvent) {
    return isQualifiedSignupPaymentEvent(member, matchedEvent)
      ? matchedEvent
      : null;
  }

  const projectWallet = getProjectWallet();
  const collection = await getThirdwebWebhookEventsCollection();

  return collection.findOne(
    {
      amount: MEMBER_SIGNUP_USDT_AMOUNT_WEI,
      blockTimestamp: {
        $gte: Math.floor(member.awaitingPaymentSince.getTime() / 1000),
      },
      direction: "inbound",
      fromAddress: normalizeAddress(member.lastWalletAddress),
      projectWallet,
    },
    {
      sort: {
        blockTimestamp: 1,
        receivedAt: 1,
      },
    },
  );
}

function encodeTopicAddress(address: string): `0x${string}` {
  return `0x000000000000000000000000${normalizeAddress(address).slice(2)}`;
}

function buildBackfilledInsightEventRecord({
  amount,
  blockHash,
  blockNumber,
  blockTimestamp,
  fromAddress,
  logData,
  logIndex,
  toAddress,
  topics,
  transactionHash,
  transactionIndex,
}: {
  amount: string;
  blockHash: string;
  blockNumber: number;
  blockTimestamp: number;
  fromAddress: string;
  logData: string;
  logIndex: number;
  toAddress: string;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
}): ThirdwebInsightEventRecord {
  return {
    data: {
      address: BSC_USDT_ADDRESS,
      block_hash: blockHash,
      block_number: blockNumber,
      block_timestamp: blockTimestamp,
      chain_id: BSC_CHAIN_ID,
      data: logData,
      decoded: {
        indexed_params: {
          from: fromAddress,
          to: toAddress,
        },
        name: "Transfer",
        non_indexed_params: {
          value: amount,
        },
      },
      log_index: logIndex,
      topics,
      transaction_hash: transactionHash,
      transaction_index: transactionIndex,
    },
    id: `backfill:${transactionHash}:${logIndex}`,
    status: "MINED",
    type: "EVENT_LOG",
  };
}

async function backfillSignupPaymentEvent(
  member: MemberDocument,
): Promise<ThirdwebWebhookEventDocument | null> {
  const projectWallet = getProjectWallet();
  const collection = await getThirdwebWebhookEventsCollection();
  const rpcClient = getRpcClient({
    chain: smartWalletChain,
    client: thirdwebClient,
  });
  const awaitingPaymentSinceSeconds = Math.floor(
    member.awaitingPaymentSince.getTime() / 1000,
  );
  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - member.awaitingPaymentSince.getTime()) / 1000),
  );
  const estimatedAgeBlocks = BigInt(
    Math.ceil(ageSeconds / ESTIMATED_BSC_BLOCK_TIME_SECONDS),
  );
  const estimatedRange = estimatedAgeBlocks + BACKFILL_BLOCK_BUFFER;
  const blockRange =
    estimatedRange < BACKFILL_MIN_BLOCK_RANGE
      ? BACKFILL_MIN_BLOCK_RANGE
      : estimatedRange > BACKFILL_MAX_BLOCK_RANGE
        ? BACKFILL_MAX_BLOCK_RANGE
        : estimatedRange;
  const latestBlock = await eth_blockNumber(rpcClient);
  const fromBlock =
    latestBlock > blockRange ? latestBlock - blockRange : BigInt(0);
  const logs = await eth_getLogs(rpcClient, {
    address: BSC_USDT_ADDRESS,
    fromBlock,
    toBlock: latestBlock,
    topics: [
      ERC20_TRANSFER_SIG_HASH as `0x${string}`,
      encodeTopicAddress(member.lastWalletAddress),
      encodeTopicAddress(projectWallet),
    ],
  });
  const blockTimestampCache = new Map<bigint, number>();

  for (const log of logs) {
    if (
      log.blockHash === null ||
      log.blockNumber === null ||
      log.logIndex === null ||
      log.transactionHash === null ||
      log.transactionIndex === null
    ) {
      continue;
    }

    const blockNumber = log.blockNumber;
    const amount = BigInt(log.data);

    if (amount !== BigInt(MEMBER_SIGNUP_USDT_AMOUNT_WEI)) {
      continue;
    }

    let blockTimestamp = blockTimestampCache.get(blockNumber);

    if (blockTimestamp === undefined) {
      const block = await eth_getBlockByNumber(rpcClient, {
        blockNumber,
      });
      blockTimestamp = Number(block.timestamp);
      blockTimestampCache.set(blockNumber, blockTimestamp);
    }

    if (blockTimestamp < awaitingPaymentSinceSeconds) {
      continue;
    }

    const payload = buildBackfilledInsightEventRecord({
      amount: MEMBER_SIGNUP_USDT_AMOUNT_WEI,
      blockHash: log.blockHash,
      blockNumber: Number(blockNumber),
      blockTimestamp,
      fromAddress: member.lastWalletAddress,
      logData: log.data,
      logIndex: Number(log.logIndex),
      toAddress: projectWallet,
      topics: log.topics.filter(Boolean) as string[],
      transactionHash: log.transactionHash,
      transactionIndex: Number(log.transactionIndex),
    });
    const trackedEvent = extractTrackedTransferEvent(payload, projectWallet);

    if (!trackedEvent) {
      continue;
    }

    await collection.updateOne(
      { webhookEventId: trackedEvent.webhookEventId },
      {
        $set: trackedEvent,
      },
      { upsert: true },
    );

    return trackedEvent;
  }

  return null;
}

function isQualifiedSignupPaymentEvent(
  member: MemberDocument,
  event: ThirdwebWebhookEventDocument,
) {
  return (
    event.amount === MEMBER_SIGNUP_USDT_AMOUNT_WEI &&
    event.blockTimestamp >= Math.floor(member.awaitingPaymentSince.getTime() / 1000) &&
    event.direction === "inbound" &&
    event.fromAddress === normalizeAddress(member.lastWalletAddress) &&
    event.projectWallet === getProjectWallet()
  );
}

async function markMemberAsCompleted({
  collection,
  event,
  member,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  event: ThirdwebWebhookEventDocument;
  member: MemberDocument;
}) {
  const completedAt = new Date(event.blockTimestamp * 1000);
  const baseUpdate = {
    paymentBackfillCheckedAt: null,
    paymentAmount: event.amount,
    paymentReceivedAt: completedAt,
    paymentTransactionHash: event.transactionHash,
    paymentWebhookEventId: event.webhookEventId,
    registrationCompletedAt: completedAt,
    status: "completed" as const,
    updatedAt: completedAt,
  };

  if (member.referralCode) {
    await collection.updateOne(
      { email: member.email, status: "pending_payment" },
      {
        $set: baseUpdate,
      },
    );
    return;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const referralCode = await generateUniqueReferralCode(collection);
      const result = await collection.updateOne(
        { email: member.email, status: "pending_payment" },
        {
          $set: {
            ...baseUpdate,
            referralCode,
          },
        },
      );

      if (result.matchedCount > 0) {
        return;
      }

      break;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  await collection.updateOne(
    { email: member.email, status: "pending_payment" },
    {
      $set: baseUpdate,
    },
  );
}

async function maybeCompleteMemberWithStoredPayment({
  collection,
  member,
  matchedEvent,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
  matchedEvent?: ThirdwebWebhookEventDocument | null;
}) {
  if (member.status === "completed") {
    return {
      justCompleted: false,
      member,
    };
  }

  const paymentEvent = await findMatchingSignupPaymentEvent(member, matchedEvent);
  const shouldRunBackfill =
    !paymentEvent &&
    (!member.paymentBackfillCheckedAt ||
      Date.now() - member.paymentBackfillCheckedAt.getTime() >=
        BACKFILL_COOLDOWN_MS);

  const resolvedPaymentEvent =
    paymentEvent ??
    (shouldRunBackfill ? await backfillSignupPaymentEvent(member) : null);

  if (!resolvedPaymentEvent) {
    if (shouldRunBackfill) {
      await collection.updateOne(
        { email: member.email, status: "pending_payment" },
        {
          $set: {
            paymentBackfillCheckedAt: new Date(),
          },
        },
      );
    }

    return {
      justCompleted: false,
      member: await getFreshMemberOrThrow(collection, member.email),
    };
  }

  await markMemberAsCompleted({
    collection,
    event: resolvedPaymentEvent,
    member,
  });

  const nextMember = await getFreshMemberOrThrow(collection, member.email);

  return {
    justCompleted: nextMember.status === "completed",
    member: nextMember,
  };
}

async function resolveReferrer({
  email,
  referredByCode,
}: {
  email: string;
  referredByCode: string | null;
}) {
  if (!referredByCode) {
    return {
      referredByCode: null,
      referredByEmail: null,
    };
  }

  const collection = await getMembersCollection();
  const referrer = await collection.findOne({
    referralCode: referredByCode,
    status: "completed",
  });

  if (!referrer || referrer.email === email) {
    return {
      referredByCode: null,
      referredByEmail: null,
    };
  }

  return {
    referredByCode,
    referredByEmail: referrer.email,
  };
}

export async function getIncomingReferralState(
  referredByCode: string | null,
): Promise<IncomingReferralState | null> {
  if (!referredByCode) {
    return null;
  }

  const collection = await getMembersCollection();
  const referrer = await collection.findOne({
    referralCode: referredByCode,
    status: "completed",
  });

  if (!referrer) {
    return {
      code: referredByCode,
      completedReferrals: 0,
      limit: REFERRAL_SIGNUP_LIMIT,
      status: "invalid",
    };
  }

  const completedReferrals = await collection.countDocuments({
    referredByCode,
    status: "completed",
  });

  return {
    code: referredByCode,
    completedReferrals,
    limit: REFERRAL_SIGNUP_LIMIT,
    status:
      completedReferrals >= REFERRAL_SIGNUP_LIMIT ? "full" : "available",
  };
}

export async function syncMemberRegistration(
  input: SyncMemberRequest,
): Promise<SyncMemberResponse> {
  const email = normalizeEmail(input.email ?? "");
  const walletAddress = input.walletAddress?.trim();
  const normalizedWalletAddress = walletAddress
    ? normalizeAddress(walletAddress)
    : "";
  const chainName = input.chainName?.trim();
  const locale = input.locale?.trim();
  const resolvedLocale = resolveLocale(locale);
  const referredByCode = normalizeReferralCode(input.referredByCode);

  if (!email) {
    throw new Error("email is required.");
  }

  if (!normalizedWalletAddress) {
    throw new Error("walletAddress is required.");
  }

  if (!chainName) {
    throw new Error("chainName is required.");
  }

  if (!locale) {
    throw new Error("locale is required.");
  }

  getProjectWallet();

  const collection = await getMembersCollection();
  const now = new Date();
  const existingMember = await collection.findOne({ email });

  if (existingMember?.status === "completed") {
    await collection.updateOne(
      { email },
      {
        $addToSet: {
          walletAddresses: normalizedWalletAddress,
        },
        $set: {
          chainId: input.chainId,
          chainName,
          lastConnectedAt: now,
          lastWalletAddress: normalizedWalletAddress,
          locale,
          updatedAt: now,
        },
      },
    );

    return {
      justCompleted: false,
      member: serializeMember(await getFreshMemberOrThrow(collection, email)),
    };
  }

  const shouldResetPaymentWindow =
    !existingMember ||
    existingMember.lastWalletAddress !== normalizedWalletAddress;

  if (shouldResetPaymentWindow) {
    await assertSignupWalletHasRequiredBalance({
      locale: resolvedLocale,
      walletAddress: normalizedWalletAddress,
    });
  }

  const incomingReferralState = await getIncomingReferralState(referredByCode);

  if (
    !existingMember?.referredByCode &&
    incomingReferralState?.status === "full"
  ) {
    throw new MemberSyncError(
      getReferralLimitReachedMessage({
        code: incomingReferralState.code,
        count: incomingReferralState.completedReferrals,
        locale: resolvedLocale,
      }),
      409,
    );
  }

  const referrer = await resolveReferrer({
    email,
    referredByCode:
      incomingReferralState?.status === "available"
        ? incomingReferralState.code
        : null,
  });

  await collection.updateOne(
    { email },
    {
      $addToSet: {
        walletAddresses: normalizedWalletAddress,
      },
      $set: {
        awaitingPaymentSince: shouldResetPaymentWindow
          ? now
          : existingMember?.awaitingPaymentSince ?? now,
        chainId: input.chainId,
        chainName,
        lastConnectedAt: now,
        lastWalletAddress: normalizedWalletAddress,
        locale,
        paymentAmount: null,
        paymentBackfillCheckedAt: shouldResetPaymentWindow
          ? null
          : existingMember?.paymentBackfillCheckedAt ?? null,
        paymentReceivedAt: null,
        paymentTransactionHash: null,
        paymentWebhookEventId: null,
        referredByCode:
          existingMember?.referredByCode ?? referrer.referredByCode ?? null,
        referredByEmail:
          existingMember?.referredByEmail ?? referrer.referredByEmail ?? null,
        requiredDepositAmount: MEMBER_SIGNUP_USDT_AMOUNT,
        requiredDepositAmountWei: MEMBER_SIGNUP_USDT_AMOUNT_WEI,
        status: "pending_payment",
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const member = await getFreshMemberOrThrow(collection, email);
  const finalized = await maybeCompleteMemberWithStoredPayment({
    collection,
    member,
  });

  return {
    justCompleted: finalized.justCompleted,
    member: serializeMember(finalized.member),
  };
}

export async function completePendingMembersForWebhookEvent(
  event: ThirdwebWebhookEventDocument,
) {
  if (event.direction !== "inbound" || event.amount !== MEMBER_SIGNUP_USDT_AMOUNT_WEI) {
    return 0;
  }

  const collection = await getMembersCollection();
  const pendingMember = await collection.findOne(
    {
      awaitingPaymentSince: {
        $lte: new Date(event.blockTimestamp * 1000),
      },
      lastWalletAddress: event.fromAddress,
      status: "pending_payment",
    },
    {
      sort: {
        awaitingPaymentSince: -1,
      },
    },
  );

  if (!pendingMember) {
    return 0;
  }

  const result = await maybeCompleteMemberWithStoredPayment({
    collection,
    member: pendingMember,
    matchedEvent: event,
  });

  return result.justCompleted ? 1 : 0;
}
