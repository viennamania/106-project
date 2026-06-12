import {
  ensureFanletterStarFounderMembershipForCompletedMember,
  getFanletterFounderClubStarDetail,
  getOrCreateFanletterStarReferralCode,
  resolveFanletterStarReferralCode,
} from "@/lib/fanletter-founder-club-service";
import {
  getFanletterFounderClubApiMode,
  getFanletterFounderClubRuntimeState,
} from "@/lib/fanletter-founder-club-runtime";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import {
  getFanletterStarFounderMembershipsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import {
  getFanletterV2MockStar,
  type AIStar,
} from "@/mock/fanletterV2";

type FounderJoinRequestBody = {
  locale?: unknown;
  mode?: unknown;
  referralCode?: unknown;
  starId?: unknown;
};

function jsonError(message: string, status: number, extra?: object) {
  return Response.json({ error: message, ...(extra ?? {}) }, { status });
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

function buildPreviewReferralCode(star: AIStar) {
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

function toIsoDate(value: unknown) {
  return value instanceof Date
    ? value.toISOString()
    : typeof value === "string"
      ? value
      : new Date().toISOString();
}

async function resolvePreviewStar(starId: string) {
  return getFanletterV2MockStar(starId) ?? getFanletterFounderClubStarDetail(starId);
}

function buildPreviewResponse({
  locale,
  referralCode,
  requestedReferralCode,
  runtime,
  star,
}: {
  locale: Locale;
  referralCode: string;
  requestedReferralCode: string | null;
  runtime: ReturnType<typeof getFanletterFounderClubRuntimeState>;
  star: AIStar;
}) {
  return {
    membership: {
      joinedAt: new Date().toISOString(),
      referralCode,
      source: requestedReferralCode ? "referral" : "direct",
      starId: star.id,
      status: "founder",
    },
    mode: "preview",
    next: {
      founderClubHref: `/${locale}/fanletter/founder-club?ref=${encodeURIComponent(
        referralCode,
      )}`,
      universeHref: buildUniverseHref({
        locale,
        referralCode,
        starId: star.id,
      }),
    },
    rewards: {
      cp: 100,
      creatorProgressPercent: 2,
      influenceScore: 5,
    },
    runtime,
    star: {
      id: star.id,
      name: star.name,
      universeName: star.universeName,
    },
  };
}

export async function POST(request: Request) {
  let body: FounderJoinRequestBody;

  try {
    body = (await request.json()) as FounderJoinRequestBody;
  } catch {
    return jsonError("Invalid Founder join request.", 400);
  }

  const starId = normalizeRequestStarId(body.starId);

  if (!starId) {
    return jsonError("A valid AI Star id is required.", 400);
  }

  const locale = normalizeLocale(body.locale);
  const requestedMode = getFanletterFounderClubApiMode(body.mode);
  const requestedReferralCode = normalizeRequestReferralCode(body.referralCode);
  const runtime = getFanletterFounderClubRuntimeState("founder_join");

  if (requestedMode !== "live") {
    const star = await resolvePreviewStar(starId);

    if (!star) {
      return jsonError("AI Star was not found.", 404, { runtime });
    }

    return Response.json(
      buildPreviewResponse({
        locale,
        referralCode: requestedReferralCode ?? buildPreviewReferralCode(star),
        requestedReferralCode,
        runtime,
        star,
      }),
    );
  }

  if (runtime.blockedReasons.length > 0) {
    return jsonError("Founder join live mode is disabled.", 409, { runtime });
  }

  const session = await readMemberServerSession();

  if (!session?.email) {
    return jsonError("Member session is required.", 401, { runtime });
  }

  const [membersCollection, liveStar] = await Promise.all([
    getMembersCollection(),
    getFanletterFounderClubStarDetail(starId),
  ]);

  if (!liveStar) {
    return jsonError("Live AI Star was not found.", 404, { runtime });
  }

  const member = await membersCollection.findOne({
    email: session.email,
    status: "completed",
  });

  if (!member) {
    return jsonError("Completed member is required.", 403, { runtime });
  }

  const attribution = requestedReferralCode
    ? await resolveFanletterStarReferralCode(requestedReferralCode)
    : null;

  if (requestedReferralCode && !attribution) {
    return jsonError("Referral code is not active for an AI Star Universe.", 404, {
      runtime,
    });
  }

  if (attribution && attribution.starId !== liveStar.id) {
    return jsonError("Referral code does not match this AI Star.", 409, {
      runtime,
    });
  }

  const membershipsCollection =
    await getFanletterStarFounderMembershipsCollection();
  const existingMembership = await membershipsCollection.findOne(
    {
      memberEmail: member.email,
      starId: liveStar.id,
    },
    {
      projection: {
        joinedAt: 1,
        joinedViaCode: 1,
      },
    },
  );

  if (!existingMembership && attribution?.memberEmail === member.email) {
    return jsonError("Members cannot join with their own referral code.", 409, {
      runtime,
    });
  }

  const joined = existingMembership
    ? true
    : await ensureFanletterStarFounderMembershipForCompletedMember({
        attribution,
        member,
        starId: liveStar.id,
        updateMemberAttribution: true,
      });

  if (!joined) {
    return jsonError("Founder membership could not be created.", 409, {
      runtime,
    });
  }

  const referralAttribution = await getOrCreateFanletterStarReferralCode({
    memberEmail: member.email,
    memberReferralCode: member.referralCode,
    starId: liveStar.id,
  });
  const referralCode =
    referralAttribution?.code ?? requestedReferralCode ?? buildPreviewReferralCode(liveStar);

  return Response.json({
    membership: {
      joinedAt: existingMembership
        ? toIsoDate(existingMembership.joinedAt)
        : new Date().toISOString(),
      joinState: existingMembership ? "existing" : "created",
      referralCode,
      source:
        attribution || existingMembership?.joinedViaCode ? "referral" : "direct",
      starId: liveStar.id,
      status: "founder",
    },
    mode: "live",
    next: {
      founderClubHref: `/${locale}/fanletter/founder-club?ref=${encodeURIComponent(
        referralCode,
      )}`,
      universeHref: buildUniverseHref({
        locale,
        referralCode,
        starId: liveStar.id,
      }),
    },
    rewards: attribution
      ? {
          cp: 100,
          creatorProgressPercent: 2,
          influenceScore: 5,
        }
      : {
          cp: 0,
          creatorProgressPercent: 0,
          influenceScore: 0,
        },
    runtime,
    star: {
      id: liveStar.id,
      name: liveStar.name,
      universeName: liveStar.universeName,
    },
  });
}
