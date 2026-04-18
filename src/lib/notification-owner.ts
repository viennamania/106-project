import "server-only";

import type { MemberStatus } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export async function validateNotificationOwner({
  allowedStatuses = ["completed"],
  email,
  walletAddress,
}: {
  allowedStatuses?: MemberStatus[];
  email: string;
  walletAddress: string;
}) {
  return validateMemberWalletOwner({
    allowedStatuses,
    email,
    walletAddress,
  });
}
