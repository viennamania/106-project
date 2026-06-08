import {
  createFanletterNewsCutShareId,
  createFanletterNewsCutShareCampaignSnapshot,
  createFanletterNewsCutShareLink,
  normalizeFanletterNewsCutShareMemo,
} from "@/lib/fanletter-news-cut-share-links";
import { normalizeFanletterNewsPublicCutSlotNumber } from "@/lib/fanletter-news-public-cuts-shared";
import { readMemberServerSession } from "@/lib/member-server-session";
import {
  getFanletterNewsReportsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createShareUrl({
  cutSlotNumber,
  href,
  request,
  shareId,
}: {
  cutSlotNumber: number;
  href: string;
  request: Request;
  shareId: string;
}) {
  const requestUrl = new URL(request.url);
  const parsed = new URL(href || "/", requestUrl.origin);

  if (parsed.origin !== requestUrl.origin) {
    throw new Error("Cross-origin share URLs are not allowed.");
  }

  parsed.searchParams.set("shareId", shareId);
  parsed.searchParams.set("cut", String(cutSlotNumber));
  return parsed.toString();
}

export async function POST(request: Request) {
  const session = await readMemberServerSession();

  if (!session?.email) {
    return jsonError("Login is required to create a managed share link.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Invalid share body.", 400);
  }

  const reportId = readString("reportId" in body ? body.reportId : null);
  const href = readString("href" in body ? body.href : null);
  const rawCutSlotNumber = "cutSlotNumber" in body ? body.cutSlotNumber : null;
  const cutSlotNumber =
    normalizeFanletterNewsPublicCutSlotNumber(
      typeof rawCutSlotNumber === "number"
        ? String(rawCutSlotNumber)
        : readString(rawCutSlotNumber),
    ) ?? 1;

  if (!reportId) {
    return jsonError("reportId is required.", 400);
  }

  const reportsCollection = await getFanletterNewsReportsCollection();
  const report = await reportsCollection.findOne({
    reportId,
    status: "published",
  });

  if (!report) {
    return jsonError("Published report not found.", 404);
  }

  const normalizedShareId = normalizeShareId(createFanletterNewsCutShareId());

  if (!normalizedShareId) {
    return jsonError("Could not create share id.", 500);
  }

  let shareUrl: string;

  try {
    shareUrl = createShareUrl({
      cutSlotNumber,
      href,
      request,
      shareId: normalizedShareId,
    });
  } catch {
    return jsonError("Invalid share href.", 400);
  }

  const ownerEmail = normalizeEmail(session.email);
  const member = ownerEmail
    ? await (await getMembersCollection()).findOne(
        { email: ownerEmail },
        { projection: { referralCode: 1 } },
      )
    : null;
  const campaignSnapshot =
    await createFanletterNewsCutShareCampaignSnapshot({
      anchorReport: report,
    });
  const shareLink = await createFanletterNewsCutShareLink({
    campaignReportIds: campaignSnapshot.campaignReportIds,
    campaignReports: campaignSnapshot.campaignReports,
    contentId: report.contentId || null,
    creatorReferralCode: report.creatorReferralCode ?? null,
    cutSlotNumber,
    memo: normalizeFanletterNewsCutShareMemo(
      "memo" in body ? body.memo : null,
    ),
    ownerEmail,
    ownerReferralCode: member?.referralCode ?? null,
    ownerWalletAddress: normalizeAddress(session.walletAddress),
    reporterReferralCode: report.reporterReferralCode,
    reportId: report.reportId,
    shareId: normalizedShareId,
    targetHref: shareUrl,
  });

  return Response.json({
    createdAt: shareLink.createdAt.toISOString(),
    memo: shareLink.memo,
    shareId: shareLink.shareId,
    shareUrl,
  });
}
