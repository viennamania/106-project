import "server-only";

import { randomInt } from "node:crypto";

import {
  getMembersCollection,
  getReferralPlacementSlotsCollection,
  getReferralRewardsCollection,
  getThirdwebWebhookEventsCollection,
} from "@/lib/mongodb";
import type {
  IncomingReferralState,
  MemberDocument,
  PlacementSource,
  ReferralPlacementSlotDocument,
  SyncMemberRequest,
  SyncMemberResponse,
} from "@/lib/member";
import {
  MEMBER_SIGNUP_USDT_AMOUNT,
  MEMBER_SIGNUP_USDT_AMOUNT_WEI,
  REFERRAL_SIGNUP_LIMIT,
  REFERRAL_TREE_DEPTH_LIMIT,
  getReferralRewardPoints,
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
} from "@/lib/thirdweb";
import { serverThirdwebClient } from "@/lib/thirdweb-server";
import {
  BSC_CHAIN_ID,
  ERC20_TRANSFER_SIG_HASH,
  extractTrackedTransferEvent,
  normalizeAddress,
  type ThirdwebInsightEventRecord,
  type ThirdwebWebhookEventDocument,
} from "@/lib/thirdweb-webhooks";
import { syncPointLedgerForMemberEmails } from "@/lib/points-service";
import { eth_blockNumber, eth_getBlockByNumber, eth_getLogs, getRpcClient } from "thirdweb/rpc";
import { getWalletBalance } from "thirdweb/wallets";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;
const BACKFILL_MIN_BLOCK_RANGE = BigInt(50_000);
const BACKFILL_MAX_BLOCK_RANGE = BigInt(500_000);
const BACKFILL_BLOCK_BUFFER = BigInt(10_000);
const BACKFILL_INITIAL_LOG_CHUNK = BigInt(5_000);
const BACKFILL_MIN_LOG_CHUNK = BigInt(250);
const BACKFILL_COOLDOWN_MS = 30_000;
const ESTIMATED_BSC_BLOCK_TIME_SECONDS = 3;
const SIGNUP_PAYMENT_LOOKBACK_MS = 60 * 60 * 1000;
const DEFAULT_SIGNUP_SPONSOR_EMAIL = "jasonkim.v@gmail.com";

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

