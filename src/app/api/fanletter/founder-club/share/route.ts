import { randomUUID } from "node:crypto";

import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { resolveFanletterStarReferralCode } from "@/lib/fanletter-founder-club-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { getFunnelEventsCollection } from "@/lib/mongodb";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

const supportedPlatforms = ["Kakao", "Instagram", "X", "TikTok"] as const;

type FounderClubSharePlatform = (typeof supportedPlatforms)[number];

function normalizePlatform(value: string | null) {
  const candidate = value?.trim().toLowerCase();

  return (
    supportedPlatforms.find((platform) => platform.toLowerCase() === candidate) ??
    "X"
  );
}

function normalizeLocale(value: string | null): Locale {
  return value && hasLocale(value) ? value : defaultLocale;
}

function getConfiguredAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.net402.ai";
}

function buildFounderClubShareUrl({
  code,
  locale,
  starId,
}: {
  code: string;
  locale: Locale;
  starId?: string | null;
}) {
  const normalizedStarId = normalizeFanletterStarId(starId);
  const url = new URL(
    normalizedStarId
      ? `/${locale}/fanletter/${encodeURIComponent(normalizedStarId)}`
      : `/${locale}/fanletter`,
    getConfiguredAppUrl(),
  );
  url.searchParams.set("ref", code);

  return url.toString();
}

function buildPlatformRedirectUrl({
  platform,
  shareUrl,
}: {
  platform: FounderClubSharePlatform;
  shareUrl: string;
}) {
  if (platform === "X") {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("url", shareUrl);

    return url.toString();
  }

  return shareUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const referralCode = normalizeReferralCode(requestUrl.searchParams.get("ref"));
  const platform = normalizePlatform(requestUrl.searchParams.get("platform"));
  const locale = normalizeLocale(requestUrl.searchParams.get("locale"));
  const requestedStarId = normalizeFanletterStarId(
    requestUrl.searchParams.get("star"),
  );

  if (!referralCode) {
    return Response.redirect(new URL(`/${locale}/fanletter`, requestUrl.origin));
  }

  const attribution = await resolveFanletterStarReferralCode(referralCode);
  const shareUrl = buildFounderClubShareUrl({
    code: referralCode,
    locale,
    starId: attribution?.starId ?? requestedStarId,
  });

  if (attribution) {
    const session = await readMemberServerSession();
    const collection = await getFunnelEventsCollection();

    await collection.insertOne({
      createdAt: new Date(),
      eventId: randomUUID(),
      memberEmail: session?.email ?? null,
      memberWalletAddress: session?.walletAddress
        ? normalizeAddress(session.walletAddress)
        : null,
      metadata: {
        platform,
        source: "founder_club_scout_share",
        sourceMemberEmail: attribution.memberEmail,
        starId: attribution.starId,
      },
      agentRank: {
        eventType: "referral_shared",
        intent: "founder_referral_shared",
        source: "fanletter_star_detail",
        starId: attribution.starId,
      },
      name: "share_click",
      path: requestUrl.pathname,
      referer: request.headers.get("referer"),
      referralCode,
      shareId: null,
      targetHref: shareUrl,
      userAgent: request.headers.get("user-agent"),
      viewerType: session?.email ? "member" : "guest",
      viewport: null,
    });
  }

  return Response.redirect(
    buildPlatformRedirectUrl({
      platform,
      shareUrl,
    }),
  );
}
