import "server-only";

import type { MemberStatus } from "@/lib/member";
import { normalizeEmail } from "@/lib/member";
import { getMembersCollection } from "@/lib/mongodb";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function validateMemberWalletOwner({
  allowedStatuses = ["completed"],
  email,
  walletAddress,
}: {
  allowedStatuses?: MemberStatus[];
  email: string;
  walletAddress: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const collection = await getMembersCollection();
  const member = await collection.findOne({ email: normalizedEmail });

  if (!member) {
    return {
      error: jsonError("Member not found.", 404),
      member: null,
      normalizedEmail,
    };
  }

  if (!allowedStatuses.includes(member.status)) {
    return {
      error: jsonError("This member status is not authorized for this action.", 403),
      member: null,
      normalizedEmail,
    };
  }

  const knownWallets = new Set(
    [member.lastWalletAddress, ...member.walletAddresses]
      .filter(Boolean)
      .map((address) => normalizeAddress(address)),
  );

  if (!knownWallets.has(normalizedWalletAddress)) {
    return {
      error: jsonError(
        "This wallet is not authorized for the requested member.",
        403,
      ),
      member: null,
      normalizedEmail,
    };
  }

  return {
    error: null,
    member,
    normalizedEmail,
  };
}
