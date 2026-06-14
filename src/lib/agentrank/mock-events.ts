import {
  summarizeAgentRankReputationEvents,
  type AgentRankReputationEvent,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";

export function isAgentRankCoverageMockEvent(
  event: AgentRankReputationEvent,
) {
  return (
    event.type === "x402_mock_payment_intent" ||
    event.context.coverageMockCreatorUnlocked === true ||
    event.context.mockPaymentIntent === true ||
    event.context.checkoutMode === "mock_coverage" ||
    event.context.a2aMockUsage === true ||
    event.context.intent === "coverage_mock_creator_unlocked" ||
    event.context.intent === "coverage_mock_a2a_usage" ||
    event.context.intent === "coverage_mock_x402_payment_intent"
  );
}

export function countAgentRankCoverageMockEvents(
  events: AgentRankReputationEvent[],
) {
  return events.filter(isAgentRankCoverageMockEvent).length;
}

export function filterAgentRankReputationEventFeedForScoring(
  feed: FanletterAgentRankReputationEventFeed,
  options: {
    includeMockEvents?: boolean;
  } = {},
) {
  if (options.includeMockEvents) {
    return feed;
  }

  const events = feed.events.filter(
    (event) => !isAgentRankCoverageMockEvent(event),
  );

  if (events.length === feed.events.length) {
    return feed;
  }

  return {
    ...feed,
    events,
    summary: {
      ...summarizeAgentRankReputationEvents(events),
      generatedAt: feed.summary.generatedAt,
    },
  } satisfies FanletterAgentRankReputationEventFeed;
}
