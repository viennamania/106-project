import {
  getFanletterAgentRankFounderContribution,
  parseAgentRankScoreTypes,
} from "@/lib/agentrank/score";

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const contribution = await getFanletterAgentRankFounderContribution({
      includeTypes: parseAgentRankScoreTypes(url.searchParams.get("types")),
      limit: normalizeLimit(url.searchParams.get("limit")),
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
    });

    if (!contribution) {
      return Response.json(
        {
          error: "memberEmail is required.",
        },
        {
          status: 400,
        },
      );
    }

    return Response.json(contribution);
  } catch (error) {
    console.error("AgentRank founder contribution aggregation failed", error);

    return Response.json(
      {
        error: "AgentRank founder contribution could not be calculated.",
      },
      {
        status: 500,
      },
    );
  }
}
