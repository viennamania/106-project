import {
  createFanletterNewsReportShareHref,
  getOrCreateFanletterNewsReport,
} from "@/lib/fanletter-news-report-service";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeReferralCode } from "@/lib/member";
import { getMembersCollection } from "@/lib/mongodb";

type FanletterNewsReportCreateRequest = {
  contentId?: string | null;
  locale?: string | null;
  referralCode?: string | null;
  reporterReferralCode?: string | null;
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

async function getSessionReporterReferralCode() {
  const session = await readMemberServerSession();

  if (!session) {
    return null;
  }

  const membersCollection = await getMembersCollection();
  const member = await membersCollection.findOne(
    {
      email: session.email,
    },
    {
      projection: {
        referralCode: 1,
      },
    },
  );

  return normalizeReferralCode(member?.referralCode);
}

export async function POST(request: Request) {
  let body: FanletterNewsReportCreateRequest | null = null;

  try {
    body = (await request.json()) as FanletterNewsReportCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const bodyReporterReferralCode =
      normalizeReferralCode(body?.reporterReferralCode) ??
      normalizeReferralCode(body?.referralCode);
    const sessionReporterReferralCode = bodyReporterReferralCode
      ? null
      : await getSessionReporterReferralCode().catch(() => null);
    const report = await getOrCreateFanletterNewsReport({
      contentId: body?.contentId,
      locale: body?.locale,
      reporterReferralCode:
        bodyReporterReferralCode ?? sessionReporterReferralCode,
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
