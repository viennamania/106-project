import {
  createFanletterNewsReportShareHref,
  getOrCreateFanletterNewsReport,
} from "@/lib/fanletter-news-report-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeReferralCode } from "@/lib/member";

type FanletterNewsReportCreateRequest = {
  contentId?: string | null;
  email?: string | null;
  locale?: string | null;
  walletAddress?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (message === "contentId is required.") {
    return 400;
  }

  if (message === "Content not found.") {
    return 404;
  }

  return 500;
}

export async function POST(request: Request) {
  let body: FanletterNewsReportCreateRequest | null = null;

  try {
    body = (await request.json()) as FanletterNewsReportCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const hasRequestCredentials = Boolean(body?.email && body.walletAddress);
    const session = hasRequestCredentials ? null : await readMemberServerSession();
    const credentials = hasRequestCredentials
      ? {
          email: body?.email,
          walletAddress: body?.walletAddress,
        }
      : session
        ? {
            email: session.email,
            walletAddress: session.walletAddress,
          }
        : null;

    if (!credentials?.email || !credentials.walletAddress) {
      return jsonError("Connect your account to create an AI fan report.", 401);
    }

    const authorization = await validateMemberWalletOwner({
      allowedStatuses: ["completed", "pending_payment"],
      email: credentials.email,
      walletAddress: credentials.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const reporterReferralCode = normalizeReferralCode(
      authorization.member?.referralCode,
    );

    if (!reporterReferralCode) {
      return jsonError(
        "Connected account does not have a fan reporter code.",
        403,
      );
    }

    const report = await getOrCreateFanletterNewsReport({
      contentId: body?.contentId,
      locale: body?.locale,
      reporterReferralCode,
    });

    return Response.json({
      report: {
        dek: report.dek,
        reportId: report.reportId,
        shareHref: createFanletterNewsReportShareHref(report),
        title: report.title,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create FanLetter news report.";

    return jsonError(message, getErrorStatus(message));
  }
}
