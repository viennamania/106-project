import "server-only";

import type { FanletterFounderRole } from "@/lib/fanletter-founder-club";
import { normalizeEmail } from "@/lib/member";
import {
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarsCollection,
  getMembersCollection,
} from "@/lib/mongodb";

export type FanletterAIStarSocialConnectPermissionReason =
  | "ai_star_not_found"
  | "completed_member_required"
  | "creator_or_owner_required"
  | "member_session_required"
  | "ok";

export type FanletterAIStarSocialConnectServerPermission = {
  allowed: boolean;
  memberEmail: string | null;
  membershipRole: FanletterFounderRole | null;
  reason: FanletterAIStarSocialConnectPermissionReason;
  requiredRoles: ["creator", "owner"];
  role: "creator" | "owner" | null;
  source: "server";
  starOwnerEmail: string | null;
};

export function getFanletterAIStarSocialConnectPermissionStatus(
  reason: FanletterAIStarSocialConnectPermissionReason,
) {
  if (reason === "member_session_required") {
    return 401;
  }

  if (reason === "ai_star_not_found") {
    return 404;
  }

  return 403;
}

export async function resolveFanletterAIStarSocialConnectServerPermission({
  memberEmail,
  starId,
}: {
  memberEmail?: string | null;
  starId: string;
}): Promise<FanletterAIStarSocialConnectServerPermission> {
  const normalizedMemberEmail = normalizeEmail(memberEmail ?? "");
  const basePermission = {
    memberEmail: normalizedMemberEmail || null,
    membershipRole: null,
    requiredRoles: ["creator", "owner"] as ["creator", "owner"],
    role: null,
    source: "server" as const,
    starOwnerEmail: null,
  };

  if (!normalizedMemberEmail) {
    return {
      ...basePermission,
      allowed: false,
      reason: "member_session_required",
    };
  }

  const [membersCollection, membershipsCollection, starsCollection] =
    await Promise.all([
      getMembersCollection(),
      getFanletterStarFounderMembershipsCollection(),
      getFanletterStarsCollection(),
    ]);
  const [member, membership, star] = await Promise.all([
    membersCollection.findOne(
      { email: normalizedMemberEmail },
      {
        projection: {
          email: 1,
          status: 1,
        },
      },
    ),
    membershipsCollection.findOne(
      { memberEmail: normalizedMemberEmail, starId },
      { projection: { role: 1 } },
    ),
    starsCollection.findOne(
      { starId, status: { $ne: "archived" } },
      { projection: { ownerEmail: 1 } },
    ),
  ]);
  const starOwnerEmail = normalizeEmail(star?.ownerEmail ?? "");
  const membershipRole = membership?.role ?? null;

  if (!member || member.status !== "completed") {
    return {
      ...basePermission,
      allowed: false,
      membershipRole,
      reason: "completed_member_required",
      starOwnerEmail: starOwnerEmail || null,
    };
  }

  if (!star) {
    return {
      ...basePermission,
      allowed: false,
      membershipRole,
      reason: "ai_star_not_found",
    };
  }

  if (starOwnerEmail && starOwnerEmail === normalizedMemberEmail) {
    return {
      ...basePermission,
      allowed: true,
      membershipRole,
      reason: "ok",
      role: "owner",
      starOwnerEmail,
    };
  }

  if (membershipRole === "creator") {
    return {
      ...basePermission,
      allowed: true,
      membershipRole,
      reason: "ok",
      role: "creator",
      starOwnerEmail: starOwnerEmail || null,
    };
  }

  return {
    ...basePermission,
    allowed: false,
    membershipRole,
    reason: "creator_or_owner_required",
    starOwnerEmail: starOwnerEmail || null,
  };
}
