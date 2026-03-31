import { randomInt } from "node:crypto";

import { getMembersCollection } from "@/lib/mongodb";
import type {
  MemberDocument,
  SyncMemberRequest,
  SyncMemberResponse,
} from "@/lib/member";
import {
  normalizeEmail,
  normalizeReferralCode,
  serializeMember,
} from "@/lib/member";

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

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function updateExistingMember({
  chainId,
  chainName,
  collection,
  email,
  locale,
  member,
  now,
  walletAddress,
}: {
  chainId: number;
  chainName: string;
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  email: string;
  locale: string;
  member: MemberDocument;
  now: Date;
  walletAddress: string;
}) {
  const baseUpdate = {
    chainId,
    chainName,
    email,
    lastConnectedAt: now,
    lastWalletAddress: walletAddress,
    locale,
    updatedAt: now,
  };

  if (member.referralCode) {
    await collection.updateOne(
      { email },
      {
        $addToSet: {
          walletAddresses: walletAddress,
        },
        $set: baseUpdate,
      },
    );
    return;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const result = await collection.updateOne(
        { email, referralCode: { $exists: false } },
        {
          $addToSet: {
            walletAddresses: walletAddress,
          },
          $set: {
            ...baseUpdate,
            referralCode: generateReferralCode(),
          },
        },
      );

      if (result.matchedCount > 0) {
        return;
      }

      await collection.updateOne(
        { email },
        {
          $addToSet: {
            walletAddresses: walletAddress,
          },
          $set: baseUpdate,
        },
      );
      return;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to assign a referral code.");
}

async function createMember({
  chainId,
  chainName,
  collection,
  email,
  locale,
  now,
  referredByCode,
  referredByEmail,
  walletAddress,
}: {
  chainId: number;
  chainName: string;
  collection: Awaited<ReturnType<typeof getMembersCollection>>;
  email: string;
  locale: string;
  now: Date;
  referredByCode: string | null;
  referredByEmail: string | null;
  walletAddress: string;
}) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const result = await collection.updateOne(
        { email },
        {
          $addToSet: {
            walletAddresses: walletAddress,
          },
          $set: {
            chainId,
            chainName,
            email,
            lastConnectedAt: now,
            lastWalletAddress: walletAddress,
            locale,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            referralCode: generateReferralCode(),
            referredByCode,
            referredByEmail,
          },
        },
        { upsert: true },
      );

      return Boolean(result.upsertedId);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate a unique referral code.");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const collection = await getMembersCollection();
    const member = await collection.findOne({ email: normalizeEmail(rawEmail) });

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    return Response.json({ member: serializeMember(member) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read member.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  let payload: SyncMemberRequest;

  try {
    payload = (await request.json()) as SyncMemberRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const email = normalizeEmail(payload.email ?? "");
  const walletAddress = payload.walletAddress?.trim();
  const chainName = payload.chainName?.trim();
  const locale = payload.locale?.trim();
  const referredByCode = normalizeReferralCode(payload.referredByCode);

  if (!email) {
    return jsonError("email is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!chainName) {
    return jsonError("chainName is required.", 400);
  }

  if (!locale) {
    return jsonError("locale is required.", 400);
  }

  try {
    const collection = await getMembersCollection();
    const now = new Date();
    const existingMember = await collection.findOne({ email });
    const referrer = referredByCode
      ? await collection.findOne({ referralCode: referredByCode })
      : null;

    let isNewMember = false;

    if (existingMember) {
      await updateExistingMember({
        chainId: payload.chainId,
        chainName,
        collection,
        email,
        locale,
        member: existingMember,
        now,
        walletAddress,
      });
    } else {
      isNewMember = await createMember({
        chainId: payload.chainId,
        chainName,
        collection,
        email,
        locale,
        now,
        referredByCode,
        referredByEmail: referrer?.email ?? null,
        walletAddress,
      });
    }

    const member = await collection.findOne({ email });

    if (!member) {
      return jsonError("Member sync failed.", 500);
    }

    const response: SyncMemberResponse = {
      isNewMember,
      member: serializeMember(member),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync member.";

    return jsonError(message, 500);
  }
}
