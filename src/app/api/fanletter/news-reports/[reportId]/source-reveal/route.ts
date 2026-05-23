import {
  getContentSocialSummaryForViewer,
  requestContentSourceRevealForMember,
} from "@/lib/content-service";
import {
  createFanletterNewsSourceRevealState,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import { getFanletterNewsReportById } from "@/lib/fanletter-news-report-service";
import {
  awardFanletterNewsSourceRevealReporterIncentives,
  type FanletterNewsSourceRevealReporterIncentiveAward,
} from "@/lib/fanletter-news-reporter-incentives";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";

type SourceRevealResponse = {
  reporterReward?: FanletterNewsSourceRevealReporterIncentiveAward | null;
  sourceReveal: FanletterNewsSourceRevealState;
};

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { headers: noStoreHeaders, status },
  );
}

async function getReportOrThrow(reportId: string) {
  const report = await getFanletterNewsReportById(reportId);

  if (!report) {
    throw new Error("News report not found.");
  }

  return report;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;

  try {
    const report = await getReportOrThrow(reportId);
    const session = await readMemberServerSession();
    const social = await getContentSocialSummaryForViewer(
      report.contentId,
      session?.email ?? null,
    );
    const response: SourceRevealResponse = {
      sourceReveal: createFanletterNewsSourceRevealState(social),
    };

    return Response.json(response, { headers: noStoreHeaders });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load source reveal state.";
    const status =
      message === "News report not found." || message === "Content not found."
        ? 404
        : 500;

    return jsonError(message, status);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;

  try {
    const authorization = await validateMemberWalletOwner({});

    if (authorization.error) {
      return authorization.error;
    }

    const report = await getReportOrThrow(reportId);
    const response = await requestContentSourceRevealForMember({
      contentId: report.contentId,
      email: authorization.normalizedEmail,
      reportAttribution: {
        reportId: report.reportId,
        reporterReferralCode: report.reporterReferralCode,
      },
    });
    let reporterReward: FanletterNewsSourceRevealReporterIncentiveAward | null =
      null;

    try {
      reporterReward = await awardFanletterNewsSourceRevealReporterIncentives({
        report,
        response,
        viewerEmail: authorization.normalizedEmail,
      });
    } catch (incentiveError) {
      console.error(
        "[fanletter-news] source reveal reporter incentive failed",
        incentiveError,
      );
    }
    const sourceRevealResponse: SourceRevealResponse = {
      reporterReward,
      sourceReveal: createFanletterNewsSourceRevealState(response.social),
    };

    return Response.json(sourceRevealResponse, { headers: noStoreHeaders });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save source reveal request.";
    const status =
      message === "News report not found." || message === "Content not found."
        ? 404
        : message === "Completed signup is required." ||
            message === "Member session is required." ||
            message === "This member status is not authorized for this action." ||
            message === "This wallet is not authorized for the requested member."
          ? 403
          : 500;

    return jsonError(message, status);
  }
}
