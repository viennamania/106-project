import { buildAgentRankCoverageSnapshot } from "@/lib/agentrank/coverage";
import { buildAgentRankCoverageEventFeed } from "@/lib/agentrank/coverage-event-feed";
import { getFanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import {
  filterAgentRankReputationEventFeedByMockScope,
  normalizeAgentRankEventMockScope,
  summarizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";

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
  eventScope: ReturnType<typeof summarizeAgentRankEventMockScope> & {
    scope: string;
  },
) {
  return serializeRowsCsv([
    ["section", "key", "label", "value", "total", "covered", "layer"],
    [
      "scope",
      "eventScope",
      "Event Scope",
      eventScope.scope,
      "",
      "",
      "",
    ],
    [
      "scope",
      "productEvents",
      "Product Events",
      eventScope.productEvents,
      eventScope.totalEvents,
      "",
      "",
    ],
    [
      "scope",
      "mockEvents",
      "Mock Coverage Events",
      eventScope.mockEvents,
      eventScope.totalEvents,
      "",
      "",
    ],
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const memberEmail = normalizeParam(url.searchParams.get("memberEmail"));
  const eventScope = normalizeAgentRankEventMockScope(
    url.searchParams.get("scope"),
  );
  const starId = normalizeParam(url.searchParams.get("starId"));

  try {
    const snapshot = await getFanletterAgentRankInvestorSnapshot({
      limit,
      memberEmail,
      starId,
    });
    const baseEventFeed = filterAgentRankReputationEventFeedByMockScope(
      snapshot.eventFeed,
      eventScope,
    );
    const preliminaryCoverage = buildAgentRankCoverageSnapshot(
      baseEventFeed,
      snapshot.ers.readiness,
    );
    const rawCoverageEventFeed = await buildAgentRankCoverageEventFeed({
      baseFeed: baseEventFeed,
      memberEmail,
      missingTypes: preliminaryCoverage.eventTypes
        .filter((eventType) => !eventType.covered)
        .map((eventType) => eventType.type),
      starId,
    });
    const coverageEventFeed = filterAgentRankReputationEventFeedByMockScope(
      rawCoverageEventFeed,
      eventScope,
    );
    const coverage = buildAgentRankCoverageSnapshot(
      coverageEventFeed,
      snapshot.ers.readiness,
    );
    const scopedEventSummary = summarizeAgentRankEventMockScope(
      coverageEventFeed.events,
    );
    const payload = {
      coverage,
      eventScope: {
        raw: summarizeAgentRankEventMockScope(snapshot.eventFeed.events),
        scope: eventScope,
        scoped: scopedEventSummary,
      },
      generatedAt: snapshot.generatedAt,
      recordType: "agentrank.coverage_audit",
      scope: {
        eventScope,
        limit: limit ?? 120,
        memberEmail,
        starId,
      },
      source: "fanletter_phase_1_coverage_audit",
    };
    const headers = {
      "x-agentrank-coverage-quality": String(coverage.phase1QualityScore),
      "x-agentrank-event-scope": eventScope,
      "x-agentrank-event-type-coverage": String(
        coverage.eventTypeCoveragePercent,
      ),
      "x-agentrank-mock-events": String(scopedEventSummary.mockEvents),
      "x-agentrank-product-events": String(scopedEventSummary.productEvents),
      "x-agentrank-record-type": payload.recordType,
      "x-agentrank-source-coverage": String(
        coverage.interactionSourceCoveragePercent,
      ),
    };

    if (url.searchParams.get("format") === "csv") {
      const csv = serializeCoverageCsv(coverage, {
        ...scopedEventSummary,
        scope: eventScope,
      });
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
