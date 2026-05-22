import {
  MEMBER_PUBLIC_PROFILE_DISPLAY_NAME_LIMIT,
  serializeMember,
  serializeMemberPublicProfile,
} from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { getMembersCollection } from "@/lib/mongodb";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function trimToLength(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 2048);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const authorization = await validateMemberWalletOwner({
      email: url.searchParams.get("email"),
      walletAddress: url.searchParams.get("walletAddress"),
    });

    if (authorization.error) {
      return authorization.error;
    }

    if (!authorization.member) {
      return jsonError("Member not found.", 404);
    }

    return Response.json({
      member: serializeMember(authorization.member),
      publicProfile: serializeMemberPublicProfile(
        authorization.member.publicProfile,
      ),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to load member public profile.",
      500,
    );
  }
}

async function savePublicProfile(request: Request) {
  let payload:
    | {
        avatarImageUrl?: string | null;
        displayName?: string | null;
        email?: string | null;
        walletAddress?: string | null;
      }
    | undefined;

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!payload?.email?.trim()) {
    return jsonError("email is required.", 400);
  }

  if (!payload.walletAddress?.trim()) {
    return jsonError("walletAddress is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: payload.email,
      walletAddress: payload.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const now = new Date();
    const publicProfile = {
      avatarImageUrl: normalizeImageUrl(payload.avatarImageUrl) || null,
      displayName:
        trimToLength(
          payload.displayName,
          MEMBER_PUBLIC_PROFILE_DISPLAY_NAME_LIMIT,
        ) || null,
      updatedAt: now,
    };
    const collection = await getMembersCollection();
    const member = await collection.findOneAndUpdate(
      { email: authorization.normalizedEmail },
      {
        $set: {
          publicProfile,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    return Response.json({
      member: serializeMember(member),
      publicProfile: serializeMemberPublicProfile(member.publicProfile),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to save member public profile.",
      400,
    );
  }
}

export async function POST(request: Request) {
  return savePublicProfile(request);
}

export async function PUT(request: Request) {
  return savePublicProfile(request);
}
