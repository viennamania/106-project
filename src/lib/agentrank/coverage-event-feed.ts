import "server-only";

import {
  getFanletterAgentRankReputationEventFeed,
  summarizeAgentRankReputationEvents,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";

export function mergeAgentRankCoverageEventFeeds(
  baseFeed: FanletterAgentRankReputationEventFeed,
  probeFeeds: FanletterAgentRankReputationEventFeed[],
) {
  const eventById = new Map<string, AgentRankReputationEvent>();

  for (const event of [
    ...baseFeed.events,
    ...probeFeeds.flatMap((feed) => feed.events),
  ]) {
    eventById.set(event.eventId, event);
  }

  const events = [...eventById.values()].sort((left, right) => {
    const timeDelta =
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime();

    return timeDelta || left.eventId.localeCompare(right.eventId);
  });

  return {
    ...baseFeed,
    events,
    summary: {
      ...summarizeAgentRankReputationEvents(events),
      generatedAt: baseFeed.summary.generatedAt,
    },
  } satisfies FanletterAgentRankReputationEventFeed;
}

export async function buildAgentRankCoverageEventFeed({
  baseFeed,
  missingTypes,
  memberEmail,
  starId,
}: {
  baseFeed: FanletterAgentRankReputationEventFeed;
  memberEmail: string | null;
  missingTypes: AgentRankReputationEventType[];
  starId: string | null;
}) {
  if (missingTypes.length === 0) {
    return baseFeed;
  }

  const probeFeeds = await Promise.all(
    missingTypes.map((type) =>
      getFanletterAgentRankReputationEventFeed({
        includeTypes: [type],
        limit: 1,
        memberEmail,
        starId,
      }),
    ),
  );

  return mergeAgentRankCoverageEventFeeds(baseFeed, probeFeeds);
}
