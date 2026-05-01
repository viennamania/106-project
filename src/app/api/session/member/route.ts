import { serializeMember } from "@/lib/member";
import {
  clearMemberServerSessionCookie,
  readMemberServerSession,
  setMemberServerSessionCookie,
} from "@/lib/member-server-session";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const session = await readMemberServerSession();

  if (!session) {
    return jsonError("Member session is required.", 401);
  }

  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email: session.email,
    walletAddress: session.walletAddress,
  });

  if (authorization.error) {
    await clearMemberServerSessionCookie();
    return authorization.error;
  }

  if (!authorization.member) {
    await clearMemberServerSessionCookie();
    return jsonError("Member not found.", 404);
  }

  return Response.json({
    email: authorization.normalizedEmail,
    member: serializeMember(authorization.member),
    walletAddress: session.walletAddress,
  });
}

export async function POST(request: Request) {
  let body: { email?: string; walletAddress?: string } | null = null;

  try {
    body = (await request.json()) as { email?: string; walletAddress?: string };
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email: body.email,
    walletAddress: body.walletAddress,
  });

  if (authorization.error) {
    await clearMemberServerSessionCookie();
    return authorization.error;
  }

  if (!authorization.member) {
    await clearMemberServerSessionCookie();
    return jsonError("Member not found.", 404);
  }

  await setMemberServerSessionCookie({
    email: authorization.normalizedEmail,
    walletAddress: body.walletAddress,
  });

  return Response.json({
    email: authorization.normalizedEmail,
    member: serializeMember(authorization.member),
    walletAddress: body.walletAddress,
  });
}

export async function DELETE() {
  await clearMemberServerSessionCookie();

  return Response.json({ ok: true });
}
