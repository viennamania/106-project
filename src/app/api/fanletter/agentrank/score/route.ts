import {
  getFanletterAgentRankScoreAggregate,
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
    const score = await getFanletterAgentRankScoreAggregate({
      includeTypes: parseAgentRankScoreTypes(url.searchParams.get("types")),
      limit: normalizeLimit(url.searchParams.get("limit")),
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
      starId: normalizeParam(url.searchParams.get("starId")),
      universeId: normalizeParam(url.searchParams.get("universeId")),
    });

    return Response.json(score);
  } catch (error) {
    console.error("AgentRank score aggregation failed", error);

    return Response.json(
      {
        error: "AgentRank score could not be calculated.",
      },
      {
        status: 500,
      },
    );
  }
}
