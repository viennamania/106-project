import type { ContentPostRecord } from "@/lib/content";
import type { MemberRecord } from "@/lib/member";

export const CONTENT_AUTOMATION_RECENT_JOB_LIMIT = 20;
export const CONTENT_AUTOMATION_MAX_SOURCE_COUNT = 6;
export const CONTENT_AUTOMATION_MAX_TOPIC_COUNT = 12;
export const CONTENT_AUTOMATION_MAX_ALLOWED_DOMAIN_COUNT = 24;

export const contentAutomationSourceModes = [
  "web_search",
  "rss",
  "manual",
] as const;
export const contentAutomationCoverImageModes = [
  "generated",
  "licensed",
  "none",
] as const;
export const contentAutomationJobStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;
export const contentAutomationJobModes = [
  "discover_and_draft",
  "publish",
] as const;

export type ContentAutomationSourceMode =
  (typeof contentAutomationSourceModes)[number];
export type ContentAutomationCoverImageMode =
  (typeof contentAutomationCoverImageModes)[number];
export type ContentAutomationJobStatus =
  (typeof contentAutomationJobStatuses)[number];
export type ContentAutomationJobMode =
  (typeof contentAutomationJobModes)[number];

export type CreatorAutomationProfileDocument = {
  allowedDomains: string[];
  autoPublish: boolean;
  coverImageMode: ContentAutomationCoverImageMode;
  createdAt: Date;
  enabled: boolean;
  language: "ko" | "en";
  maxPostsPerDay: number;
  memberEmail: string;
  minIntervalMinutes: number;
  personaName: string;
  personaPrompt: string;
  publishScoreThreshold: number;
  sourceModes: ContentAutomationSourceMode[];
  topics: string[];
  updatedAt: Date;
};

export type ContentSourceItemDocument = {
  domain: string;
  fetchedAt: Date;
  fingerprint: string;
  imageUrl?: string | null;
  licenseType: "unknown" | "allowed" | "generated";
  memberEmail: string;
  snippet: string;
  sourceItemId: string;
  status: "new" | "used" | "rejected";
  title: string;
  url: string;
};

export type ContentAutomationJobDocument = {
  body?: string | null;
  createdAt: Date;
  error?: string | null;
  finishedAt?: Date | null;
  jobId: string;
  memberEmail: string;
  mode: ContentAutomationJobMode;
  outputContentId?: string | null;
  score?: number | null;
  sourceItemIds: string[];
  sourceUrls: string[];
  startedAt?: Date | null;
  status: ContentAutomationJobStatus;
  suggestedCoverPrompt?: string | null;
  summary?: string | null;
  tags: string[];
  title?: string | null;
  topic?: string | null;
};

export type ContentPostSourceAttributionDocument = {
  contentId: string;
  createdAt: Date;
  memberEmail: string;
  sourceFingerprints: string[];
  sourceTitles: string[];
  sourceUrls: string[];
};

export type CreatorAutomationProfileRecord = {
  allowedDomains: string[];
  autoPublish: boolean;
  coverImageMode: ContentAutomationCoverImageMode;
  enabled: boolean;
  language: "ko" | "en";
  maxPostsPerDay: number;
  memberEmail: string;
  minIntervalMinutes: number;
  personaName: string;
  personaPrompt: string;
  publishScoreThreshold: number;
  sourceModes: ContentAutomationSourceMode[];
  topics: string[];
  updatedAt: string;
};

export type ContentSourceItemRecord = {
  domain: string;
  fetchedAt: string;
  fingerprint: string;
  imageUrl: string | null;
  licenseType: "unknown" | "allowed" | "generated";
  snippet: string;
  sourceItemId: string;
  status: "new" | "used" | "rejected";
  title: string;
  url: string;
};

export type ContentAutomationJobRecord = {
  createdAt: string;
  error: string | null;
  finishedAt: string | null;
  jobId: string;
  memberEmail: string;
  mode: ContentAutomationJobMode;
  outputContentId: string | null;
  score: number | null;
  sourceUrls: string[];
  startedAt: string | null;
  status: ContentAutomationJobStatus;
  suggestedCoverPrompt: string | null;
  summary: string | null;
  tags: string[];
  title: string | null;
  topic: string | null;
};

export type CreatorAutomationProfileResponse = {
  member: MemberRecord;
  profile: CreatorAutomationProfileRecord;
};

export type ContentAutomationJobsResponse = {
  items: ContentAutomationJobRecord[];
  member: MemberRecord;
  profile: CreatorAutomationProfileRecord;
};

export type ContentAutomationRunResponse = {
  content: ContentPostRecord | null;
  job: ContentAutomationJobRecord;
  member: MemberRecord;
  profile: CreatorAutomationProfileRecord;
  sources: ContentSourceItemRecord[];
};

export type CreatorAutomationProfileUpsertRequest = {
  allowedDomains?: string[];
  autoPublish?: boolean;
  coverImageMode?: ContentAutomationCoverImageMode;
  enabled?: boolean;
  language?: "ko" | "en";
  maxPostsPerDay?: number;
  memberEmail: string;
  minIntervalMinutes?: number;
  personaName?: string;
  personaPrompt?: string;
  publishScoreThreshold?: number;
  sourceModes?: ContentAutomationSourceMode[];
  topics?: string[];
};

export type ContentAutomationRunRequest = {
  memberEmail: string;
  mode?: ContentAutomationJobMode;
};

export function serializeCreatorAutomationProfile(
  profile: CreatorAutomationProfileDocument,
): CreatorAutomationProfileRecord {
  return {
    allowedDomains: profile.allowedDomains,
    autoPublish: profile.autoPublish,
    coverImageMode: profile.coverImageMode,
    enabled: profile.enabled,
    language: profile.language,
    maxPostsPerDay: profile.maxPostsPerDay,
    memberEmail: profile.memberEmail,
    minIntervalMinutes: profile.minIntervalMinutes,
    personaName: profile.personaName,
    personaPrompt: profile.personaPrompt,
    publishScoreThreshold: profile.publishScoreThreshold,
    sourceModes: profile.sourceModes,
    topics: profile.topics,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeContentSourceItem(
  item: ContentSourceItemDocument,
): ContentSourceItemRecord {
  return {
    domain: item.domain,
    fetchedAt: item.fetchedAt.toISOString(),
    fingerprint: item.fingerprint,
    imageUrl: item.imageUrl ?? null,
    licenseType: item.licenseType,
    snippet: item.snippet,
    sourceItemId: item.sourceItemId,
    status: item.status,
    title: item.title,
    url: item.url,
  };
}

export function serializeContentAutomationJob(
  job: ContentAutomationJobDocument,
): ContentAutomationJobRecord {
  return {
    createdAt: job.createdAt.toISOString(),
    error: job.error ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    jobId: job.jobId,
    memberEmail: job.memberEmail,
    mode: job.mode,
    outputContentId: job.outputContentId ?? null,
    score: job.score ?? null,
    sourceUrls: job.sourceUrls,
    startedAt: job.startedAt?.toISOString() ?? null,
    status: job.status,
    suggestedCoverPrompt: job.suggestedCoverPrompt ?? null,
    summary: job.summary ?? null,
    tags: job.tags,
    title: job.title ?? null,
    topic: job.topic ?? null,
  };
}
