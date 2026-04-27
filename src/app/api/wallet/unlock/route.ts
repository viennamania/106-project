import { validateMemberWalletOwner } from "@/lib/member-owner";
import { getMembersCollection } from "@/lib/mongodb";
import {
  hasWalletPin,
  resetMemberWalletPin,
  setMemberWalletPin,
  verifyMemberWalletPin,
  WalletPinError,
} from "@/lib/wallet-pin-service";

type WalletUnlockRequest =
  | {
      action: "setup";
      confirmPin?: string;
      email?: string;
      pin?: string;
      walletAddress?: string;
    }
  | {
      action: "reset";
      confirmPin?: string;
      email?: string;
      pin?: string;
      walletAddress?: string;
    }
  | {
      action: "verify";
      email?: string;
      pin?: string;
      walletAddress?: string;
    };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function authorizeWalletUnlock({
  email,
  walletAddress,
}: {
  email?: string | null;
  walletAddress?: string | null;
}) {
  if (!email) {
    return {
      authorization: null,
      error: jsonError("email is required.", 400),
    };
  }

  if (!walletAddress) {
    return {
      authorization: null,
      error: jsonError("walletAddress is required.", 400),
    };
  }

  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email,
    walletAddress,
  });

  if (authorization.error) {
    return {
      authorization: null,
      error: authorization.error,
    };
  }

  return {
    authorization,
    error: null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const walletAddress = url.searchParams.get("walletAddress");

  try {
    const { authorization, error } = await authorizeWalletUnlock({
      email,
      walletAddress,
    });

    if (error || !authorization?.member) {
      return error ?? jsonError("Member not found.", 404);
    }

    return Response.json({
      configured: hasWalletPin(authorization.member),
      lockedUntil:
        authorization.member.walletPinLockedUntil?.toISOString() ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read wallet lock.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  let body: WalletUnlockRequest | null = null;

  try {
    body = (await request.json()) as WalletUnlockRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.action) {
    return jsonError("action is required.", 400);
  }

  try {
    const { authorization, error } = await authorizeWalletUnlock({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (error || !authorization?.member) {
      return error ?? jsonError("Member not found.", 404);
    }

    const collection = await getMembersCollection();

    if (body.action === "setup") {
      await setMemberWalletPin({
        collection,
        confirmPin: body.confirmPin ?? "",
        member: authorization.member,
        pin: body.pin ?? "",
      });

      return Response.json({ configured: true, ok: true });
    }

    if (body.action === "reset") {
      await resetMemberWalletPin({
        collection,
        confirmPin: body.confirmPin ?? "",
        member: authorization.member,
        pin: body.pin ?? "",
      });

      return Response.json({ configured: true, ok: true, reset: true });
    }

    if (body.action === "verify") {
      await verifyMemberWalletPin({
        collection,
        member: authorization.member,
        pin: body.pin ?? "",
      });

      return Response.json({ ok: true });
    }

    return jsonError("Unsupported wallet unlock action.", 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to unlock wallet.";
    const status = error instanceof WalletPinError ? error.status : 500;

    return jsonError(message, status);
  }
}
