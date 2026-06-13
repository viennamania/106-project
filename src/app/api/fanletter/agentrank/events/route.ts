import {
  agentRankReputationEventTypes,
  getFanletterAgentRankReputationEventFeed,
  type AgentRankReputationEventType,
} from "@/lib/agentrank/reputation-events";

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIncludeTypes(value: string | null) {
  if (!value) {
    return undefined;
  }

  const allowedTypes = new Set<string>(agentRankReputationEventTypes);
  const types = value
    .split(",")
    .map((type) => type.trim())
    .filter((type): type is AgentRankReputationEventType => {
      return allowedTypes.has(type);
    });

  return types.length ? types : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const feed = await getFanletterAgentRankReputationEventFeed({
      includeTypes: parseIncludeTypes(url.searchParams.get("types")),
      limit: normalizeLimit(url.searchParams.get("limit")),
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
      starId: normalizeParam(url.searchParams.get("starId")),
    });

    return Response.json(feed);
  } catch (error) {
    console.error("AgentRank event feed failed", error);

    return Response.json(
      {
        error: "AgentRank reputation events could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}
