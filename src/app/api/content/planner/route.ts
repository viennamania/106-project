import type { FanletterVlogPlannerResponse } from "@/lib/content";
import {
  getCreatorProfileSnapshotForCompletedMember,
  getCreatorStudioPostsForMember,
} from "@/lib/content-service";
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

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
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
        pageSize: 10,
        status: "all",
      }),
    ]);
    const generated = await generateFanletterVlogPlans({
      locale,
      posts: postsData.posts,
      profile: profileSnapshot.profile,
    });
    const response: FanletterVlogPlannerResponse = {
      generatedAt: new Date().toISOString(),
      plans: generated.plans,
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
