import "server-only";

import type { FanletterCharacterFollowStateResponse } from "@/lib/content";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import {
  getFanletterCharacterFollowsCollection,
  getMembersCollection,
} from "@/lib/mongodb";

async function resolveFanletterFollowCreator(referralCode?: string | null) {
  const creatorReferralCode = normalizeReferralCode(referralCode);

  if (!creatorReferralCode) {
    throw new Error("creatorReferralCode is required.");
  }

  const membersCollection = await getMembersCollection();
  const creator = await membersCollection.findOne({
    referralCode: creatorReferralCode,
    status: "completed",
  });

  if (!creator) {
    throw new Error("Creator not found.");
  }

  return {
    creatorEmail: creator.email,
    creatorReferralCode,
  };
}

function normalizeFollowerEmail(value?: string | null) {
  return normalizeEmail(value ?? "") || null;
}

export async function getFanletterFollowState({
  creatorReferralCode,
  followerEmail,
}: {
  creatorReferralCode?: string | null;
  followerEmail?: string | null;
}): Promise<FanletterCharacterFollowStateResponse> {
  const creator = await resolveFanletterFollowCreator(creatorReferralCode);
  const normalizedFollowerEmail = normalizeFollowerEmail(followerEmail);
  const followsCollection = await getFanletterCharacterFollowsCollection();
  const [followerCount, follow] = await Promise.all([
    followsCollection.countDocuments({
      creatorReferralCode: creator.creatorReferralCode,
    }),
    normalizedFollowerEmail
      ? followsCollection.findOne({
          creatorReferralCode: creator.creatorReferralCode,
          followerEmail: normalizedFollowerEmail,
        })
      : Promise.resolve(null),
  ]);

  return {
    followed: Boolean(follow),
    followerCount,
  };
}

export async function updateFanletterFollowForMember({
  action,
  creatorReferralCode,
  followerEmail,
}: {
  action?: "follow" | "unfollow" | null;
  creatorReferralCode?: string | null;
  followerEmail?: string | null;
}): Promise<FanletterCharacterFollowStateResponse> {
  const creator = await resolveFanletterFollowCreator(creatorReferralCode);
  const normalizedFollowerEmail = normalizeFollowerEmail(followerEmail);

  if (!normalizedFollowerEmail) {
    throw new Error("followerEmail is required.");
  }

  if (action !== "follow" && action !== "unfollow") {
    throw new Error("Unsupported follow action.");
  }

  const followsCollection = await getFanletterCharacterFollowsCollection();
  const now = new Date();

  if (action === "unfollow") {
    await followsCollection.deleteOne({
      creatorReferralCode: creator.creatorReferralCode,
      followerEmail: normalizedFollowerEmail,
    });
  } else {
    await followsCollection.updateOne(
      {
        creatorReferralCode: creator.creatorReferralCode,
        followerEmail: normalizedFollowerEmail,
      },
      {
        $set: {
          creatorEmail: creator.creatorEmail,
          creatorReferralCode: creator.creatorReferralCode,
          followerEmail: normalizedFollowerEmail,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  return getFanletterFollowState({
    creatorReferralCode: creator.creatorReferralCode,
    followerEmail: normalizedFollowerEmail,
  });
}
