import "server-only";

import { createHash, randomUUID } from "crypto";

import type { ContentPostRecord } from "@/lib/content";
import {
  CONTENT_AUTOMATION_MAX_ALLOWED_DOMAIN_COUNT,
  CONTENT_AUTOMATION_MAX_SOURCE_COUNT,
  CONTENT_AUTOMATION_MAX_TOPIC_COUNT,
  CONTENT_AUTOMATION_RECENT_JOB_LIMIT,
  serializeContentAutomationJob,
  serializeContentSourceItem,
  serializeCreatorAutomationProfile,
  type ContentAutomationJobDocument,
  type ContentAutomationJobMode,
  type ContentAutomationJobRecord,
  type ContentAutomationRunRequest,
  type ContentSourceItemDocument,
  type ContentSourceItemRecord,
  type CreatorAutomationProfileDocument,
  type CreatorAutomationProfileRecord,
  type CreatorAutomationProfileUpsertRequest,
} from "@/lib/content-automation";
import { generateAndUploadContentCover } from "@/lib/content-cover-service";
import { createContentPostForMember, getCreatorProfileForMember } from "@/lib/content-service";
import { getMemberRegistrationStatus } from "@/lib/member-service";
import {
  getContentAutomationJobsCollection,
  getContentPostSourceAttributionsCollection,
  getContentSourceItemsCollection,
  getCreatorAutomationProfilesCollection,
} from "@/lib/mongodb";
import { normalizeEmail, serializeMember, type MemberDocument } from "@/lib/member";

const PERSONA_NAME_LIMIT = 60;
const PERSONA_PROMPT_LIMIT = 1_800;
const TOPIC_LENGTH_LIMIT = 60;
const SOURCE_SNIPPET_LIMIT = 320;
const DEFAULT_PUBLISH_SCORE_THRESHOLD = 86;
const DEFAULT_MAX_POSTS_PER_DAY = 1;
const DEFAULT_MIN_INTERVAL_MINUTES = 360;
const DEFAULT_LANGUAGE = "ko";
const DEFAULT_AUTOMATION_TEST_MEMBER_EMAILS = ["genie1647@gmail.com"];

type DiscoverySource = {
  domain: string;
  imageUrl: string | null;
  title: string;
  url: string;
};

type DraftPayload = {
  body: string;
  score: number;
  sourceUrls: string[];
  suggestedCoverPrompt: string;
  summary: string;
  tags: string[];
  title: string;
  topic: string;
};

type OpenAiResponsesApiResponse = {
  error?: {
    message?: string;
  };
  output?: Array<{
    action?: {
      sources?: Array<{
        title?: string;
        url?: string;
      }>;
    };
    type?: string;
  }>;
  output_text?: string;
};

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function normalizeOptionalText(value: string | null | undefined, limit: number) {
  const trimmed = trimToLength(value, limit);
  return trimmed || null;
}

function clampInteger(
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value as number), min), max);
}

function normalizeTopicList(topics?: string[]) {
  return Array.from(
    new Set(
      (topics ?? [])
        .map((topic) => trimToLength(topic, TOPIC_LENGTH_LIMIT))
        .filter(Boolean),
    ),
  ).slice(0, CONTENT_AUTOMATION_MAX_TOPIC_COUNT);
}

function normalizeAllowedDomains(domains?: string[]) {
  return Array.from(
    new Set(
      (domains ?? [])
        .map((domain) => {
          const normalized = domain
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, "");
          return normalized || null;
        })
        .filter((domain): domain is string => Boolean(domain)),
    ),
  ).slice(0, CONTENT_AUTOMATION_MAX_ALLOWED_DOMAIN_COUNT);
}

function normalizeSourceModes(
  modes?: string[],
): Array<"web_search" | "rss" | "manual"> {
  const supported = new Set(["web_search", "rss", "manual"]);
  const normalized = Array.from(
    new Set(
      (modes ?? []).filter(
        (mode): mode is "web_search" | "rss" | "manual" => supported.has(mode),
      ),
    ),
  );

  return normalized.length ? normalized : ["web_search"];
}

function getAllowedAutomationMemberEmails() {
  const configured = process.env.CONTENT_AUTOMATION_ALLOWED_MEMBER_EMAILS?.trim();

  if (!configured) {
    return DEFAULT_AUTOMATION_TEST_MEMBER_EMAILS;
  }

  if (configured === "*") {
    return ["*"];
  }

  const emails = configured
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter((value): value is string => Boolean(value));

  return emails.length > 0 ? emails : DEFAULT_AUTOMATION_TEST_MEMBER_EMAILS;
}

