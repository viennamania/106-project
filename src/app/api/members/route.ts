import { getMembersCollection } from "@/lib/mongodb";
import type {
  MemberRecord,
  SyncMemberRequest,
  SyncMemberResponse,
} from "@/lib/member";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serializeMember(member: {
  email: string;
  walletAddresses: string[];
  lastWalletAddress: string;
  chainId: number;
  chainName: string;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
  lastConnectedAt: Date;
}): MemberRecord {
  return {
    chainId: member.chainId,
    chainName: member.chainName,
    createdAt: member.createdAt.toISOString(),
    email: member.email,
    lastConnectedAt: member.lastConnectedAt.toISOString(),
    lastWalletAddress: member.lastWalletAddress,
    locale: member.locale,
    updatedAt: member.updatedAt.toISOString(),
    walletAddresses: member.walletAddresses,
  };
}

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

    const result = await collection.updateOne(
      { email },
      {
        $addToSet: {
          walletAddresses: walletAddress,
        },
        $set: {
          chainId: payload.chainId,
          chainName,
          email,
          lastConnectedAt: now,
          lastWalletAddress: walletAddress,
          locale,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const member = await collection.findOne({ email });

    if (!member) {
      return jsonError("Member sync failed.", 500);
    }

    const response: SyncMemberResponse = {
      isNewMember: Boolean(result.upsertedId),
      member: serializeMember(member),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync member.";

    return jsonError(message, 500);
  }
}
