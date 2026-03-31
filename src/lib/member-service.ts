import "server-only";

import { randomInt } from "node:crypto";

import {
  getMembersCollection,
  getThirdwebWebhookEventsCollection,
} from "@/lib/mongodb";
import type {
  MemberDocument,
  SyncMemberRequest,
  SyncMemberResponse,
} from "@/lib/member";
import {
  MEMBER_SIGNUP_USDT_AMOUNT,
  MEMBER_SIGNUP_USDT_AMOUNT_WEI,
  normalizeEmail,
  normalizeReferralCode,
  serializeMember,
} from "@/lib/member";
import {
  normalizeAddress,
  type ThirdwebWebhookEventDocument,
} from "@/lib/thirdweb-webhooks";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;

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

  if (!paymentEvent) {
    return {
      justCompleted: false,
      member: await getFreshMemberOrThrow(collection, member.email),
    };
  }

  await markMemberAsCompleted({
    collection,
    event: paymentEvent,
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
  const referrer = await resolveReferrer({
    email,
    referredByCode,
  });

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