export function isMemberAllowedForContentAutomation(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  const allowedEmails = getAllowedAutomationMemberEmails();

  if (allowedEmails.includes("*")) {
    return true;
  }

  return allowedEmails.includes(normalizedEmail);
}

function assertContentAutomationAccess(email: string) {
  if (!isMemberAllowedForContentAutomation(email)) {
    throw new Error("Content automation is not enabled for this member.");
  }
}

function buildDefaultPersonaPrompt(displayName: string, intro: string) {
  return trimToLength(
    [
      `${displayName} 채널의 AI 에디터로 행동하세요.`,
      intro ? `채널 소개: ${intro}` : null,
      "한국어로 작성하고, 과장하지 말고, 공개 출처 기반 사실만 사용하세요.",
      "짧은 단락과 실용적인 톤으로 쓰고, 원문을 그대로 복붙하지 마세요.",
    ]
      .filter(Boolean)
      .join(" "),
    PERSONA_PROMPT_LIMIT,
  );
}

async function getCompletedMemberOrThrow(email: string) {
  const member = await getMemberRegistrationStatus(email);

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.status !== "completed") {
    throw new Error("Completed signup is required.");
  }

  return member;
}

async function buildDefaultAutomationProfile(member: MemberDocument) {
  const creatorProfile = await getCreatorProfileForMember(member.email);

  return {
    allowedDomains: [],
    autoPublish: false,
    coverImageMode: "generated" as const,
    createdAt: new Date(),
    enabled: false,
    language: DEFAULT_LANGUAGE,
    maxPostsPerDay: DEFAULT_MAX_POSTS_PER_DAY,
    memberEmail: member.email,
    minIntervalMinutes: DEFAULT_MIN_INTERVAL_MINUTES,
    personaName: trimToLength(
      creatorProfile.displayName || member.email.split("@")[0] || "AI Creator",
      PERSONA_NAME_LIMIT,
    ),
    personaPrompt: buildDefaultPersonaPrompt(
      creatorProfile.displayName || member.email.split("@")[0] || "AI Creator",
      creatorProfile.intro,
    ),
    publishScoreThreshold: DEFAULT_PUBLISH_SCORE_THRESHOLD,
    sourceModes: ["web_search"],
    topics: [],
    updatedAt: new Date(),
  } satisfies CreatorAutomationProfileDocument;
}

async function readStoredAutomationProfile(email: string) {
  const collection = await getCreatorAutomationProfilesCollection();
  return collection.findOne({ memberEmail: normalizeEmail(email) });
}

function getDiscoveryModel() {
  return process.env.OPENAI_CONTENT_DISCOVERY_MODEL ?? "gpt-5";
}

function getDraftModel() {
  return process.env.OPENAI_CONTENT_DRAFT_MODEL ?? "gpt-4o-mini";
}

async function requestOpenAiResponse(
  apiKey: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const json = (await response.json().catch(() => null)) as
    | OpenAiResponsesApiResponse
    | null;

  return { json, response };
}

function isUnsupportedReasoningError(message: string | undefined) {
  const normalizedMessage = message?.toLowerCase() ?? "";

  return (
    normalizedMessage.includes("reasoning.effort") &&
    normalizedMessage.includes("not supported with this model")
  );
}

async function createOpenAiResponse(payload: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const { json, response } = await requestOpenAiResponse(apiKey, payload);

  if (!response.ok) {
    if ("reasoning" in payload && isUnsupportedReasoningError(json?.error?.message)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.reasoning;

      const fallbackResponse = await requestOpenAiResponse(apiKey, fallbackPayload);

      if (!fallbackResponse.response.ok) {
        throw new Error(
          fallbackResponse.json?.error?.message
            ? `OpenAI request failed: ${fallbackResponse.json.error.message}`
            : `OpenAI request failed with status ${fallbackResponse.response.status}.`,
        );
      }

      return fallbackResponse.json ?? {};
    }

    throw new Error(
      json?.error?.message
        ? `OpenAI request failed: ${json.error.message}`
        : `OpenAI request failed with status ${response.status}.`,
    );
  }

  return json ?? {};
}

