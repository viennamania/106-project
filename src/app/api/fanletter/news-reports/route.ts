import {
  createFanletterNewsReportShareHref,
  getFanletterNewsReportForReporter,
  getOrCreateFanletterNewsReport,
} from "@/lib/fanletter-news-report-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeReferralCode } from "@/lib/member";
import type { FanletterNewsReportDocument } from "@/lib/content";

type FanletterNewsReportCreateRequest = {
  contentId?: string | null;
  email?: string | null;
  locale?: string | null;
  reporterComment?: string | null;
  selectedCoverImageUrl?: string | null;
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

function serializeNewsReport(report: FanletterNewsReportDocument) {
  return {
    dek: report.dek,
    reporterAvatarImageUrl: report.reporterAvatarImageUrl ?? null,
    reporterCharacterName: report.reporterCharacterName ?? null,
    reporterName: report.reporterName,
    reportId: report.reportId,
    shareHref: createFanletterNewsReportShareHref(report),
    title: report.title,
  };
}

async function resolveReporterCredentials({
  email,
  walletAddress,
}: {
  email?: string | null;
  walletAddress?: string | null;
}) {
  const hasRequestCredentials = Boolean(email && walletAddress);
  const session = hasRequestCredentials ? null : await readMemberServerSession();
  const credentials = hasRequestCredentials
    ? {
        email,
        walletAddress,
      }
    : session
      ? {
          email: session.email,
          walletAddress: session.walletAddress,
        }
      : null;

  if (!credentials?.email || !credentials.walletAddress) {
    return {
      error: jsonError("Connect your account to create an AI fan report.", 401),
      reporterReferralCode: null,
    };
  }

  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email: credentials.email,
    walletAddress: credentials.walletAddress,
  });

  if (authorization.error) {
    return {
      error: authorization.error,
      reporterReferralCode: null,
    };
  }

  const reporterReferralCode = normalizeReferralCode(
    authorization.member?.referralCode,
  );

  if (!reporterReferralCode) {
    return {
      error: jsonError("Connected account does not have a fan reporter code.", 403),
      reporterReferralCode: null,
    };
  }

  return {
    credentials,
    error: null,
    reporterReferralCode,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const reporter = await resolveReporterCredentials({
      email: searchParams.get("email"),
      walletAddress: searchParams.get("walletAddress"),
    });

    if (reporter.error) {
      return reporter.error;
    }

    const report = await getFanletterNewsReportForReporter({
      contentId: searchParams.get("contentId"),
      locale: searchParams.get("locale"),
      reporterReferralCode: reporter.reporterReferralCode,
    });

    return Response.json({
      report: report ? serializeNewsReport(report) : null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load FanLetter news report.";

    return jsonError(message, getErrorStatus(message));
  }
}

export async function POST(request: Request) {
  let body: FanletterNewsReportCreateRequest | null = null;

  try {
    body = (await request.json()) as FanletterNewsReportCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const reporter = await resolveReporterCredentials({
      email: body?.email,
      walletAddress: body?.walletAddress,
    });

    if (reporter.error) {
      return reporter.error;
    }

    const report = await getOrCreateFanletterNewsReport({
      contentId: body?.contentId,
      locale: body?.locale,
      reporterEmail: reporter.credentials.email,
      reporterComment: body?.reporterComment,
      reporterReferralCode: reporter.reporterReferralCode,
      selectedCoverImageUrl: body?.selectedCoverImageUrl,
    });

    return Response.json({
      report: serializeNewsReport(report),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create FanLetter news report.";

    return jsonError(message, getErrorStatus(message));
  }
}
