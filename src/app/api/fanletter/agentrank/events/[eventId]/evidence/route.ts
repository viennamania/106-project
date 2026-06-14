import {
  getAgentRankEventEvidencePacket,
  normalizeAgentRankEventId,
} from "@/lib/agentrank/evidence-packet";
import {
  isAgentRankEventIncludedInMockScope,
  isAgentRankCoverageMockEvent,
  normalizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";

type EventEvidenceParams = {
  eventId: string;
};

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<EventEvidenceParams> },
) {
  const url = new URL(request.url);
  const { eventId: rawEventId } = await params;
  const eventId = normalizeAgentRankEventId(rawEventId);

  if (!eventId) {
    return Response.json(
      {
        error: "Invalid AgentRank event id.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const eventScope = normalizeAgentRankEventMockScope(
      url.searchParams.get("scope"),
    );
    const result = await getAgentRankEventEvidencePacket({
      eventId,
      eventScope,
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
      starId: normalizeParam(url.searchParams.get("starId")),
    });

    if (!result) {
      return Response.json(
        {
          error: "AgentRank reputation event was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const { event, packet } = result;
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "x-agentrank-evidence-root": packet.integrity.evidenceRoot,
      "x-agentrank-event-id": event.eventId,
      "x-agentrank-event-in-scope": String(
        isAgentRankEventIncludedInMockScope(event, eventScope),
      ),
      "x-agentrank-event-provenance": isAgentRankCoverageMockEvent(event)
        ? "mock_coverage"
        : "product_event",
      "x-agentrank-event-scope": eventScope,
      "x-agentrank-packet-hash": packet.integrity.packetHash,
      "x-agentrank-record-type": packet.recordType,
      "x-agentrank-schema-version": event.schemaVersion,
    };

    if (url.searchParams.get("download") === "1") {
      return new Response(JSON.stringify(packet, null, 2), {
        headers: {
          ...headers,
          "content-disposition": `attachment; filename="agentrank-event-evidence-${event.eventId}.json"`,
        },
      });
    }

    return Response.json(packet, {
      headers,
    });
  } catch (error) {
    console.error("AgentRank event evidence packet failed", error);

    return Response.json(
      {
        error: "AgentRank event evidence packet could not be generated.",
      },
      {
        status: 500,
      },
    );
  }
}