function extractWebSearchSources(response: OpenAiResponsesApiResponse) {
  const dedupe = new Map<string, DiscoverySource>();

  for (const item of response.output ?? []) {
    const sources = item.action?.sources ?? [];

    for (const source of sources) {
      const url = source.url?.trim();

      if (!url) {
        continue;
      }

      try {
        const parsedUrl = new URL(url);
        if (!dedupe.has(url)) {
          dedupe.set(url, {
            domain: parsedUrl.hostname.replace(/^www\./, ""),
            imageUrl: null,
            title: source.title?.trim() || parsedUrl.hostname,
            url,
          });
        }
      } catch {
        continue;
      }
    }
  }

  return Array.from(dedupe.values()).slice(0, CONTENT_AUTOMATION_MAX_SOURCE_COUNT);
}

function buildDiscoverySummaryFromSources(
  profile: CreatorAutomationProfileDocument,
  sources: DiscoverySource[],
) {
  const sourceTitles = sources
    .map((source) => source.title.trim())
    .filter(Boolean)
    .slice(0, 3);
  const sourceDomains = Array.from(
    new Set(sources.map((source) => source.domain.trim()).filter(Boolean)),
  ).slice(0, 3);

  return trimToLength(
    [
      `${profile.personaName} 채널용 자동 수집 출처 요약입니다.`,
      sourceTitles.length > 0 ? `핵심 주제: ${sourceTitles.join(", ")}.` : null,
      sourceDomains.length > 0 ? `출처 도메인: ${sourceDomains.join(", ")}.` : null,
      "공개 출처 기반으로 실용적인 네트워크 피드 초안을 생성합니다.",
    ]
      .filter(Boolean)
      .join(" "),
    2_000,
  );
}

async function discoverSourcesForProfile(
  profile: CreatorAutomationProfileDocument,
): Promise<{ discoveryText: string; sources: DiscoverySource[] }> {
  if (!profile.sourceModes.includes("web_search")) {
    throw new Error("Only web_search source mode is supported in this release.");
  }

  const topics =
    profile.topics.length > 0 ? profile.topics.join(", ") : "AI, productivity, network content";
  const today = new Date().toISOString().slice(0, 10);
  const response = await createOpenAiResponse({
    model: getDiscoveryModel(),
    reasoning: { effort: "low" },
    tools: [
      profile.allowedDomains.length > 0
        ? {
            type: "web_search",
            filters: {
              allowed_domains: profile.allowedDomains,
            },
          }
        : {
            type: "web_search",
          },
    ],
    tool_choice: "auto",
    include: ["web_search_call.action.sources"],
    input: [
      {
        role: "system",
        content:
          "You are a source researcher for an AI creator. Find recent, public, factual web sources and summarize why they matter. Avoid gossip, rumors, and low quality listicles.",
      },
      {
        role: "user",
        content: [
          `Date: ${today}.`,
          `Language: ${profile.language}.`,
          `Persona: ${profile.personaName}.`,
          `Topics: ${topics}.`,
          "Find up to 5 timely, practical public sources that could support one feed post. Summarize the common thread in concise Korean.",
        ].join(" "),
      },
    ],
  });

  const sources = extractWebSearchSources(response);
  const discoveryText =
    trimToLength(response.output_text, 2_000) ||
    buildDiscoverySummaryFromSources(profile, sources);

  if (sources.length === 0) {
    throw new Error("No public sources were found for automation.");
  }

  if (!discoveryText) {
    throw new Error("Discovery summary was empty.");
  }

  return { discoveryText, sources };
}

function createDraftSchema() {
  return {
    type: "object",
    properties: {
      topic: { type: "string" },
      title: { type: "string" },
      summary: { type: "string" },
      body: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
        maxItems: 6,
      },
      suggestedCoverPrompt: { type: "string" },
      score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
      },
      sourceUrls: {
        type: "array",
        items: { type: "string" },
        maxItems: CONTENT_AUTOMATION_MAX_SOURCE_COUNT,
      },
    },
    required: [
      "topic",
      "title",
      "summary",
      "body",
      "tags",
      "suggestedCoverPrompt",
      "score",
      "sourceUrls",
    ],
    additionalProperties: false,
  };
}

