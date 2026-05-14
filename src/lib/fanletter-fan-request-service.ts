import "server-only";

import { randomUUID } from "node:crypto";

import type { Filter } from "mongodb";

import type {
  FanletterFanRequestDocument,
  FanletterFanRequestRecord,
  FanletterFanRequestStatus,
  FanletterFanRequestType,
  FanletterRealismRevisionReason,
} from "@/lib/content";
import {
  fanletterFanRequestStatuses,
  fanletterFanRequestTypes,
  fanletterRealismRevisionReasons,
} from "@/lib/content";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getFanletterFanRequestsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import {
  incrementFanletterFanRequestTemplateUsage,
  resolveFanletterFanRequestTemplateForSubmission,
} from "@/lib/fanletter-fan-request-template-service";
import { createFanletterRealismRevision } from "@/lib/fanletter-realism-policy";

const FANLETTER_FAN_REQUEST_BODY_LIMIT = 600;
const FANLETTER_FAN_REQUEST_DISPLAY_NAME_LIMIT = 40;
const FANLETTER_FAN_REQUEST_CHARACTER_NAME_LIMIT = 80;
const FANLETTER_FAN_REQUEST_SOURCE_PATH_LIMIT = 240;
const FANLETTER_FAN_REQUEST_PAGE_SIZE_MAX = 50;
const FANLETTER_FAN_REQUEST_RATE_LIMIT_COUNT = 3;
const FANLETTER_FAN_REQUEST_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const FANLETTER_FAN_REQUEST_DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const FANLETTER_FAN_REQUEST_RECEIPT_LOOKUP_LIMIT = 30;
const FANLETTER_FAN_REQUEST_BLOCKED_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /바카라|카지노|도박|토토|대출|성인광고|텔레그램|오픈채팅|카톡/i,
  /\b(casino|betting|telegram|whatsapp|loan|spam)\b/i,
];

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function trimToLength(value: string | null | undefined, limit: number) {
  const normalized = collapseWhitespace(value ?? "");

  return normalized ? normalized.slice(0, limit) : null;
}

function normalizeRequesterFingerprint(value: string | null | undefined) {
  const normalized = collapseWhitespace(value ?? "");

  return normalized ? normalized.slice(0, 80) : null;
}

function normalizeReceiptRequestIds(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? collapseWhitespace(value) : ""))
        .filter((value) => /^[A-Za-z0-9-]{8,80}$/.test(value)),
    ),
  ).slice(0, FANLETTER_FAN_REQUEST_RECEIPT_LOOKUP_LIMIT);
}

function assertFanRequestBodyAllowed(body: string) {
  if (FANLETTER_FAN_REQUEST_BLOCKED_PATTERNS.some((pattern) => pattern.test(body))) {
    throw new Error("Fan request contains blocked content.");
  }
}

function normalizeFanRequestType(
  value: string | null | undefined,
): FanletterFanRequestType {
  return fanletterFanRequestTypes.includes(value as FanletterFanRequestType)
    ? (value as FanletterFanRequestType)
    : "vlog_request";
}

function normalizeFanRequestStatus(
  value: string | null | undefined,
): FanletterFanRequestStatus {
  if (fanletterFanRequestStatuses.includes(value as FanletterFanRequestStatus)) {
    return value as FanletterFanRequestStatus;
  }

  throw new Error("Unsupported fan request status.");
}

function normalizeRealismRevisionReasons(
  values: FanletterFanRequestDocument["realismRevisionReasons"],
) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value): value is FanletterRealismRevisionReason =>
    fanletterRealismRevisionReasons.includes(value),
  );
}

function serializeFanRequest(
  request: FanletterFanRequestDocument,
): FanletterFanRequestRecord {
  const realismRevisionReasons = normalizeRealismRevisionReasons(
    request.realismRevisionReasons,
  );

  return {
    body: request.body,
    characterName: request.characterName,
    createdAt: request.createdAt.toISOString(),
    creatorDisplayName: request.creatorDisplayName,
    creatorReferralCode: request.creatorReferralCode,
    requestId: request.requestId,
    requestType: request.requestType,
    requesterDisplayName: request.requesterDisplayName,
    requesterEmail: request.requesterEmail,
    realismReviewedAt: request.realismReviewedAt?.toISOString() ?? null,
    realismRevised:
      realismRevisionReasons.length > 0 ||
      Boolean(request.originalBody && request.originalBody !== request.body),
    realismRevisionReasons,
    sourceContentId: request.sourceContentId,
    sourcePath: request.sourcePath,
    status: request.status,
    templateCategory: request.templateCategory ?? null,
    templateId: request.templateId ?? null,
    templateTitle: request.templateTitle ?? null,
    usedContentId: request.usedContentId ?? null,
    updatedAt: request.updatedAt.toISOString(),
  };
}

