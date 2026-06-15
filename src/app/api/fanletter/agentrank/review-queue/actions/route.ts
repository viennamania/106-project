import { sha256AgentRankPayload } from "@/lib/agentrank/integrity";
import {
  filterAgentRankReputationEventFeedByMockScope,
  normalizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import {
  getFanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import {
  getAgentRankEventImpactTotal,
  getAgentRankReviewReasonCodes,
  getAgentRankReviewStatus,
  getAgentRankReviewStatusForAction,
  normalizeAgentRankReviewAction,
} from "@/lib/agentrank/review-queue";

type ReviewActionBody = {
  action?: unknown;
  eventId?: unknown;
  memberEmail?: unknown;
  note?: unknown;
  reviewerId?: unknown;
  scope?: unknown;
  starId?: unknown;
};

function normalizeParam(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNote(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 500)
    : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewActionBody;
    const action = normalizeAgentRankReviewAction(body.action);
    const eventId = normalizeParam(body.eventId);

    if (!action || !eventId) {
      return Response.json(
        {
          error: "AgentRank review action requires a valid action and eventId.",
        },
        {
          status: 400,
        },
      );
    }

    const scope = normalizeAgentRankEventMockScope(normalizeParam(body.scope));
    const rawFeed = await getFanletterAgentRankReputationEventFeed({
      limit: 240,
      memberEmail: normalizeParam(body.memberEmail),
      starId: normalizeParam(body.starId),
    });
    const scopedFeed = filterAgentRankReputationEventFeedByMockScope(
      rawFeed,
      scope,
    );
    const event = scopedFeed.events.find(
      (candidate) => candidate.eventId === eventId,
    );

    if (!event) {
      return Response.json(
        {
          error: "AgentRank reputation event was not found in the selected scope.",
        },
        {
          status: 404,
        },
      );
    }

    const nextStatus = getAgentRankReviewStatusForAction(action);
    const issuedAt = new Date().toISOString();
    const receiptSeed = {
      action,
      eventId,
      issuedAt,
      nextStatus,
      reviewerId: normalizeParam(body.reviewerId) ?? "ops-console",
      scope,
      starId: normalizeParam(body.starId),
    };
    const receiptHash = sha256AgentRankPayload(receiptSeed);
    const receipt = {
      action,
      agentRankVersion: event.agentRankVersion,
      event: {
        auditStatus: event.audit.status,
        eventId: event.eventId,
        evidenceHash: event.audit.evidenceHash,
        impactTotal: getAgentRankEventImpactTotal(event),
        occurredAt: event.occurredAt,
        qualityScore: event.audit.qualityScore,
        reasonCodes: getAgentRankReviewReasonCodes(event),
        source: event.source,
        sourceId: event.sourceId,
        starId: event.starId ?? null,
        type: event.type,
      },
      issuedAt,
      note: normalizeNote(body.note),
      previousStatus: getAgentRankReviewStatus(event),
      recordType: "agentrank.review_action_receipt",
      reviewerId: receiptSeed.reviewerId,
      reviewActionId: `review_action_${receiptHash.slice(0, 24)}`,
      reviewActionHash: receiptHash,
      scope,
      storage: {
        durable: false,
        mode: "mock_action_receipt",
        nextStep: "Persist this receipt to the AgentRank review ledger when auth and storage are enabled.",
      },
      targetStatus: nextStatus,
    };

    return Response.json(receipt, {
      headers: {
        "x-agentrank-event-id": event.eventId,
        "x-agentrank-record-type": receipt.recordType,
        "x-agentrank-review-action": action,
        "x-agentrank-review-action-hash": receiptHash,
        "x-agentrank-review-status": nextStatus,
      },
    });
  } catch (error) {
    console.error("AgentRank review action failed", error);

    return Response.json(
      {
        error: "AgentRank review action could not be created.",
      },
      {
        status: 500,
      },
    );
  }
}
