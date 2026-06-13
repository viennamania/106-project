import { randomUUID } from "crypto";

import { buildAgentRankReputationEventDraft } from "@/lib/agentrank/event-schema";
import { inferAgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import {
  type FunnelEventMetadata,
  isFunnelEventName,
} from "@/lib/funnel";
import { readMemberServerSession } from "@/lib/member-server-session";
import { getFunnelEventsCollection } from "@/lib/mongodb";
import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readMetadata(value: unknown): FunnelEventMetadata | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const metadata: FunnelEventMetadata = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean" ||
      rawValue === null
    ) {
      metadata[key.slice(0, 80)] = rawValue;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function readViewport(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const width = "width" in value ? Number(value.width) : NaN;
  const height = "height" in value ? Number(value.height) : NaN;

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    height: Math.max(0, Math.round(height)),
    width: Math.max(0, Math.round(width)),
  };
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Invalid event body.", 400);
  }

  const name = "name" in body ? body.name : null;

  if (!isFunnelEventName(name)) {
    return jsonError("Invalid funnel event name.", 400);
  }

  const headerStore = request.headers;
  const session = await readMemberServerSession();
  const memberEmail = session?.email ?? null;
  const memberWalletAddress = session?.walletAddress
    ? normalizeAddress(session.walletAddress)
    : null;
  const collection = await getFunnelEventsCollection();
  const now = new Date();
  const contentId = readNullableString("contentId" in body ? body.contentId : null);
  const metadata = readMetadata("metadata" in body ? body.metadata : null);
  const path = readNullableString("path" in body ? body.path : null);
  const referralCode = normalizeReferralCode(
    readNullableString("referralCode" in body ? body.referralCode : null),
  );
  const shareId = normalizeShareId(
    readNullableString("shareId" in body ? body.shareId : null),
  );
  const targetHref = readNullableString(
    "targetHref" in body ? body.targetHref : null,
  );
  const agentRank = inferAgentRankInteractionSignal(
    "agentRank" in body ? body.agentRank : null,
    {
      contentId,
      eventName: name,
      metadata,
      path,
      referralCode,
      shareId,
      targetHref,
    },
  );
  const viewerType = memberEmail ? "member" : "guest";
  const reputationEvent = agentRank
    ? buildAgentRankReputationEventDraft({
        agentRank,
        contentId,
        eventName: name,
        memberEmail,
        memberWalletAddress,
        metadata,
        path,
        referralCode,
        shareId,
        targetHref,
        viewerType,
      })
    : null;

  await collection.insertOne({
    agentRank,
    contentId,
    createdAt: now,
    eventId: randomUUID(),
    memberEmail,
    memberWalletAddress,
    metadata,
    name,
    path,
    referer: headerStore.get("referer"),
    referralCode,
    reputationEvent,
    shareId,
    targetHref,
    userAgent: headerStore.get("user-agent"),
    viewerType,
    viewport: readViewport("viewport" in body ? body.viewport : null),
  });

  return Response.json({ ok: true });
}
