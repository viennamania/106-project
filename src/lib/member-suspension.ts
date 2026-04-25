import "server-only";

import type { getMembersCollection } from "@/lib/mongodb";
import {
  normalizeEmail,
  normalizeReferralCode,
  type MemberDocument,
  type ServiceSuspensionScope,
} from "@/lib/member";

const FORCED_SERVICE_SUSPENSION_ROOT_EMAILS: string[] = [];
const FORCED_SERVICE_SUSPENSION_AT = new Date("2026-04-24T00:00:00.000Z");
const FORCED_SERVICE_SUSPENSION_BY_EMAIL = "system@1066friend.plus";
const MAX_SERVICE_SUSPENSION_REFERRAL_DEPTH = 64;

export const SERVICE_SUSPENDED_ERROR_MESSAGE =
  "This member service is suspended.";

type MembersCollection = Awaited<ReturnType<typeof getMembersCollection>>;
type MemberReferralLineageFields = Pick<
  MemberDocument,
  "placementReferralCode" | "referredByCode" | "sponsorReferralCode"
>;

type MemberServiceSuspensionStatus = {
  suspendedAt: Date;
  suspendedByEmail: string;
  suspendedScope: ServiceSuspensionScope;
};

function getParentReferralCode(member: MemberReferralLineageFields) {
  return normalizeReferralCode(
    member.placementReferralCode ??
      member.sponsorReferralCode ??
      member.referredByCode,
  );
}

function isForcedSuspensionRootEmail(email?: string | null) {
  const normalizedEmail = email ? normalizeEmail(email) : "";
  return FORCED_SERVICE_SUSPENSION_ROOT_EMAILS.includes(normalizedEmail);
}

function createForcedServiceSuspensionStatus(): MemberServiceSuspensionStatus {
  return {
    suspendedAt: FORCED_SERVICE_SUSPENSION_AT,
    suspendedByEmail: FORCED_SERVICE_SUSPENSION_BY_EMAIL,
    suspendedScope: "subtree",
  };
}

function getStoredServiceSuspensionStatus(
  member: MemberDocument,
): MemberServiceSuspensionStatus | null {
  if (!member.serviceSuspendedAt) {
    return null;
  }

  return {
    suspendedAt: member.serviceSuspendedAt,
    suspendedByEmail:
      member.serviceSuspendedByEmail ?? FORCED_SERVICE_SUSPENSION_BY_EMAIL,
    suspendedScope: member.serviceSuspendedScope ?? "member",
  };
}

async function isMemberBelowForcedSuspensionRoot(
  collection: MembersCollection,
  member: MemberDocument,
) {
  if (FORCED_SERVICE_SUSPENSION_ROOT_EMAILS.length === 0) {
    return false;
  }

  if (isForcedSuspensionRootEmail(member.email)) {
    return true;
  }

  if (
    isForcedSuspensionRootEmail(member.placementEmail) ||
    isForcedSuspensionRootEmail(member.sponsorEmail) ||
    isForcedSuspensionRootEmail(member.referredByEmail)
  ) {
    return true;
  }

  const rootMembers = await collection
    .find({
      email: {
        $in: FORCED_SERVICE_SUSPENSION_ROOT_EMAILS,
      },
    })
    .project<Pick<MemberDocument, "email" | "referralCode">>({
      email: 1,
      referralCode: 1,
    })
    .toArray();
  const rootReferralCodes = new Set(
    rootMembers
      .map((rootMember) => normalizeReferralCode(rootMember.referralCode))
      .filter((referralCode): referralCode is string => Boolean(referralCode)),
  );

  if (rootReferralCodes.size === 0) {
    return false;
  }

  const visitedReferralCodes = new Set<string>();
  let currentReferralCode = getParentReferralCode(member);

  for (
    let depth = 0;
    currentReferralCode && depth < MAX_SERVICE_SUSPENSION_REFERRAL_DEPTH;
    depth += 1
  ) {
    if (rootReferralCodes.has(currentReferralCode)) {
      return true;
    }

    if (visitedReferralCodes.has(currentReferralCode)) {
      return false;
    }

    visitedReferralCodes.add(currentReferralCode);

    const parentMember = await collection.findOne(
      { referralCode: currentReferralCode },
      {
        projection: {
          email: 1,
          placementReferralCode: 1,
          referredByCode: 1,
          sponsorReferralCode: 1,
        },
      },
    );

    if (!parentMember) {
      return false;
    }

    if (isForcedSuspensionRootEmail(parentMember.email)) {
      return true;
    }

    currentReferralCode = getParentReferralCode(parentMember);
  }

  return false;
}

export async function getMemberServiceSuspensionStatus(
  collection: MembersCollection,
  member: MemberDocument,
): Promise<MemberServiceSuspensionStatus | null> {
  const storedStatus = getStoredServiceSuspensionStatus(member);

  if (storedStatus) {
    return storedStatus;
  }

  if (await isMemberBelowForcedSuspensionRoot(collection, member)) {
    return createForcedServiceSuspensionStatus();
  }

  return null;
}

export async function withMemberServiceSuspensionStatus(
  collection: MembersCollection,
  member: MemberDocument,
): Promise<MemberDocument> {
  const suspension = await getMemberServiceSuspensionStatus(collection, member);

  if (!suspension) {
    return member;
  }

  return {
    ...member,
    serviceSuspendedAt: suspension.suspendedAt,
    serviceSuspendedByEmail: suspension.suspendedByEmail,
    serviceSuspendedScope: suspension.suspendedScope,
  };
}