async function resolveFanRequestCreator({
  characterName,
  creatorReferralCode,
}: {
  characterName?: string | null;
  creatorReferralCode?: string | null;
}) {
  const normalizedReferralCode = normalizeReferralCode(creatorReferralCode);

  if (!normalizedReferralCode) {
    throw new Error("creatorReferralCode is required.");
  }

  const membersCollection = await getMembersCollection();
  const member = await membersCollection.findOne({
    referralCode: normalizedReferralCode,
    status: "completed",
  });

  if (!member) {
    throw new Error("Creator not found.");
  }

  const profilesCollection = await getCreatorProfilesCollection();
  const profile = await profilesCollection.findOne({ email: member.email });
  const fallbackDisplayName = member.email.split("@")[0] || "FanLetter";
  const accountDisplayName =
    profile?.displayName?.trim() || fallbackDisplayName;
  const resolvedCharacterName =
    trimToLength(characterName, FANLETTER_FAN_REQUEST_CHARACTER_NAME_LIMIT) ??
    trimToLength(
      profile?.characterPersona?.name ?? profile?.displayName,
      FANLETTER_FAN_REQUEST_CHARACTER_NAME_LIMIT,
    ) ??
    accountDisplayName;

  return {
    characterName: resolvedCharacterName,
    creatorDisplayName: resolvedCharacterName,
    creatorEmail: member.email,
    creatorReferralCode: normalizedReferralCode,
  };
}

async function normalizeSourceContentId({
  creatorReferralCode,
  sourceContentId,
}: {
  creatorReferralCode: string;
  sourceContentId?: string | null;
}) {
  const normalizedSourceContentId = sourceContentId?.trim() || null;

  if (!normalizedSourceContentId) {
    return null;
  }

  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({
    contentId: normalizedSourceContentId,
    status: "published",
  });

  if (!post) {
    throw new Error("Source content not found.");
  }

  if (post.authorReferralCode !== creatorReferralCode) {
    throw new Error("Source content does not match this creator.");
  }

  return normalizedSourceContentId;
}

function getFanRequestRequesterFilter(
  request: Pick<
    FanletterFanRequestDocument,
    "requesterDisplayName" | "requesterEmail" | "requesterFingerprint"
  >,
): Filter<FanletterFanRequestDocument> | null {
  if (request.requesterEmail) {
    return { requesterEmail: request.requesterEmail };
  }

  if (request.requesterFingerprint) {
    return { requesterFingerprint: request.requesterFingerprint };
  }

  if (request.requesterDisplayName) {
    return {
      requesterDisplayName: request.requesterDisplayName,
      requesterEmail: null,
    };
  }

  return null;
}

async function assertFanRequestSubmissionAllowed({
  now,
  request,
}: {
  now: Date;
  request: FanletterFanRequestDocument;
}) {
  assertFanRequestBodyAllowed(request.body);

  const requesterFilter = getFanRequestRequesterFilter(request);

  if (!requesterFilter) {
    return;
  }

  const requestsCollection = await getFanletterFanRequestsCollection();
  const duplicateSince = new Date(
    now.getTime() - FANLETTER_FAN_REQUEST_DUPLICATE_WINDOW_MS,
  );
  const duplicateRequest = await requestsCollection.findOne({
    ...requesterFilter,
    body: request.body,
    creatorReferralCode: request.creatorReferralCode,
    createdAt: { $gte: duplicateSince },
  });

  if (duplicateRequest) {
    throw new Error("Duplicate fan request.");
  }

  const rateLimitSince = new Date(
    now.getTime() - FANLETTER_FAN_REQUEST_RATE_LIMIT_WINDOW_MS,
  );
  const recentRequestCount = await requestsCollection.countDocuments({
    ...requesterFilter,
    creatorReferralCode: request.creatorReferralCode,
    createdAt: { $gte: rateLimitSince },
  });

  if (recentRequestCount >= FANLETTER_FAN_REQUEST_RATE_LIMIT_COUNT) {
    throw new Error("Too many fan requests. Please try again later.");
  }
}

