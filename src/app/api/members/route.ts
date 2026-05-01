import {
  MemberSyncError,
  syncMemberRegistration,
} from "@/lib/member-service";
import {
  getMembersCollection,
  getReferralPlacementSlotsCollection,
} from "@/lib/mongodb";
import type { SyncMemberRequest } from "@/lib/member";
import { normalizeEmail, serializeMember } from "@/lib/member";
import {
  readMemberServerSession,
  setMemberServerSessionCookie,
} from "@/lib/member-server-session";
import { withMemberServiceSuspensionStatus } from "@/lib/member-suspension";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const session = rawEmail ? null : await readMemberServerSession();
  const effectiveEmail = rawEmail ?? session?.email ?? null;

  if (!effectiveEmail) {
    return jsonError("email query parameter or member session is required.", 401);
  }

  try {
    const membersCollection = await getMembersCollection();
    const member = await membersCollection.findOne({
      email: normalizeEmail(effectiveEmail),
    });

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    const memberWithServiceSuspension =
      await withMemberServiceSuspensionStatus(membersCollection, member);
    const placementSlotsCollection = await getReferralPlacementSlotsCollection();
    const placementSlot = await placementSlotsCollection.findOne({
      claimedByEmail: member.email,
    });

    return Response.json({
      member: {
        ...serializeMember(memberWithServiceSuspension),
        placementSlotIndex: placementSlot?.slotIndex ?? null,
      },
    });
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

  try {
    const response = await syncMemberRegistration(payload);

    if (response.member) {
      await setMemberServerSessionCookie({
        email: response.member.email,
        walletAddress: response.member.lastWalletAddress,
      });
    }

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync member.";
    const status = error instanceof MemberSyncError ? error.status : 500;

    if (error instanceof MemberSyncError && status === 409) {
      return Response.json({
        justCompleted: false,
        member: null,
        validationError: message,
      });
    }

    return jsonError(message, status);
  }
}
