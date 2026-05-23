import {
  getContentSocialSummaryForViewer,
  requestContentSourceRevealForMember,
} from "@/lib/content-service";
import {
  createFanletterNewsSourceRevealState,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";

type SourceRevealResponse = {
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;

  try {
    const session = await readMemberServerSession();
    const social = await getContentSocialSummaryForViewer(
      contentId,
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
    const status = message === "Content not found." ? 404 : 500;

    return jsonError(message, status);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await context.params;

  try {
    const authorization = await validateMemberWalletOwner({});

    if (authorization.error) {
      return authorization.error;
    }

    const response = await requestContentSourceRevealForMember({
      contentId,
      email: authorization.normalizedEmail,
    });
    const sourceRevealResponse: SourceRevealResponse = {
      sourceReveal: createFanletterNewsSourceRevealState(response.social),
    };

    return Response.json(sourceRevealResponse, { headers: noStoreHeaders });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save source reveal request.";
    const status =
      message === "Content not found."
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
