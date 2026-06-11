import { getFanletterFounderClubStarDetail } from "@/lib/fanletter-founder-club-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import {
  getFanletterV2MockStar,
  type AIStar,
} from "@/mock/fanletterV2";

type MockJoinRequestBody = {
  locale?: unknown;
  referralCode?: unknown;
  starId?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && hasLocale(value) ? value : defaultLocale;
}

function normalizeRequestStarId(value: unknown) {
  return normalizeFanletterStarId(typeof value === "string" ? value : null);
}

function normalizeRequestReferralCode(value: unknown) {
  return normalizeReferralCode(typeof value === "string" ? value : null);
}

function buildMockReferralCode(star: AIStar) {
  const token =
    star.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ||
    star.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return `${(token || "STAR").slice(0, 12)}-A-001`;
}

function getConfiguredAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.net402.ai";
}

function buildUniverseHref({
  locale,
  referralCode,
  starId,
}: {
  locale: Locale;
  referralCode: string;
  starId: string;
}) {
  const url = new URL(
    `/${locale}/fanletter/${encodeURIComponent(starId)}`,
    getConfiguredAppUrl(),
  );

  url.searchParams.set("ref", referralCode);
  url.searchParams.set("founder", "joined");

  return url.toString();
}

async function resolveMockJoinStar(starId: string) {
  return getFanletterV2MockStar(starId) ?? getFanletterFounderClubStarDetail(starId);
}

export async function POST(request: Request) {
  let body: MockJoinRequestBody;

  try {
    body = (await request.json()) as MockJoinRequestBody;
  } catch {
    return jsonError("Invalid mock Founder join request.", 400);
  }

  const starId = normalizeRequestStarId(body.starId);

  if (!starId) {
    return jsonError("A valid AI Star id is required.", 400);
  }

  const star = await resolveMockJoinStar(starId);

  if (!star) {
    return jsonError("AI Star was not found.", 404);
  }

  const locale = normalizeLocale(body.locale);
  const session = await readMemberServerSession();
  const requestedReferralCode = normalizeRequestReferralCode(body.referralCode);
  const referralCode = requestedReferralCode ?? buildMockReferralCode(star);
  const universeHref = buildUniverseHref({
    locale,
    referralCode,
    starId: star.id,
  });

  return Response.json({
    membership: {
      joinedAt: new Date().toISOString(),
      referralCode,
      source: requestedReferralCode ? "referral" : "direct",
      starId: star.id,
      status: "founder",
    },
    mode: "mock",
    next: {
      founderClubHref: `/${locale}/fanletter/founder-club?ref=${encodeURIComponent(
        referralCode,
      )}`,
      universeHref,
    },
    rewards: {
      cp: 100,
      creatorProgressPercent: 2,
      influenceScore: 5,
    },
    session: {
      email: session?.email ?? null,
      hasMemberSession: Boolean(session?.email),
      walletAddress: session?.walletAddress ?? null,
    },
    star: {
      id: star.id,
      name: star.name,
      universeName: star.universeName,
    },
  });
}
