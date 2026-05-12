import { createHash } from "node:crypto";

import type {
  FanletterFanRequestCreateRequest,
  FanletterFanRequestCreateResponse,
  FanletterFanRequestStatus,
  FanletterFanRequestStatusUpdateRequest,
  FanletterFanRequestStatusUpdateResponse,
  FanletterFanRequestsResponse,
} from "@/lib/content";
import { fanletterFanRequestStatuses } from "@/lib/content";
import {
  createFanletterFanRequest,
  getFanletterFanRequestsForCreator,
  updateFanletterFanRequestStatusForCreator,
} from "@/lib/fanletter-fan-request-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (
    message === "creatorReferralCode is required." ||
    message === "Fan request body is required." ||
    message === "Fan request contains blocked content." ||
    message === "Creators cannot request their own character." ||
    message === "requestId is required." ||
    message === "Published content is required." ||
    message === "Unsupported fan request status."
  ) {
    return 400;
  }

  if (message === "Duplicate fan request.") {
    return 409;
  }

  if (message === "Too many fan requests. Please try again later.") {
    return 429;
  }

  if (
    message === "Creator not found." ||
    message === "Source content not found." ||
    message === "Content not found." ||
    message === "Fan request not found."
  ) {
    return 404;
  }

  if (
    message === "Source content does not match this creator." ||
    message === "Content does not belong to this creator."
  ) {
    return 403;
  }

  return 500;
}

function readStatus(value: string | null): FanletterFanRequestStatus | "open" {
  if (!value || value === "open") {
    return "open";
  }

  if (fanletterFanRequestStatuses.includes(value as FanletterFanRequestStatus)) {
    return value as FanletterFanRequestStatus;
  }

  throw new Error("Unsupported fan request status.");
}

function readPageSize(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed)));
}

function getRequesterFingerprint(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const realIp = request.headers.get("x-real-ip")?.trim() ?? "";
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 180) ?? "";
  const fingerprintSource = `${forwardedFor || realIp}|${userAgent}`;

  if (!fingerprintSource.replace("|", "").trim()) {
    return null;
  }

  return createHash("sha256").update(fingerprintSource).digest("hex").slice(0, 40);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");

  try {
    const authorization = await validateMemberWalletOwner({
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: FanletterFanRequestsResponse =
      await getFanletterFanRequestsForCreator({
        creatorEmail: authorization.member.email,
        pageSize: readPageSize(url.searchParams.get("pageSize")),
        status: readStatus(url.searchParams.get("status")),
      });

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load fan requests.";

    return jsonError(message, getErrorStatus(message));
  }
}

export async function POST(request: Request) {
  let body: FanletterFanRequestCreateRequest | null = null;

  try {
    body = (await request.json()) as FanletterFanRequestCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const session = await readMemberServerSession();
    let requesterEmail: string | null = null;

    if (session) {
      const authorization = await validateMemberWalletOwner({
        email: session.email,
        walletAddress: session.walletAddress,
      });

      if (!authorization.error) {
        requesterEmail = authorization.normalizedEmail;
      }
    }

    const fanRequest = await createFanletterFanRequest({
      body: body?.body,
      characterName: body?.characterName,
      creatorReferralCode: body?.creatorReferralCode,
      requestType: body?.requestType,
      requesterDisplayName: body?.requesterDisplayName,
      requesterEmail,
      requesterFingerprint: getRequesterFingerprint(request),
      sourceContentId: body?.sourceContentId,
      sourcePath: body?.sourcePath,
      templateId: body?.templateId,
    });
    const response: FanletterFanRequestCreateResponse = {
      request: fanRequest,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create fan request.";

    return jsonError(message, getErrorStatus(message));
  }
}

export async function PATCH(request: Request) {
  let body: FanletterFanRequestStatusUpdateRequest | null = null;

  try {
    body = (await request.json()) as FanletterFanRequestStatusUpdateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body?.email,
      walletAddress: body?.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const fanRequest = await updateFanletterFanRequestStatusForCreator({
      contentId: body?.contentId,
      creatorEmail: authorization.member.email,
      requestId: body?.requestId,
      status: body?.status,
    });
    const response: FanletterFanRequestStatusUpdateResponse = {
      request: fanRequest,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update fan request.";

    return jsonError(message, getErrorStatus(message));
  }
}