function getDefaultSignupSponsorEmail() {
  const configured = process.env.DEFAULT_SIGNUP_SPONSOR_EMAIL?.trim();
  return normalizeEmail(configured || DEFAULT_SIGNUP_SPONSOR_EMAIL);
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

function getSponsorReferralCode(member: MemberDocument) {
  return member.sponsorReferralCode ?? member.referredByCode ?? null;
}

function getSponsorEmail(member: MemberDocument) {
  return member.sponsorEmail ?? member.referredByEmail ?? null;
}

function getPlacementReferralCode(member: MemberDocument) {
  return member.placementReferralCode ?? member.referredByCode ?? null;
}

function isLockedToDefaultSignupSponsor(member: MemberDocument) {
  const sponsorEmail = getSponsorEmail(member);

  if (!sponsorEmail) {
    return false;
  }

  return sponsorEmail === getDefaultSignupSponsorEmail();
}

async function ensurePlacementSlotsForCompletedMember(
  member: MemberDocument,
) {
  if (member.status !== "completed" || !member.referralCode) {
    return;
  }

  const collection = await getReferralPlacementSlotsCollection();
  const ownerReferralCode = member.referralCode;
  const ownerRegistrationCompletedAt =
    member.registrationCompletedAt ?? member.createdAt;
  const baseTimestamp = ownerRegistrationCompletedAt;

  await collection.bulkWrite(
    Array.from({ length: REFERRAL_SIGNUP_LIMIT }, (_, index) => ({
      updateOne: {
        filter: {
          ownerReferralCode,
          slotIndex: index + 1,
        },
        update: {
          $setOnInsert: {
            claimSource: null,
            claimedAt: null,
            claimedByEmail: null,
            createdAt: baseTimestamp,
            ownerEmail: member.email,
            ownerReferralCode,
            ownerRegistrationCompletedAt,
            slotIndex: index + 1,
            updatedAt: baseTimestamp,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

async function findClaimedPlacementSlotByEmail(email: string) {
  const collection = await getReferralPlacementSlotsCollection();
  return collection.findOne({ claimedByEmail: email });
}

async function getPlacementDescendantReferralCodes({
  collection,
  rootReferralCode,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  rootReferralCode: string;
}) {
  const visitedReferralCodes = new Set<string>([rootReferralCode]);
  const descendantReferralCodes = new Set<string>();
  let currentParentCodes = [rootReferralCode];

  while (currentParentCodes.length > 0) {
    const levelMembers = await collection
      .find({
        placementReferralCode: { $in: currentParentCodes },
        status: "completed",
      })
      .project<{ referralCode?: string | null }>({
        referralCode: 1,
      })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    const nextParentCodes: string[] = [];

    for (const levelMember of levelMembers) {
      const referralCode = normalizeReferralCode(levelMember.referralCode);

      if (!referralCode || visitedReferralCodes.has(referralCode)) {
        continue;
      }

      visitedReferralCodes.add(referralCode);
      descendantReferralCodes.add(referralCode);
      nextParentCodes.push(referralCode);
    }

    currentParentCodes = nextParentCodes;
  }

  return descendantReferralCodes;
}

async function placementWouldCreateCycle({
  collection,
  member,
  slot,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
  slot: Pick<ReferralPlacementSlotDocument, "ownerEmail" | "ownerReferralCode">;
}) {
  if (slot.ownerEmail === member.email) {
    return true;
  }

  if (!member.referralCode) {
    return false;
  }

  const ownerReferralCode = normalizeReferralCode(slot.ownerReferralCode);

  if (!ownerReferralCode) {
    return false;
  }

  if (ownerReferralCode === member.referralCode) {
    return true;
  }

  const descendantReferralCodes = await getPlacementDescendantReferralCodes({
    collection,
    rootReferralCode: member.referralCode,
  });

  return descendantReferralCodes.has(ownerReferralCode);
}

async function releaseClaimedPlacementSlot(
  slot: ReferralPlacementSlotDocument,
) {
  const collection = await getReferralPlacementSlotsCollection();

  await collection.updateOne(
    {
      ownerReferralCode: slot.ownerReferralCode,
      slotIndex: slot.slotIndex,
    },
    {
      $set: {
        claimSource: null,
        claimedAt: null,
        claimedByEmail: null,
        updatedAt: new Date(),
      },
    },
  );
}

async function claimPlacementSlot({
  email,
  filter,
  source,
  sort,
}: {
  email: string;
  filter: Record<string, unknown>;
  source: PlacementSource;
  sort: Record<string, 1 | -1>;
}) {
  const collection = await getReferralPlacementSlotsCollection();
  const existingClaim = await collection.findOne({ claimedByEmail: email });

  if (existingClaim) {
    return existingClaim;
  }

  const now = new Date();

  try {
    const result = await collection.findOneAndUpdate(
      {
        ...filter,
        claimedByEmail: null,
      },
      {
        $set: {
          claimSource: source,
          claimedAt: now,
          claimedByEmail: email,
          updatedAt: now,
        },
      },
      {
        returnDocument: "after",
        sort,
      },
    );

    if (result) {
      return result;
    }
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  return collection.findOne({ claimedByEmail: email });
}

async function claimManualPlacementSlot({
  email,
  sponsor,
}: {
  email: string;
  sponsor: MemberDocument;
}) {
  if (!sponsor.referralCode) {
    return null;
  }

  await ensurePlacementSlotsForCompletedMember(sponsor);

  return claimPlacementSlot({
    email,
    filter: {
      ownerReferralCode: sponsor.referralCode,
    },
    sort: {
      slotIndex: 1,
    },
    source: "manual",
  });
}

async function claimSponsoredOverflowPlacementSlot({
  collection,
  email,
  sponsor,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  email: string;
  sponsor: MemberDocument;
}) {
  const sponsorReferralCode = normalizeReferralCode(sponsor.referralCode);

  if (!sponsorReferralCode) {
    return null;
  }

  const visitedReferralCodes = new Set<string>([sponsorReferralCode]);
  let currentParentCodes = [sponsorReferralCode];

  for (
    let depth = 1;
    depth < REFERRAL_TREE_DEPTH_LIMIT && currentParentCodes.length > 0;
    depth += 1
  ) {
    const levelMembers = await collection
      .find({
        placementReferralCode: { $in: currentParentCodes },
        status: "completed",
      })
      .sort({
        registrationCompletedAt: 1,
        createdAt: 1,
        referralCode: 1,
      })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    await Promise.all(
      levelMembers.map((levelMember) =>
        ensurePlacementSlotsForCompletedMember(levelMember),
      ),
    );

    const nextParentCodes: string[] = [];

    for (const levelMember of levelMembers) {
      const levelReferralCode = normalizeReferralCode(levelMember.referralCode);

      if (!levelReferralCode || visitedReferralCodes.has(levelReferralCode)) {
        continue;
      }

      visitedReferralCodes.add(levelReferralCode);
      nextParentCodes.push(levelReferralCode);
    }

    if (nextParentCodes.length === 0) {
      break;
    }

    const overflowSlot = await claimPlacementSlot({
      email,
      filter: {
        ownerReferralCode: {
          $in: nextParentCodes,
        },
      },
      sort: {
        ownerRegistrationCompletedAt: 1,
        ownerReferralCode: 1,
        slotIndex: 1,
      },
      source: "auto",
    });

    if (overflowSlot) {
      return overflowSlot;
    }

    currentParentCodes = nextParentCodes;
  }

  return null;
}

async function claimAutoPlacementSlot({
  collection,
  member,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
}) {
  const blockedOwnerReferralCodes = member.referralCode
    ? [
        member.referralCode,
        ...(await getPlacementDescendantReferralCodes({
          collection,
          rootReferralCode: member.referralCode,
        })),
      ]
    : [];

  return claimPlacementSlot({
    email: member.email,
    filter: {
      ownerEmail: {
        $ne: member.email,
      },
      ...(blockedOwnerReferralCodes.length > 0
        ? {
            ownerReferralCode: {
              $nin: blockedOwnerReferralCodes,
            },
          }
        : {}),
    },
    sort: {
      ownerRegistrationCompletedAt: 1,
      ownerReferralCode: 1,
      slotIndex: 1,
    },
    source: "auto",
  });
}

async function applyPlacementFromSlot({
  collection,
  member,
  slot,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
  slot: ReferralPlacementSlotDocument;
}) {
  const placementAssignedAt = slot.claimedAt ?? new Date();

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        placementAssignedAt,
        placementEmail: slot.ownerEmail,
        placementReferralCode: slot.ownerReferralCode,
        placementSource: slot.claimSource,
        updatedAt: placementAssignedAt,
      },
    },
  );

  return getFreshMemberOrThrow(collection, member.email);
}

async function ensurePlacementAssigned({
  collection,
  member,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
}) {
  if (member.status !== "completed") {
    return member;
  }

  if (member.placementReferralCode) {
    return member;
  }

  const existingSlot = await findClaimedPlacementSlotByEmail(member.email);

  if (existingSlot) {
    if (
      !(await placementWouldCreateCycle({
        collection,
        member,
        slot: existingSlot,
      }))
    ) {
      return applyPlacementFromSlot({
        collection,
        member,
        slot: existingSlot,
      });
    }

    if (existingSlot.claimSource === "auto") {
      await releaseClaimedPlacementSlot(existingSlot);
    } else {
      return member;
    }
  }

  const sponsorReferralCode = getSponsorReferralCode(member);

  if (sponsorReferralCode) {
    const sponsor = await collection.findOne({
      referralCode: sponsorReferralCode,
      status: "completed",
    });

    if (sponsor) {
      const manualSlot = await claimManualPlacementSlot({
        email: member.email,
        sponsor,
      });

      if (manualSlot) {
        return applyPlacementFromSlot({
          collection,
          member,
          slot: manualSlot,
        });
      }

      const overflowSlot = await claimSponsoredOverflowPlacementSlot({
        collection,
        email: member.email,
        sponsor,
      });

      if (overflowSlot) {
        if (
          await placementWouldCreateCycle({
            collection,
            member,
            slot: overflowSlot,
          })
        ) {
          if (overflowSlot.claimSource === "auto") {
            await releaseClaimedPlacementSlot(overflowSlot);
          }
        } else {
          return applyPlacementFromSlot({
            collection,
            member,
            slot: overflowSlot,
          });
        }
      }
    }
  }

  if (isLockedToDefaultSignupSponsor(member)) {
    return member;
  }

  const autoSlot = await claimAutoPlacementSlot({
    collection,
    member,
  });

  if (!autoSlot) {
    return member;
  }

  if (
    await placementWouldCreateCycle({
      collection,
      member,
      slot: autoSlot,
    })
  ) {
    if (autoSlot.claimSource === "auto") {
      await releaseClaimedPlacementSlot(autoSlot);
    }

    return member;
  }

  return applyPlacementFromSlot({
    collection,
    member,
    slot: autoSlot,
  });
}

async function finalizeCompletedMember({
  collection,
  member,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
}) {
  if (member.status !== "completed") {
    return member;
  }

  let nextMember = await ensurePlacementAssigned({
    collection,
    member,
  });

  await ensurePlacementSlotsForCompletedMember(nextMember);

  nextMember = await ensureReferralRewardsIssued({
    collection,
    member: nextMember,
  });

  return nextMember;
}

async function awardReferralRewardsForCompletedMember({
  collection,
  member,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
}) {
  const rewardsCollection = await getReferralRewardsCollection();
  const awardedAt = member.registrationCompletedAt ?? new Date();
  const seenReferralCodes = new Set<string>();
  const seenRecipientEmails = new Set<string>([member.email]);
  const recipientEmailsToSync = new Set<string>();
  let currentReferralCode = getPlacementReferralCode(member);

  for (
    let level = 1;
    level <= REFERRAL_TREE_DEPTH_LIMIT && currentReferralCode;
    level += 1
  ) {
    if (seenReferralCodes.has(currentReferralCode)) {
      break;
    }

    seenReferralCodes.add(currentReferralCode);

    const recipient = await collection.findOne({
      referralCode: currentReferralCode,
      status: "completed",
    });

    if (!recipient) {
      break;
    }

    if (!seenRecipientEmails.has(recipient.email)) {
      try {
        await rewardsCollection.updateOne(
          {
            recipientEmail: recipient.email,
            sourceMemberEmail: member.email,
          },
          {
            $setOnInsert: {
              awardedAt,
              createdAt: new Date(),
              level,
              points: getReferralRewardPoints(level),
              recipientEmail: recipient.email,
              recipientReferralCode: recipient.referralCode ?? null,
              sourceMemberEmail: member.email,
              sourceMemberReferralCode: member.referralCode ?? null,
              sourcePaymentTransactionHash: member.paymentTransactionHash ?? null,
              sourceRegistrationCompletedAt: awardedAt,
              sourceWalletAddress: member.lastWalletAddress,
            },
          },
          { upsert: true },
        );
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
      }

      seenRecipientEmails.add(recipient.email);
      recipientEmailsToSync.add(recipient.email);
    }

    currentReferralCode = getPlacementReferralCode(recipient);
  }

  if (recipientEmailsToSync.size > 0) {
    await syncPointLedgerForMemberEmails([...recipientEmailsToSync]);
  }
}

async function ensureReferralRewardsIssued({
  collection,
  member,
}: {
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  member: MemberDocument;
}) {
  if (member.status !== "completed" || member.referralRewardsIssuedAt) {
    return member;
  }

  await awardReferralRewardsForCompletedMember({
    collection,
    member,
  });

  await collection.updateOne(
    { email: member.email, status: "completed" },
    {
      $set: {
        referralRewardsIssuedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return getFreshMemberOrThrow(collection, member.email);
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

function getInsufficientBalanceMessage(locale: Locale) {
  return formatTemplate(
    getDictionary(locale).member.errors.insufficientBalance,
    {
      amount: MEMBER_SIGNUP_USDT_AMOUNT,
    },
  );
}

async function getSignupWalletBalanceValidationError({
  locale,
  walletAddress,
}: {
  locale: Locale;
  walletAddress: string;
}) {
  const balance = await getWalletBalance({
    address: walletAddress,
    chain: smartWalletChain,
    client: serverThirdwebClient,
    tokenAddress: BSC_USDT_ADDRESS,
  });

  if (balance.value < BigInt(MEMBER_SIGNUP_USDT_AMOUNT_WEI)) {
    return getInsufficientBalanceMessage(locale);
  }

  return null;
}

function getSignupPaymentWindowStart(now: Date) {
  // Allow short delays where the transfer is sent moments before the pending
  // member record is first created or the wallet session is re-synced.
  return new Date(now.getTime() - SIGNUP_PAYMENT_LOOKBACK_MS);
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

function getSmallerBlockChunk(blockChunk: bigint) {
  const nextChunk = blockChunk / BigInt(2);

  return nextChunk >= BACKFILL_MIN_LOG_CHUNK
    ? nextChunk
    : BACKFILL_MIN_LOG_CHUNK;
}

function isRpcLimitExceededError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === -32005
  ) {
    return true;
  }

  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("limit exceeded")
  );
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
  try {
    const projectWallet = getProjectWallet();
    const collection = await getThirdwebWebhookEventsCollection();
    const rpcClient = getRpcClient({
      chain: smartWalletChain,
      client: serverThirdwebClient,
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
    const topics: `0x${string}`[] = [
      ERC20_TRANSFER_SIG_HASH as `0x${string}`,
      encodeTopicAddress(member.lastWalletAddress),
      encodeTopicAddress(projectWallet),
    ];
    const blockTimestampCache = new Map<bigint, number>();
    let chunkFrom = fromBlock;

    while (chunkFrom <= latestBlock) {
      let chunkSize =
        latestBlock - chunkFrom + BigInt(1) < BACKFILL_INITIAL_LOG_CHUNK
          ? latestBlock - chunkFrom + BigInt(1)
          : BACKFILL_INITIAL_LOG_CHUNK;

      let logs;
      let chunkTo;

      while (true) {
        chunkTo =
          chunkFrom + chunkSize - BigInt(1) > latestBlock
            ? latestBlock
            : chunkFrom + chunkSize - BigInt(1);

        try {
          logs = await eth_getLogs(rpcClient, {
            address: BSC_USDT_ADDRESS,
            fromBlock: chunkFrom,
            toBlock: chunkTo,
            topics,
          });
          break;
        } catch (error) {
          if (
            !isRpcLimitExceededError(error) ||
            chunkSize <= BACKFILL_MIN_LOG_CHUNK
          ) {
            throw error;
          }

          chunkSize = getSmallerBlockChunk(chunkSize);
        }
      }

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

      if (chunkTo === latestBlock) {
        break;
      }

      chunkFrom = chunkTo + BigInt(1);
    }
  } catch (error) {
    console.error("[member-service] signup payment backfill failed", {
      error,
      walletAddress: member.lastWalletAddress,
    });
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
    referralRewardsIssuedAt: null,
    registrationCompletedAt: completedAt,
    status: "completed" as const,
    updatedAt: completedAt,
  };

  if (member.referralCode) {
    const result = await collection.updateOne(
      { email: member.email, status: "pending_payment" },
      {
        $set: baseUpdate,
      },
    );

    const nextMember = await getFreshMemberOrThrow(collection, member.email);

    if (result.matchedCount > 0) {
      return finalizeCompletedMember({
        collection,
        member: nextMember,
      });
    }

    return nextMember;
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
        const nextMember = await getFreshMemberOrThrow(collection, member.email);
        return finalizeCompletedMember({
          collection,
          member: nextMember,
        });
      }

      break;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  const result = await collection.updateOne(
    { email: member.email, status: "pending_payment" },
    {
      $set: baseUpdate,
    },
  );

  const nextMember = await getFreshMemberOrThrow(collection, member.email);

  if (result.matchedCount > 0) {
    return finalizeCompletedMember({
      collection,
      member: nextMember,
    });
  }

  return nextMember;
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
    const nextMember = await finalizeCompletedMember({
      collection,
      member,
    });

    return {
      justCompleted: false,
      member: nextMember,
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

  const nextMember = await markMemberAsCompleted({
    collection,
    event: resolvedPaymentEvent,
    member,
  });

  return {
    justCompleted: nextMember.status === "completed",
    member: nextMember,
  };
}

export async function getMemberRegistrationStatus(emailInput: string) {
  const email = normalizeEmail(emailInput);

  if (!email) {
    throw new Error("email is required.");
  }

  const collection = await getMembersCollection();
  const member = await collection.findOne({ email });

  if (!member) {
    return null;
  }

  const finalized = await maybeCompleteMemberWithStoredPayment({
    collection,
    member,
  });

  return finalized.member;
}

function normalizeReconcileEmail(email?: string | null) {
  if (typeof email !== "string") {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail || null;
}

function resolveReconcileLimit(limit?: number | null) {
  const parsedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.trunc(limit)
      : 25;

  return Math.min(Math.max(parsedLimit, 1), 100);
}

export async function reconcilePendingMemberRegistrations(options?: {
  email?: string | null;
  limit?: number | null;
}) {
  const normalizedEmail = normalizeReconcileEmail(options?.email);
  const limit = resolveReconcileLimit(options?.limit);
  const collection = await getMembersCollection();
  const pendingMembers = await collection
    .find({
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      status: "pending_payment",
    })
    .sort({
      awaitingPaymentSince: 1,
    })
    .limit(limit)
    .toArray();

  let completed = 0;
  let stillPending = 0;
  const members = [];

  for (const member of pendingMembers) {
    const finalized = await maybeCompleteMemberWithStoredPayment({
      collection,
      member,
    });

    if (finalized.justCompleted) {
      completed += 1;
    }

    if (finalized.member.status === "pending_payment") {
      stillPending += 1;
    }

    members.push({
      awaitingPaymentSince: finalized.member.awaitingPaymentSince,
      email: finalized.member.email,
      justCompleted: finalized.justCompleted,
      paymentReceivedAt: finalized.member.paymentReceivedAt ?? null,
      paymentTransactionHash: finalized.member.paymentTransactionHash ?? null,
      status: finalized.member.status,
      walletAddress: finalized.member.lastWalletAddress,
    });
  }

  return {
    checked: pendingMembers.length,
    completed,
    limit,
    members,
    stillPending,
  };
}

export async function reconcileCompletedMemberNetworks(options?: {
  email?: string | null;
  limit?: number | null;
}) {
  const normalizedEmail = normalizeReconcileEmail(options?.email);
  const limit = resolveReconcileLimit(options?.limit);
  const collection = await getMembersCollection();
  const completedMembers = await collection
    .find({
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      status: "completed",
    })
    .sort({
      registrationCompletedAt: 1,
      createdAt: 1,
    })
    .limit(limit)
    .toArray();

  let reconciled = 0;
  const members = [];

  for (const member of completedMembers) {
    const beforePlacementReferralCode = member.placementReferralCode ?? null;
    const beforeRewardsIssuedAt = member.referralRewardsIssuedAt ?? null;
    const nextMember = await finalizeCompletedMember({
      collection,
      member,
    });
    const placementChanged =
      (nextMember.placementReferralCode ?? null) !== beforePlacementReferralCode;
    const rewardsIssued =
      beforeRewardsIssuedAt === null &&
      nextMember.referralRewardsIssuedAt instanceof Date;

    if (placementChanged || rewardsIssued) {
      reconciled += 1;
    }

    members.push({
      email: nextMember.email,
      placementChanged,
      placementReferralCode: nextMember.placementReferralCode ?? null,
      referralRewardsIssuedAt:
        nextMember.referralRewardsIssuedAt?.toISOString() ?? null,
      rewardsIssued,
      status: nextMember.status,
    });
  }

  return {
    checked: completedMembers.length,
    limit,
    members,
    reconciled,
  };
}

async function resolveSponsor({
  email,
  sponsorReferralCode,
}: {
  email: string;
  sponsorReferralCode: string | null;
}) {
  if (!sponsorReferralCode) {
    return {
      sponsorEmail: null,
      sponsorMember: null,
      sponsorReferralCode: null,
    };
  }

  const collection = await getMembersCollection();
  const sponsorMember = await collection.findOne({
    referralCode: sponsorReferralCode,
    status: "completed",
  });

  if (!sponsorMember || sponsorMember.email === email) {
    return {
      sponsorEmail: null,
      sponsorMember: null,
      sponsorReferralCode: null,
    };
  }

  return {
    sponsorEmail: sponsorMember.email,
    sponsorMember,
    sponsorReferralCode,
  };
}

async function resolveDefaultSignupSponsor(email: string) {
  const sponsorEmail = getDefaultSignupSponsorEmail();

  if (!sponsorEmail || sponsorEmail === email) {
    return {
      sponsorEmail: null,
      sponsorMember: null,
      sponsorReferralCode: null,
    };
  }

  const collection = await getMembersCollection();
  const sponsorMember = await collection.findOne({
    email: sponsorEmail,
    status: "completed",
  });

  if (!sponsorMember?.referralCode) {
    throw new Error(
      `Default signup sponsor is not available as a completed member: ${sponsorEmail}`,
    );
  }

  return {
    sponsorEmail: sponsorMember.email,
    sponsorMember,
    sponsorReferralCode: sponsorMember.referralCode,
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
      signupCount: 0,
      limit: REFERRAL_SIGNUP_LIMIT,
      status: "invalid",
    };
  }

  await ensurePlacementSlotsForCompletedMember(referrer);

  const slotsCollection = await getReferralPlacementSlotsCollection();
  const signupCount = await slotsCollection.countDocuments({
    ownerReferralCode: referredByCode,
    claimedByEmail: {
      $type: "string",
    },
  });

  return {
    code: referredByCode,
    signupCount,
    limit: REFERRAL_SIGNUP_LIMIT,
    status: signupCount >= REFERRAL_SIGNUP_LIMIT ? "full" : "available",
  };
}

export async function syncReferralRewardsForCompletedNetwork(
  rootMember: MemberDocument,
) {
  if (rootMember.status !== "completed" || !rootMember.referralCode) {
    return;
  }

  const collection = await getMembersCollection();
  const rootWithRewards = await finalizeCompletedMember({
    collection,
    member: rootMember,
  });
  const visitedReferralCodes = new Set<string>([
    rootWithRewards.referralCode ?? rootMember.referralCode,
  ]);
  let currentParentCodes = [rootWithRewards.referralCode ?? rootMember.referralCode];

  for (
    let depth = 1;
    depth <= REFERRAL_TREE_DEPTH_LIMIT && currentParentCodes.length > 0;
    depth += 1
  ) {
    const levelMembers = await collection
      .find({
        placementReferralCode: { $in: currentParentCodes },
        status: "completed",
      })
      .sort({ registrationCompletedAt: -1, createdAt: -1 })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    for (const levelMember of levelMembers) {
      await finalizeCompletedMember({
        collection,
        member: levelMember,
      });
    }

    const nextParentCodes: string[] = [];

    for (const levelMember of levelMembers) {
      if (
        levelMember.referralCode &&
        !visitedReferralCodes.has(levelMember.referralCode)
      ) {
        visitedReferralCodes.add(levelMember.referralCode);
        nextParentCodes.push(levelMember.referralCode);
      }
    }

    currentParentCodes = nextParentCodes;
  }
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
  const syncMode = input.syncMode === "light" ? "light" : "full";

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
  const existingSponsorReferralCode = existingMember
    ? getSponsorReferralCode(existingMember)
    : null;
  const existingSponsorEmail = existingMember
    ? getSponsorEmail(existingMember)
    : null;
  const effectiveSponsorReferralCode =
    existingMember?.referralCode === referredByCode ? null : referredByCode;

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

    const nextMember = await finalizeCompletedMember({
      collection,
      member: await getFreshMemberOrThrow(collection, email),
    });

    return {
      justCompleted: false,
      member: serializeMember(nextMember),
      validationError: null,
    };
  }

  const shouldResetPaymentWindow =
    !existingMember ||
    existingMember.lastWalletAddress !== normalizedWalletAddress;
  const shouldRunInitialBalanceValidation =
    syncMode === "full" && shouldResetPaymentWindow;
  const balanceValidationError = shouldRunInitialBalanceValidation
    ? await getSignupWalletBalanceValidationError({
        locale: resolvedLocale,
        walletAddress: normalizedWalletAddress,
      })
    : null;

  const incomingReferralState = await getIncomingReferralState(
    effectiveSponsorReferralCode,
  );
  const sponsorReferralCodeForSync =
    existingSponsorReferralCode ??
    (incomingReferralState && incomingReferralState.status !== "invalid"
      ? incomingReferralState.code
      : null);
  const shouldApplyDefaultSponsor =
    !existingSponsorReferralCode && !referredByCode;
  const sponsor = sponsorReferralCodeForSync
    ? await resolveSponsor({
        email,
        sponsorReferralCode: sponsorReferralCodeForSync,
      })
    : shouldApplyDefaultSponsor
      ? await resolveDefaultSignupSponsor(email)
      : {
          sponsorEmail: null,
          sponsorMember: null,
          sponsorReferralCode: null,
        };

  await collection.updateOne(
    { email },
    {
      $addToSet: {
        walletAddresses: normalizedWalletAddress,
      },
      $set: {
        awaitingPaymentSince: shouldResetPaymentWindow
          ? getSignupPaymentWindowStart(now)
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
        placementAssignedAt: existingMember?.placementAssignedAt ?? null,
        placementEmail: existingMember?.placementEmail ?? null,
        placementReferralCode: existingMember?.placementReferralCode ?? null,
        placementSource: existingMember?.placementSource ?? null,
        referralRewardsIssuedAt: existingMember?.referralRewardsIssuedAt ?? null,
        referredByCode:
          existingMember?.referredByCode ??
          existingSponsorReferralCode ??
          sponsor.sponsorReferralCode ??
          null,
        referredByEmail:
          existingMember?.referredByEmail ??
          existingSponsorEmail ??
          sponsor.sponsorEmail ??
          null,
        requiredDepositAmount: MEMBER_SIGNUP_USDT_AMOUNT,
        requiredDepositAmountWei: MEMBER_SIGNUP_USDT_AMOUNT_WEI,
        sponsorEmail:
          existingMember?.sponsorEmail ??
          existingSponsorEmail ??
          sponsor.sponsorEmail ??
          null,
        sponsorReferralCode:
          existingMember?.sponsorReferralCode ??
          existingSponsorReferralCode ??
          sponsor.sponsorReferralCode ??
          null,
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

  if (syncMode === "light") {
    return {
      justCompleted: false,
      member: serializeMember(member),
      validationError: null,
    };
  }

  const finalized = await maybeCompleteMemberWithStoredPayment({
    collection,
    member,
  });

  return {
    justCompleted: finalized.justCompleted,
    member: serializeMember(finalized.member),
    validationError:
      finalized.member.status === "pending_payment"
        ? balanceValidationError
        : null,
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
