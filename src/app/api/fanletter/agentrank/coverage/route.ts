import { buildAgentRankCoverageSnapshot } from "@/lib/agentrank/coverage";
import { getFanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import {
  getFanletterAgentRankReputationEventFeed,
  summarizeAgentRankReputationEvents,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value);

  if (!/[",\n\r]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

function serializeRowsCsv(
  rows: Array<Array<string | number | boolean | null | undefined>>,
) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function serializeCoverageCsv(
  coverage: ReturnType<typeof buildAgentRankCoverageSnapshot>,
) {
  return serializeRowsCsv([
    ["section", "key", "label", "value", "total", "covered", "layer"],
    [
      "summary",
      "phase1QualityScore",
      "Phase 1 Data Quality",
      coverage.phase1QualityScore,
      100,
      "",
      "",
    ],
    [
      "summary",
      "eventTypeCoveragePercent",
      "Event Type Coverage",
      coverage.eventTypeCoveragePercent,
      100,
      `${coverage.totals.coveredEventTypes}/${coverage.totals.eventTypes}`,
      "",
    ],
    [
      "summary",
      "interactionSourceCoveragePercent",
      "Interaction Source Coverage",
      coverage.interactionSourceCoveragePercent,
      100,
      `${coverage.totals.coveredInteractionSources}/${coverage.totals.interactionSources}`,
      "",
    ],
    [
      "summary",
      "oracleCoveragePercent",
      "Oracle Ready Coverage",
      coverage.oracleCoveragePercent,
      100,
      `${coverage.totals.oracleReadyEvents}/${coverage.totals.totalEvents}`,
      "",
    ],
    [
      "summary",
      "schemaCoveragePercent",
      "Schema Coverage",
      coverage.schemaCoveragePercent,
      100,
      `${coverage.totals.schemaReadyEvents}/${coverage.totals.totalEvents}`,
      "",
    ],
    ...coverage.eventTypes.map((eventType) => [
      "event_type",
      eventType.type,
      eventType.type,
      eventType.count,
      "",
      eventType.covered,
      eventType.layer,
    ]),
    ...coverage.sources.map((source) => [
      "source",
      source.source,
      source.source,
      source.count,
      "",
      source.covered,
      "",
    ]),
    ...coverage.gaps.map((gap) => ["gap", gap, gap, "", "", false, ""]),
  ]);
}

function mergeReputationEventFeeds(
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

async function buildCoverageEventFeed({
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

  return mergeReputationEventFeeds(baseFeed, probeFeeds);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const memberEmail = normalizeParam(url.searchParams.get("memberEmail"));
  const starId = normalizeParam(url.searchParams.get("starId"));

  try {
    const snapshot = await getFanletterAgentRankInvestorSnapshot({
      limit,
      memberEmail,
      starId,
    });
    const preliminaryCoverage = buildAgentRankCoverageSnapshot(
      snapshot.eventFeed,
      snapshot.ers.readiness,
    );
    const coverageEventFeed = await buildCoverageEventFeed({
      baseFeed: snapshot.eventFeed,
      memberEmail,
      missingTypes: preliminaryCoverage.eventTypes
        .filter((eventType) => !eventType.covered)
        .map((eventType) => eventType.type),
      starId,
    });
    const coverage = buildAgentRankCoverageSnapshot(
      coverageEventFeed,
      snapshot.ers.readiness,
    );
    const payload = {
      coverage,
      generatedAt: snapshot.generatedAt,
      recordType: "agentrank.coverage_audit",
      scope: {
        limit: limit ?? 120,
        memberEmail,
        starId,
      },
      source: "fanletter_phase_1_coverage_audit",
    };
    const headers = {
      "x-agentrank-coverage-quality": String(coverage.phase1QualityScore),
      "x-agentrank-event-type-coverage": String(
        coverage.eventTypeCoveragePercent,
      ),
      "x-agentrank-record-type": payload.recordType,
      "x-agentrank-source-coverage": String(
        coverage.interactionSourceCoveragePercent,
      ),
    };

    if (url.searchParams.get("format") === "csv") {
      const csv = serializeCoverageCsv(coverage);
      const filename = `fanletter-agentrank-coverage-${Date.now()}.csv`;

      return new Response(csv, {
        headers: {
          "content-disposition": `attachment; filename="${filename}"`,
          "content-type": "text/csv; charset=utf-8",
          ...headers,
        },
      });
    }

    return Response.json(payload, {
      headers,
    });
  } catch (error) {
    console.error("AgentRank coverage audit failed", error);

    return Response.json(
      {
        error: "AgentRank coverage audit could not be generated.",
      },
      {
        status: 500,
      },
    );
  }
}