async function generateDraftForProfile(
  profile: CreatorAutomationProfileDocument,
  discovery: { discoveryText: string; sources: DiscoverySource[] },
): Promise<DraftPayload> {
  const response = await createOpenAiResponse({
    model: getDraftModel(),
    input: [
      {
        role: "system",
        content: [
          `You are the editorial operator for ${profile.personaName}.`,
          profile.personaPrompt,
          "Use only the supplied source list and discovery summary.",
          "Write original Korean copy. Do not copy source text verbatim.",
          "Keep the writing concise, practical, and credible.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            allowedDomains: profile.allowedDomains,
            autoPublish: profile.autoPublish,
            coverImageMode: profile.coverImageMode,
            discoverySummary: discovery.discoveryText,
            personaName: profile.personaName,
            publishScoreThreshold: profile.publishScoreThreshold,
            sourcePackets: discovery.sources.map((source) => ({
              domain: source.domain,
              title: source.title,
              url: source.url,
            })),
            topics: profile.topics,
          },
          null,
          2,
        ),
      },
    ],
    reasoning: { effort: "low" },
    text: {
      format: {
        type: "json_schema",
        name: "content_automation_draft",
        schema: createDraftSchema(),
        strict: true,
      },
    },
  });

  const outputText = trimToLength(response.output_text, 20_000);

  if (!outputText) {
    throw new Error("Draft generation returned an empty payload.");
  }

  let parsed: DraftPayload;

  try {
    parsed = JSON.parse(outputText) as DraftPayload;
  } catch {
    throw new Error("Draft generation returned invalid JSON.");
  }

  if (!parsed.title?.trim() || !parsed.summary?.trim() || !parsed.body?.trim()) {
    throw new Error("Draft generation returned incomplete content.");
  }

  return {
    body: parsed.body.trim(),
    score: clampInteger(parsed.score, 0, 100, 0),
    sourceUrls: Array.from(new Set((parsed.sourceUrls ?? []).map((url) => url.trim()).filter(Boolean))).slice(
      0,
      CONTENT_AUTOMATION_MAX_SOURCE_COUNT,
    ),
    suggestedCoverPrompt: parsed.suggestedCoverPrompt.trim(),
    summary: parsed.summary.trim(),
    tags: (parsed.tags ?? []).map((tag) => trimToLength(tag, 24)).filter(Boolean).slice(0, 6),
    title: parsed.title.trim(),
    topic: parsed.topic.trim() || parsed.title.trim(),
  };
}

async function upsertSourceItems(
  memberEmail: string,
  discoverySummary: string,
  sources: DiscoverySource[],
) {
  const collection = await getContentSourceItemsCollection();
  const items: ContentSourceItemDocument[] = [];

  for (const source of sources) {
    const fingerprint = createHash("sha256")
      .update(`${memberEmail}::${source.url}::${source.title}`)
      .digest("hex");
    const now = new Date();
    const existing = await collection.findOne({ memberEmail, fingerprint });
    const nextItem: ContentSourceItemDocument = {
      domain: source.domain,
      fetchedAt: now,
      fingerprint,
      imageUrl: source.imageUrl,
      licenseType: "unknown",
      memberEmail,
      snippet: trimToLength(discoverySummary, SOURCE_SNIPPET_LIMIT),
      sourceItemId: randomUUID(),
      status: existing?.status ?? "new",
      title: source.title,
      url: source.url,
    };

    await collection.updateOne(
      { memberEmail, fingerprint },
      {
        $set: {
          ...nextItem,
          sourceItemId: existing?.sourceItemId ?? nextItem.sourceItemId,
        },
      },
      { upsert: true },
    );

    items.push({
      ...nextItem,
      sourceItemId: existing?.sourceItemId ?? nextItem.sourceItemId,
    });
  }

  return items;
}

async function createQueuedJob(
  memberEmail: string,
  mode: ContentAutomationJobMode,
) {
  const collection = await getContentAutomationJobsCollection();
  const now = new Date();
  const job: ContentAutomationJobDocument = {
    createdAt: now,
    jobId: randomUUID(),
    memberEmail,
    mode,
    sourceItemIds: [],
    sourceUrls: [],
    status: "queued",
    tags: [],
  };

  await collection.insertOne(job);
  return job;
}

async function markJobRunning(jobId: string) {
  const collection = await getContentAutomationJobsCollection();
  const now = new Date();

  await collection.updateOne(
    { jobId },
    {
      $set: {
        startedAt: now,
        status: "running",
      },
    },
  );
}

