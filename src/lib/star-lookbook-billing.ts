import "server-only";

import { normalizeEmail } from "@/lib/member";
import {
  getMongoClient,
  getPointBalancesCollection,
  getPointLedgerCollection,
} from "@/lib/mongodb";
import type { PointsSummaryRecord } from "@/lib/points";
import { syncPointLedgerForMemberEmail } from "@/lib/points-service";
import { computeLookbookPointCost } from "@/lib/star-lookbook-pricing";

/**
 * Points billing for the AI star lookbook studio.
 *
 * Mirrors the spend/rollback transaction pattern used by
 * `redeemRewardForMember` in points-service.ts:
 *  - charge: atomic guard-decrement of spendablePoints ($gte cost) + a negative
 *    ledger entry, then re-sync the aggregate balance.
 *  - refund: increment + a positive rollback ledger entry, then re-sync.
 *
 * Charge BEFORE generation; refund if generation fails.
 */

export const INSUFFICIENT_POINTS_ERROR = "INSUFFICIENT_LOOKBOOK_POINTS";

function chargeLedgerEntryId(memberEmail: string, sourceId: string) {
  return `${memberEmail}:lookbook_generation:${sourceId}`;
}

function refundLedgerEntryId(memberEmail: string, sourceId: string) {
  return `${memberEmail}:lookbook_refund:${sourceId}`;
}

export async function chargeLookbookPoints({
  memberEmail,
  numImages,
  sourceId,
}: {
  memberEmail: string;
  numImages: number;
  sourceId: string;
}): Promise<{ chargedPoints: number; summary: PointsSummaryRecord }> {
  const normalizedEmail = normalizeEmail(memberEmail);

  if (!normalizedEmail) {
    throw new Error("memberEmail is required.");
  }

  if (!sourceId.trim()) {
    throw new Error("sourceId is required.");
  }

  const costPoints = computeLookbookPointCost(numImages);

  // Make sure the aggregate balance reflects the full ledger before charging.
  await syncPointLedgerForMemberEmail(normalizedEmail);

  const client = await getMongoClient();
  const [balancesCollection, ledgerCollection] = await Promise.all([
    getPointBalancesCollection(),
    getPointLedgerCollection(),
  ]);
  const session = client.startSession();
  const now = new Date();

  try {
    await session.withTransaction(async () => {
      const balanceUpdate = await balancesCollection.updateOne(
        {
          memberEmail: normalizedEmail,
          spendablePoints: { $gte: costPoints },
        },
        {
          $inc: { spendablePoints: -costPoints },
          $set: { updatedAt: now },
        },
        { session },
      );

      if (balanceUpdate.modifiedCount === 0) {
        throw new Error(INSUFFICIENT_POINTS_ERROR);
      }

      await ledgerCollection.insertOne(
        {
          createdAt: now,
          delta: -costPoints,
          ledgerEntryId: chargeLedgerEntryId(normalizedEmail, sourceId),
          memberEmail: normalizedEmail,
          memo: "lookbook",
          rewardLevel: null,
          sourceId,
          sourceMemberEmail: null,
          sourceType: "lookbook_generation",
          type: "spend",
          updatedAt: now,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const summary = await syncPointLedgerForMemberEmail(normalizedEmail);

  return { chargedPoints: costPoints, summary };
}

export async function refundLookbookPoints({
  chargedPoints,
  memberEmail,
  sourceId,
}: {
  chargedPoints: number;
  memberEmail: string;
  sourceId: string;
}): Promise<void> {
  const normalizedEmail = normalizeEmail(memberEmail);

  if (!normalizedEmail || chargedPoints <= 0 || !sourceId.trim()) {
    return;
  }

  const client = await getMongoClient();
  const [balancesCollection, ledgerCollection] = await Promise.all([
    getPointBalancesCollection(),
    getPointLedgerCollection(),
  ]);
  const session = client.startSession();
  const now = new Date();

  try {
    await session.withTransaction(async () => {
      await balancesCollection.updateOne(
        { memberEmail: normalizedEmail },
        {
          $inc: { spendablePoints: chargedPoints },
          $set: { updatedAt: now },
        },
        { session },
      );

      await ledgerCollection.insertOne(
        {
          createdAt: now,
          delta: chargedPoints,
          ledgerEntryId: refundLedgerEntryId(normalizedEmail, sourceId),
          memberEmail: normalizedEmail,
          memo: "lookbook_refund",
          rewardLevel: null,
          sourceId,
          sourceMemberEmail: null,
          sourceType: "lookbook_generation",
          type: "rollback",
          updatedAt: now,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await syncPointLedgerForMemberEmail(normalizedEmail);
}
