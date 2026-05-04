import type {
  FanletterVlogPlannerResponse,
  FanletterVlogPlanStatus,
} from "@/lib/content";
import {
  getCreatorProfileSnapshotForCompletedMember,
  getCreatorStudioPostsForMember,
} from "@/lib/content-service";
import {
  getLatestFanletterVlogPlansForMember,
  saveFanletterVlogPlansForMember,
  updateFanletterVlogPlanForMember,
} from "@/lib/fanletter-vlog-plan-service";
import { generateFanletterVlogPlans } from "@/lib/fanletter-vlog-planner-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 90;

type PlannerRequest = {
  email?: string | null;
  locale?: string | null;
  walletAddress?: string | null;
};

type PlannerStatusRequest = PlannerRequest & {
  contentId?: string | null;
  planId?: string | null;
  status?: string | null;
};

const plannerStatuses = new Set<FanletterVlogPlanStatus>([
  "created",
  "distributed",
  "planned",
  "published",
  "skipped",
]);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getQueryValue(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() || null;
}

function parsePlannerStatus(value?: string | null) {
  const status = value?.trim() as FanletterVlogPlanStatus | undefined;

  return status && plannerStatuses.has(status) ? status : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = getQueryValue(url, "email");
  const walletAddress = getQueryValue(url, "walletAddress");

  if (!email) {
    return jsonError("email is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email,
      walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const plans = await getLatestFanletterVlogPlansForMember(
      authorization.normalizedEmail,
    );
    const response: FanletterVlogPlannerResponse = {
      generatedAt: plans[0]?.generatedAt ?? new Date(0).toISOString(),
      plans,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load FanLetter vlog plans.";
    const status = message.endsWith("is required.") ? 400 : 500;

    return jsonError(message, status);
  }
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("OPENAI_API_KEY is not configured.", 500);
  }

  let body: PlannerRequest | null = null;

  try {
    body = (await request.json()) as PlannerRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  const locale = hasLocale(body.locale ?? "") ? (body.locale as Locale) : "ko";

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    if (!authorization.member) {
      return jsonError("Member not found.", 404);
    }

    const [profileSnapshot, postsData] = await Promise.all([
      getCreatorProfileSnapshotForCompletedMember(authorization.member),
      getCreatorStudioPostsForMember(authorization.normalizedEmail, {
        media: "video",
        pageSize: 10,
        status: "all",
      }),
    ]);
    const generated = await generateFanletterVlogPlans({
      locale,
      posts: postsData.posts,
      profile: profileSnapshot.profile,
    });
    const plans = await saveFanletterVlogPlansForMember({
      email: authorization.normalizedEmail,
      plans: generated.plans,
    });
    const response: FanletterVlogPlannerResponse = {
      generatedAt: plans[0]?.generatedAt ?? new Date().toISOString(),
      plans,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate FanLetter vlog plans.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message.endsWith("is required.")
            ? 400
            : 500;

    return jsonError(message, status);
  }
}

export async function PATCH(request: Request) {
  let body: PlannerStatusRequest | null = null;

  try {
    body = (await request.json()) as PlannerStatusRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.planId) {
    return jsonError("planId is required.", 400);
  }

  const status = parsePlannerStatus(body.status);

  if (!status) {
    return jsonError("valid status is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const plan = await updateFanletterVlogPlanForMember({
      contentId: body.contentId,
      email: authorization.normalizedEmail,
      planId: body.planId,
      status,
    });

    return Response.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update FanLetter vlog plan.";
    const apiStatus =
      message === "FanLetter vlog plan not found."
        ? 404
        : message.endsWith("is required.")
          ? 400
          : 500;

    return jsonError(message, apiStatus);
  }
}
