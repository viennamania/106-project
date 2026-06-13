import "server-only";

import { randomUUID } from "crypto";

import { buildAgentRankReputationEventDraft } from "@/lib/agentrank/event-schema";
import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import type {
  FunnelEventDocument,
  FunnelEventMetadata,
  FunnelEventName,
} from "@/lib/funnel";
import { getFunnelEventsCollection } from "@/lib/mongodb";

type RecordFanletterAgentRankServerEventInput = {
  agentRank: AgentRankInteractionSignal;
  contentId?: string | null;
  eventName: FunnelEventName;
  memberEmail?: string | null;
  memberWalletAddress?: string | null;
  metadata?: FunnelEventMetadata;
  path?: string | null;
  referer?: string | null;
  referralCode?: string | null;
  shareId?: string | null;
  targetHref?: string | null;
  userAgent?: string | null;
};

export async function recordFanletterAgentRankServerEvent({
  agentRank,
  contentId = null,
  eventName,
  memberEmail = null,
  memberWalletAddress = null,
  metadata,
  path = null,
  referer = null,
  referralCode = null,
  shareId = null,
  targetHref = null,
  userAgent = null,
}: RecordFanletterAgentRankServerEventInput) {
  const collection = await getFunnelEventsCollection();
  const createdAt = new Date();
  const viewerType = memberEmail ? "member" : "guest";
  const document = {
    agentRank,
    contentId,
    createdAt,
    eventId: randomUUID(),
    memberEmail,
    memberWalletAddress,
    metadata,
    name: eventName,
    path,
    referer,
    referralCode,
    reputationEvent: buildAgentRankReputationEventDraft({
      agentRank,
      contentId,
      eventName,
      memberEmail,
      memberWalletAddress,
      metadata,
      path,
      referralCode,
      shareId,
      targetHref,
      viewerType,
    }),
    shareId,
    targetHref,
    userAgent,
    viewerType,
    viewport: null,
  } satisfies FunnelEventDocument;

  await collection.insertOne(document);

  return document.eventId;
}

export async function tryRecordFanletterAgentRankServerEvent(
  input: RecordFanletterAgentRankServerEventInput,
) {
  try {
    return await recordFanletterAgentRankServerEvent(input);
  } catch (error) {
    console.warn("FanLetter AgentRank server event could not be recorded", {
      error,
      eventName: input.eventName,
      source: input.agentRank.source,
      starId: input.agentRank.starId,
    });

    return null;
  }
}