async function completeJob(
  jobId: string,
  update: Partial<ContentAutomationJobDocument>,
) {
  const collection = await getContentAutomationJobsCollection();
  const now = new Date();

  await collection.updateOne(
    { jobId },
    {
      $set: {
        ...update,
        finishedAt: now,
        status: "completed",
      },
    },
  );

  const nextJob = await collection.findOne({ jobId });
  if (!nextJob) {
    throw new Error("Automation job disappeared after completion.");
  }
  return nextJob;
}

async function failJob(jobId: string, errorMessage: string) {
  const collection = await getContentAutomationJobsCollection();
  const now = new Date();

  await collection.updateOne(
    { jobId },
    {
      $set: {
        error: errorMessage,
        finishedAt: now,
        status: "failed",
      },
    },
  );

  const nextJob = await collection.findOne({ jobId });
  if (!nextJob) {
    throw new Error("Automation job disappeared after failure.");
  }
  return nextJob;
}

async function enforceAutomationCadence(
  memberEmail: string,
  profile: CreatorAutomationProfileDocument,
) {
  const jobsCollection = await getContentAutomationJobsCollection();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const publishedToday = await jobsCollection.countDocuments({
    createdAt: { $gte: since },
    memberEmail,
    outputStatus: "published",
    status: "completed",
  });

  if (publishedToday >= profile.maxPostsPerDay) {
    throw new Error("Daily automation posting limit has been reached.");
  }

  const latestJob = await jobsCollection.findOne(
    {
      memberEmail,
      outputStatus: "published",
      status: "completed",
    },
    { sort: { finishedAt: -1, createdAt: -1 } },
  );

  if (!latestJob?.finishedAt) {
    return;
  }

  const elapsedMs = Date.now() - latestJob.finishedAt.getTime();
  const minIntervalMs = profile.minIntervalMinutes * 60 * 1000;

  if (elapsedMs < minIntervalMs) {
    throw new Error("Automation minimum posting interval has not elapsed yet.");
  }
}

async function maybeGenerateAutomationCover(options: {
  body: string;
  member: MemberDocument;
  profile: CreatorAutomationProfileDocument;
  suggestedCoverPrompt: string;
  summary: string;
  title: string;
}) {
  if (options.profile.coverImageMode !== "generated") {
    return {
      coverImageError: null,
      coverImageUrl: null,
    };
  }

  if (!options.member.referralCode) {
    return {
      coverImageError: "Completed member is missing referral code.",
      coverImageUrl: null,
    };
  }

  try {
    const generatedCover = await generateAndUploadContentCover({
      body: options.body,
      referralCode: options.member.referralCode,
      summary: options.summary,
      title: options.title,
      visualBrief: options.suggestedCoverPrompt,
    });

    return {
      coverImageError: null,
      coverImageUrl: generatedCover.url,
    };
  } catch (error) {
    return {
      coverImageError:
        error instanceof Error
          ? `AI cover generation failed: ${error.message}`
          : "AI cover generation failed.",
      coverImageUrl: null,
    };
  }
}

export async function getEnabledContentAutomationMemberEmails() {
  const collection = await getCreatorAutomationProfilesCollection();
  const profiles = await collection
    .find(
      { enabled: true },
      {
        projection: {
          _id: 0,
          memberEmail: 1,
        },
      },
    )
    .sort({ updatedAt: -1 })
    .toArray();

  return Array.from(
    new Set(
      profiles
        .map((profile) => normalizeEmail(profile.memberEmail))
        .filter((email): email is string => Boolean(email))
        .filter((email) => isMemberAllowedForContentAutomation(email)),
    ),
  );
}

export async function getCreatorAutomationProfileForMember(
  email: string,
): Promise<{ member: MemberDocument; profile: CreatorAutomationProfileRecord }> {
  const member = await getCompletedMemberOrThrow(email);
  assertContentAutomationAccess(member.email);
  const stored = await readStoredAutomationProfile(member.email);

  if (!stored) {
    return {
      member,
      profile: serializeCreatorAutomationProfile(
        await buildDefaultAutomationProfile(member),
      ),
    };
  }

  return {
    member,
    profile: serializeCreatorAutomationProfile(stored),
  };
}