export async function createFanletterFanRequest(input: {
  body?: string | null;
  characterName?: string | null;
  creatorReferralCode?: string | null;
  requestType?: string | null;
  requesterDisplayName?: string | null;
  requesterEmail?: string | null;
  requesterFingerprint?: string | null;
  sourceContentId?: string | null;
  sourcePath?: string | null;
  templateId?: string | null;
}) {
  const originalBody = trimToLength(input.body, FANLETTER_FAN_REQUEST_BODY_LIMIT);
  const realismRevision = createFanletterRealismRevision(
    originalBody,
    FANLETTER_FAN_REQUEST_BODY_LIMIT,
  );
  const body = trimToLength(
    realismRevision.text,
    FANLETTER_FAN_REQUEST_BODY_LIMIT,
  );

  if (!body) {
    throw new Error("Fan request body is required.");
  }

  const creator = await resolveFanRequestCreator({
    characterName: input.characterName,
    creatorReferralCode: input.creatorReferralCode,
  });
  const requesterEmail = normalizeEmail(input.requesterEmail ?? "") || null;

  if (requesterEmail && requesterEmail === creator.creatorEmail) {
    throw new Error("Creators cannot request their own character.");
  }

  const sourceContentId = await normalizeSourceContentId({
    creatorReferralCode: creator.creatorReferralCode,
    sourceContentId: input.sourceContentId,
  });
  const requestType = normalizeFanRequestType(input.requestType);
  const template = await resolveFanletterFanRequestTemplateForSubmission({
    requestType,
    templateId: input.templateId,
  });
  const now = new Date();
  const request: FanletterFanRequestDocument = {
    body,
    characterName: creator.characterName,
    createdAt: now,
    creatorDisplayName: creator.creatorDisplayName,
    creatorEmail: creator.creatorEmail,
    creatorReferralCode: creator.creatorReferralCode,
    requestId: randomUUID(),
    requestType,
    requesterDisplayName: trimToLength(
      input.requesterDisplayName,
      FANLETTER_FAN_REQUEST_DISPLAY_NAME_LIMIT,
    ),
    requesterEmail,
    requesterFingerprint: normalizeRequesterFingerprint(input.requesterFingerprint),
    originalBody: realismRevision.revised ? originalBody : null,
    realismReviewedAt: now,
    realismRevisionReasons: realismRevision.reasons,
    sourceContentId,
    sourcePath: trimToLength(input.sourcePath, FANLETTER_FAN_REQUEST_SOURCE_PATH_LIMIT),
    status: "new",
    templateCategory: template?.category ?? null,
    templateId: template?.templateId ?? null,
    templateTitle: template?.title ?? null,
    usedContentId: null,
    updatedAt: now,
  };
  const requestsCollection = await getFanletterFanRequestsCollection();

  await assertFanRequestSubmissionAllowed({ now, request });
  await requestsCollection.insertOne(request);
  await incrementFanletterFanRequestTemplateUsage(template?.templateId).catch(
    (error: unknown) => {
      console.warn("[fanletter-request] template usage increment failed", {
        message: error instanceof Error ? error.message : String(error),
        templateId: template?.templateId,
      });
    },
  );

  return serializeFanRequest(request);
}

export async function getFanletterFanRequestsForCreator({
  creatorEmail,
  pageSize = 20,
  status,
}: {
  creatorEmail: string;
  pageSize?: number;
  status?: FanletterFanRequestStatus | "open" | null;
}) {
  const normalizedPageSize = Math.max(
    1,
    Math.min(Math.trunc(pageSize), FANLETTER_FAN_REQUEST_PAGE_SIZE_MAX),
  );
  const filter: Filter<FanletterFanRequestDocument> = {
    creatorEmail,
    status:
      status === "open" || !status
        ? { $in: ["new", "reviewed", "used"] }
        : status,
  };
  const requestsCollection = await getFanletterFanRequestsCollection();
  const requests = await requestsCollection
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(normalizedPageSize + 1)
    .toArray();
  const visibleRequests = requests.slice(0, normalizedPageSize);

  return {
    pageInfo: {
      hasNextPage: requests.length > normalizedPageSize,
      pageSize: normalizedPageSize,
    },
    requests: visibleRequests.map(serializeFanRequest),
  };
}

