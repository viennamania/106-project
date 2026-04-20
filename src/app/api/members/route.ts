import {
  getMemberRegistrationStatus,
  MemberSyncError,
  syncMemberRegistration,
} from "@/lib/member-service";
import { getReferralPlacementSlotsCollection } from "@/lib/mongodb";
import type { SyncMemberRequest } from "@/lib/member";
import { serializeMember } from "@/lib/member";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const member = await getMemberRegistrationStatus(rawEmail);

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    const placementSlotsCollection = await getReferralPlacementSlotsCollection();
    const placementSlot = await placementSlotsCollection.findOne({
      claimedByEmail: member.email,
    });

    return Response.json({
      member: {
        ...serializeMember(member),
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
    return Response.json(await syncMemberRegistration(payload));
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