export async function upsertCreatorAutomationProfileForMember(
  input: CreatorAutomationProfileUpsertRequest,
): Promise<{ member: MemberDocument; profile: CreatorAutomationProfileRecord }> {
  const normalizedEmail = normalizeEmail(input.memberEmail);

  if (!normalizedEmail) {
    throw new Error("memberEmail is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);
  assertContentAutomationAccess(member.email);
  const collection = await getCreatorAutomationProfilesCollection();
  const existing = await readStoredAutomationProfile(member.email);
  const fallback = existing ?? (await buildDefaultAutomationProfile(member));
  const now = new Date();
  const nextProfile: CreatorAutomationProfileDocument = {
    allowedDomains:
      input.allowedDomains !== undefined
        ? normalizeAllowedDomains(input.allowedDomains)
        : fallback.allowedDomains,
    autoPublish: input.autoPublish ?? fallback.autoPublish,
    coverImageMode: input.coverImageMode ?? fallback.coverImageMode,
    createdAt: fallback.createdAt,
    enabled: input.enabled ?? fallback.enabled,
    language: input.language ?? fallback.language,
    maxPostsPerDay: clampInteger(
      input.maxPostsPerDay,
      1,
      24,
      fallback.maxPostsPerDay,
    ),
    memberEmail: member.email,
    minIntervalMinutes: clampInteger(
      input.minIntervalMinutes,
      15,
      7 * 24 * 60,
      fallback.minIntervalMinutes,
    ),
    personaName:
      normalizeOptionalText(input.personaName, PERSONA_NAME_LIMIT) ??
      fallback.personaName,
    personaPrompt:
      normalizeOptionalText(input.personaPrompt, PERSONA_PROMPT_LIMIT) ??
      fallback.personaPrompt,
    publishScoreThreshold: clampInteger(
      input.publishScoreThreshold,
      0,
      100,
      fallback.publishScoreThreshold,
    ),
    sourceModes:
      input.sourceModes !== undefined
        ? normalizeSourceModes(input.sourceModes)
        : fallback.sourceModes,
    topics:
      input.topics !== undefined ? normalizeTopicList(input.topics) : fallback.topics,
    updatedAt: now,
  };

  await collection.updateOne(
    { memberEmail: member.email },
    {
      $set: nextProfile,
    },
    { upsert: true },
  );

  return {
    member,
    profile: serializeCreatorAutomationProfile(nextProfile),
  };
}

export async function getContentAutomationJobsForMember(
  email: string,
): Promise<{
  items: ContentAutomationJobRecord[];
  member: MemberDocument;
  profile: CreatorAutomationProfileRecord;
}> {
  const { member, profile } = await getCreatorAutomationProfileForMember(email);
  const collection = await getContentAutomationJobsCollection();
  const jobs = await collection
    .find({ memberEmail: member.email })
    .sort({ createdAt: -1 })
    .limit(CONTENT_AUTOMATION_RECENT_JOB_LIMIT)
    .toArray();

  return {
    items: jobs.map((job) => serializeContentAutomationJob(job)),
    member,
    profile,
  };
}

export async function runContentAutomationForMember(
  input: ContentAutomationRunRequest,
): Promise<{
  content: ContentPostRecord | null;
  job: ContentAutomationJobRecord;
  member: MemberDocument;
  profile: CreatorAutomationProfileRecord;
  sources: ContentSourceItemRecord[];
}> {
  const normalizedEmail = normalizeEmail(input.memberEmail);

  if (!normalizedEmail) {
    throw new Error("memberEmail is required.");
  }

  const mode = input.mode ?? "discover_and_draft";

  if (mode !== "discover_and_draft") {
    throw new Error("Only discover_and_draft mode is supported in this release.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);
  assertContentAutomationAccess(member.email);
  const storedProfile =
    (await readStoredAutomationProfile(member.email)) ??
    (await buildDefaultAutomationProfile(member));

  if (!storedProfile.enabled) {
    throw new Error("Automation is disabled for this creator.");
  }

  await enforceAutomationCadence(member.email, storedProfile);

  const queuedJob = await createQueuedJob(member.email, mode);

  try {
    await markJobRunning(queuedJob.jobId);
    const discovery = await discoverSourcesForProfile(storedProfile);
    const sourceItems = await upsertSourceItems(
      member.email,
      discovery.discoveryText,
      discovery.sources,
    );
    const availableSourceItems = sourceItems.filter((item) => item.status !== "used");
    const availableSourceUrlSet = new Set(
      availableSourceItems.map((item) => item.url),
    );
    const availableDiscovery = {
      ...discovery,
      sources: discovery.sources.filter((source) =>
        availableSourceUrlSet.has(source.url),
      ),
    };

    if (availableDiscovery.sources.length === 0) {
      throw new Error("No fresh public sources were found for automation.");
    }

    const draft = await generateDraftForProfile(storedProfile, availableDiscovery);
    const selectedSources = availableSourceItems.filter((item) =>
      draft.sourceUrls.includes(item.url),
    );
    const effectiveSources =
      selectedSources.length > 0
        ? selectedSources
        : availableSourceItems.slice(0, CONTENT_AUTOMATION_MAX_SOURCE_COUNT);
    const { coverImageError, coverImageUrl } = await maybeGenerateAutomationCover({
      body: draft.body,
      member,
      profile: storedProfile,
      suggestedCoverPrompt: draft.suggestedCoverPrompt,
      summary: draft.summary,
      title: draft.title,
    });
    const nextStatus =
      storedProfile.autoPublish &&
      draft.score >= storedProfile.publishScoreThreshold
        ? "published"
        : "draft";
    const content = await createContentPostForMember({
      body: draft.body,
      coverImageUrl,
      email: member.email,
      priceType: "free",
      status: nextStatus,
      summary: draft.summary,
      tags: draft.tags,
      title: draft.title,
    });

    const attributionsCollection = await getContentPostSourceAttributionsCollection();
    await attributionsCollection.updateOne(
      { contentId: content.contentId },
      {
        $set: {
          contentId: content.contentId,
          createdAt: new Date(),
          memberEmail: member.email,
          sourceFingerprints: effectiveSources.map((source) => source.fingerprint),
          sourceTitles: effectiveSources.map((source) => source.title),
          sourceUrls: effectiveSources.map((source) => source.url),
        },
      },
      { upsert: true },
    );

    const sourceItemsCollection = await getContentSourceItemsCollection();
    await sourceItemsCollection.updateMany(
      {
        memberEmail: member.email,
        sourceItemId: {
          $in: effectiveSources.map((source) => source.sourceItemId),
        },
      },
      {
        $set: {
          status: "used",
        },
      },
    );

    const completedJob = await completeJob(queuedJob.jobId, {
      body: draft.body,
      outputContentId: content.contentId,
      outputStatus: nextStatus,
      score: draft.score,
      sourceItemIds: effectiveSources.map((source) => source.sourceItemId),
      sourceUrls: effectiveSources.map((source) => source.url),
      suggestedCoverPrompt: draft.suggestedCoverPrompt,
      summary: draft.summary,
      tags: draft.tags,
      title: draft.title,
      topic: draft.topic,
      warning: coverImageError,
    });

    return {
      content,
      job: serializeContentAutomationJob(completedJob),
      member,
      profile: serializeCreatorAutomationProfile(storedProfile),
      sources: effectiveSources.map((source) => serializeContentSourceItem(source)),
    };
  } catch (error) {
    const failedJob = await failJob(
      queuedJob.jobId,
      error instanceof Error ? error.message : "Automation job failed.",
    );

    return {
      content: null,
      job: serializeContentAutomationJob(failedJob),
      member,
      profile: serializeCreatorAutomationProfile(storedProfile),
      sources: [],
    };
  }
}

export async function runContentAutomationForEnabledMembers(
  mode: ContentAutomationJobMode = "discover_and_draft",
) {
  const memberEmails = await getEnabledContentAutomationMemberEmails();
  const items: Array<{
    error: string | null;
    memberEmail: string;
    result: Awaited<ReturnType<typeof runContentAutomationForMember>> | null;
  }> = [];

  for (const memberEmail of memberEmails) {
    try {
      const result = await runContentAutomationForMember({
        memberEmail,
        mode,
      });
      items.push({
        error: null,
        memberEmail,
        result,
      });
    } catch (error) {
      items.push({
        error:
          error instanceof Error ? error.message : "Failed to run content automation.",
        memberEmail,
        result: null,
      });
    }
  }

  const failed = items.filter(
    (item) => item.error || item.result?.job.status === "failed",
  ).length;
  const completed = items.filter(
    (item) => item.result && item.result.job.status !== "failed",
  ).length;

  return {
    items,
    summary: {
      completed,
      failed,
      total: items.length,
    },
  };
}

export function serializeAutomationMember(member: MemberDocument) {
  return serializeMember(member);
}