export async function getFanletterFanRequestsForRequester({
  pageSize = 20,
  requesterEmail,
}: {
  pageSize?: number;
  requesterEmail: string;
}) {
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);

  if (!normalizedRequesterEmail) {
    throw new Error("requesterEmail is required.");
  }

  const normalizedPageSize = Math.max(
    1,
    Math.min(Math.trunc(pageSize), FANLETTER_FAN_REQUEST_PAGE_SIZE_MAX),
  );
  const requestsCollection = await getFanletterFanRequestsCollection();
  const requests = await requestsCollection
    .find({
      requesterEmail: normalizedRequesterEmail,
      status: { $in: ["new", "reviewed", "used"] },
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(normalizedPageSize + 1)
    .toArray();
  const visibleRequests = requests.slice(0, normalizedPageSize);

  return {
    pageInfo: {
      hasNextPage: requests.length > normalizedPageSize,
      pageSize: normalizedPageSize,
    },
    requests: visibleRequests.map(serializeFanRequest),
  };
}

export async function getFanletterFanRequestsForReceiptIds({
  pageSize = 20,
  requestIds,
}: {
  pageSize?: number;
  requestIds: unknown[];
}) {
  const normalizedRequestIds = normalizeReceiptRequestIds(requestIds);
  const normalizedPageSize = Math.max(
    1,
    Math.min(Math.trunc(pageSize), FANLETTER_FAN_REQUEST_PAGE_SIZE_MAX),
  );

  if (normalizedRequestIds.length === 0) {
    return {
      pageInfo: {
        hasNextPage: false,
        pageSize: normalizedPageSize,
      },
      requests: [],
    };
  }

  const requestsCollection = await getFanletterFanRequestsCollection();
  const requests = await requestsCollection
    .find({
      requestId: { $in: normalizedRequestIds },
      status: { $in: ["new", "reviewed", "used"] },
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(normalizedPageSize + 1)
    .toArray();
  const visibleRequests = requests.slice(0, normalizedPageSize);

  return {
    pageInfo: {
      hasNextPage: requests.length > normalizedPageSize,
      pageSize: normalizedPageSize,
    },
    requests: visibleRequests.map(serializeFanRequest),
  };
}

export async function claimFanletterFanRequestReceiptsForRequester({
  pageSize = 20,
  requesterEmail,
  requestIds,
}: {
  pageSize?: number;
  requesterEmail: string;
  requestIds: unknown[];
}) {
  const normalizedRequesterEmail = normalizeEmail(requesterEmail);

  if (!normalizedRequesterEmail) {
    throw new Error("requesterEmail is required.");
  }

  const normalizedRequestIds = normalizeReceiptRequestIds(requestIds);
  const normalizedPageSize = Math.max(
    1,
    Math.min(Math.trunc(pageSize), FANLETTER_FAN_REQUEST_PAGE_SIZE_MAX),
  );

  if (normalizedRequestIds.length === 0) {
    return {
      pageInfo: {
        hasNextPage: false,
        pageSize: normalizedPageSize,
      },
      requests: [],
    };
  }

  const requestsCollection = await getFanletterFanRequestsCollection();

  await requestsCollection.updateMany(
    {
      requestId: { $in: normalizedRequestIds },
      requesterEmail: null,
    },
    {
      $set: {
        requesterEmail: normalizedRequesterEmail,
      },
    },
  );

  const requests = await requestsCollection
    .find({
      requestId: { $in: normalizedRequestIds },
      requesterEmail: normalizedRequesterEmail,
      status: { $in: ["new", "reviewed", "used"] },
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(normalizedPageSize + 1)
    .toArray();
  const visibleRequests = requests.slice(0, normalizedPageSize);

  return {
    pageInfo: {
      hasNextPage: requests.length > normalizedPageSize,
      pageSize: normalizedPageSize,
    },
    requests: visibleRequests.map(serializeFanRequest),
  };
}

export async function updateFanletterFanRequestStatusForCreator({
  contentId,
  creatorEmail,
  requestId,
  status,
}: {
  contentId?: string | null;
  creatorEmail: string;
  requestId?: string | null;
  status?: string | null;
}) {
  const normalizedRequestId = requestId?.trim();

  if (!normalizedRequestId) {
    throw new Error("requestId is required.");
  }

  const normalizedStatus = normalizeFanRequestStatus(status);
  const normalizedContentId = contentId?.trim() || null;

  if (normalizedStatus === "used") {
    if (!normalizedContentId) {
      throw new Error("Published content is required.");
    }

    const postsCollection = await getContentPostsCollection();
    const post = await postsCollection.findOne({
      contentId: normalizedContentId,
      status: "published",
    });

    if (!post) {
      throw new Error("Content not found.");
    }

    if (post.authorEmail !== creatorEmail) {
      throw new Error("Content does not belong to this creator.");
    }
  }

  const now = new Date();
  const requestsCollection = await getFanletterFanRequestsCollection();
  const result = await requestsCollection.findOneAndUpdate(
    {
      creatorEmail,
      requestId: normalizedRequestId,
    },
    {
      $set: {
        status: normalizedStatus,
        updatedAt: now,
        ...(normalizedStatus === "used"
          ? { usedContentId: normalizedContentId }
          : {}),
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new Error("Fan request not found.");
  }

  return serializeFanRequest(result);
}
