import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const session = await readMemberServerSession();

  return Response.json(
    {
      callbackReceived: {
        codeReceived: Boolean(searchParams.get("code")),
        error: searchParams.get("error"),
        errorDescription: searchParams.get("error_description"),
        stateReceived: Boolean(searchParams.get("state")),
      },
      mode: "oauth_preview",
      next: {
        mockConnectApi:
          "/api/fanletter/founder-club/social-account/mock-connect",
      },
      oauth: {
        provider: "tiktok",
        tokenExchangeExecuted: false,
      },
      reason: "TikTok OAuth callback route is prepared, but live token exchange is disabled.",
      reputationEventOnSuccess: {
        actor: "creator_member",
        eventType: "creator_social_connected",
        platform: "tiktok",
        target: "ai_star",
      },
      session: {
        email: session?.email ?? null,
        hasMemberSession: Boolean(session?.email),
        walletAddress: session?.walletAddress ?? null,
      },
    },
    { status: 409 },
  );
}
