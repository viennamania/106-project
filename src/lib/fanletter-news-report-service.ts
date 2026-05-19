import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";

import type {
  ContentMaturityRating,
  ContentPostDocument,
  ContentPriceType,
  CreatorProfileDocument,
  FanletterNewsReportDocument,
} from "@/lib/content";
import { normalizeContentLocale } from "@/lib/content";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode, type MemberStatus } from "@/lib/member";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getFanletterNewsReportsCollection,
  getMembersCollection,
} from "@/lib/mongodb";

const DEFAULT_MODEL = "gpt-5.4";
const DEFAULT_TIMEOUT_MS = 45_000;
const FALLBACK_REPORTER_REFERRAL_CODE = "FAN";
const TEXT_LIMIT = 20_000;

type OpenAiResponsesApiResponse = {
  error?: {
    message?: string;
  };
  output?: Array<{
    content?: Array<{
      json?: unknown;
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
};

type FanletterNewsReportPayload = {
  body: string;
  dek: string;
  how: string;
  title: string;
  what: string;
  when: string;
  where: string;
  who: string;
  why: string;
};

type FanletterNewsReportGenerationInput = {
  contentBodyContext: string;
  contentMaturityRating: ContentMaturityRating;
  creatorName: string;
  locale: Locale;
  priceType: ContentPriceType;
  reporterName: string;
  sourcePublishedAt: Date | null;
  sourceSummary: string;
  sourceTitle: string;
};

export type CreateFanletterNewsReportInput = {
  contentId?: string | null;
  locale?: string | null;
  reporterReferralCode?: string | null;
};

export type FanletterNewsReporterProfile = {
  firstReportAt: Date | null;
  joinedAt: Date | null;
  lastConnectedAt: Date | null;
  latestReportAt: Date | null;
  locale: Locale | null;
  referralCode: string;
  reportCount: number;
  status: MemberStatus | null;
};

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.replace(/\s+/g, " ").trim().slice(0, limit) ?? "";
}

function trimMultilineToLength(value: string | null | undefined, limit: number) {
  return (
    value
      ?.replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, limit) ?? ""
  );
}

function getFanletterNewsReportModel() {
  return process.env.OPENAI_FANLETTER_NEWS_MODEL?.trim() || DEFAULT_MODEL;
}

function getFanletterNewsReportTimeoutMs() {
  const parsed = Number.parseInt(
    process.env.OPENAI_FANLETTER_NEWS_TIMEOUT_MS?.trim() ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function getFanletterNewsReportReasoningEffort() {
  const value = process.env.OPENAI_FANLETTER_NEWS_REASONING
    ?.trim()
    .toLowerCase();

  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
    ? value
    : "low";
}

function getContentMaturityRating(
  post: ContentPostDocument,
): ContentMaturityRating {
  return post.contentMaturityRating === "nsfw" ? "nsfw" : "general";
}

function getCoverImageUrl(
  post: ContentPostDocument,
  maturityRating: ContentMaturityRating,
) {
  if (maturityRating === "nsfw") {
    return null;
  }

  return post.coverImageUrl ?? post.contentImageUrls?.[0] ?? null;
}

function getCreatorName(
  post: ContentPostDocument,
  profile: CreatorProfileDocument | null,
) {
  return (
    trimToLength(profile?.characterPersona?.name, 64) ||
    trimToLength(profile?.displayName, 64) ||
    trimToLength(post.authorEmail.split("@")[0], 64) ||
    "FanLetter"
  );
}

function getReporterName(reporterReferralCode: string, locale: Locale) {
  return locale === "ko"
    ? `${reporterReferralCode} 팬 기자`
    : `Fan reporter ${reporterReferralCode}`;
}

function formatSourceDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function createReportSchema() {
  const textField = { type: "string" };

  return {
    type: "object",
    properties: {
      title: textField,
      dek: textField,
      body: textField,
      who: textField,
      when: textField,
      where: textField,
      what: textField,
      why: textField,
      how: textField,
    },
    required: [
      "title",
      "dek",
      "body",
      "who",
      "when",
      "where",
      "what",
      "why",
      "how",
    ],
    additionalProperties: false,
  };
}

function extractResponseTextContent(response: OpenAiResponsesApiResponse) {
  const directOutputText = trimMultilineToLength(response.output_text, TEXT_LIMIT);

  if (directOutputText) {
    return directOutputText;
  }

  const parts: string[] = [];

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        parts.push(content.text.trim());
        continue;
      }

      if (content.json !== undefined) {
        parts.push(JSON.stringify(content.json));
      }
    }
  }

  return trimMultilineToLength(parts.join("\n"), TEXT_LIMIT);
}

function parseOpenAiReportPayload(
  response: OpenAiResponsesApiResponse,
): FanletterNewsReportPayload {
  const outputText = extractResponseTextContent(response);

  if (!outputText) {
    throw new Error("FanLetter news report generation returned an empty payload.");
  }

  return JSON.parse(outputText) as FanletterNewsReportPayload;
}

function normalizeReportPayload(
  payload: Partial<FanletterNewsReportPayload>,
  fallback: FanletterNewsReportPayload,
): FanletterNewsReportPayload {
  return {
    body:
      trimMultilineToLength(payload.body, 1_600) ||
      trimMultilineToLength(fallback.body, 1_600),
    dek: trimToLength(payload.dek, 180) || fallback.dek,
    how: trimToLength(payload.how, 180) || fallback.how,
    title: trimToLength(payload.title, 96) || fallback.title,
    what: trimToLength(payload.what, 180) || fallback.what,
    when: trimToLength(payload.when, 180) || fallback.when,
    where: trimToLength(payload.where, 180) || fallback.where,
    who: trimToLength(payload.who, 180) || fallback.who,
    why: trimToLength(payload.why, 180) || fallback.why,
  };
}

async function requestOpenAiResponse(
  apiKey: string,
  payload: Record<string, unknown>,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    getFanletterNewsReportTimeoutMs(),
  );

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    const json = (await response.json().catch(() => null)) as
      | OpenAiResponsesApiResponse
      | null;

    return { json, response };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI request timed out while generating news report.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function createOpenAiResponse(payload: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const { json, response } = await requestOpenAiResponse(apiKey, payload);

  if (!response.ok) {
    if (
      "reasoning" in payload &&
      json?.error?.message?.toLowerCase().includes("reasoning.effort")
    ) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.reasoning;
      const fallbackResponse = await requestOpenAiResponse(
        apiKey,
        fallbackPayload,
      );

      if (fallbackResponse.response.ok) {
        return fallbackResponse.json ?? {};
      }
    }

    throw new Error(
      json?.error?.message
        ? `OpenAI request failed: ${json.error.message}`
        : `OpenAI request failed with status ${response.status}.`,
    );
  }

  return json ?? {};
}

function createFallbackReportPayload(
  input: FanletterNewsReportGenerationInput,
): FanletterNewsReportPayload {
  const sourceDate = formatSourceDate(input.sourcePublishedAt, input.locale);
  const sourceSummary =
    input.sourceSummary ||
    (input.locale === "ko"
      ? "브이로그 공개 정보가 팬 리포트로 정리되었습니다."
      : "The vlog public information has been summarized as a fan report.");
  const accessLabel =
    input.priceType === "paid"
      ? input.locale === "ko"
        ? "팬 전용 유료 브이로그"
        : "fan-only paid vlog"
      : input.locale === "ko"
        ? "공개 브이로그"
        : "public vlog";
  const maturityNotice =
    input.contentMaturityRating === "nsfw"
      ? input.locale === "ko"
        ? "성인 팬 전용 표시가 적용된 콘텐츠로, 리포트는 공개 가능한 티저 정보만 다룹니다."
        : "This content is marked adult fan-only, so the report uses only public teaser details."
      : "";

  if (input.locale === "ko") {
    return {
      body: [
        `${input.creatorName}의 브이로그 '${input.sourceTitle}'이 FanLetter에서 ${accessLabel}로 소개됐다. ${sourceSummary}`,
        `${input.reporterName}는 이번 장면을 팬들이 다음 반응과 후속 요청을 남길 수 있는 팬 참여형 소식으로 정리했다. ${maturityNotice}`.trim(),
      ].join("\n\n"),
      dek: `${input.creatorName}의 브이로그를 팬 기자 관점에서 육하원칙으로 정리했습니다.`,
      how: "원본 브이로그의 공개 제목, 요약, 티저 정보를 바탕으로 AI가 팬 리포트 형식으로 재구성",
      title: `${input.creatorName}, '${input.sourceTitle}' 팬 리포트 공개`,
      what: `'${input.sourceTitle}' 브이로그가 FanLetter에서 ${accessLabel}로 공유됨`,
      when: sourceDate ?? "FanLetter 공개 이후",
      where: "FanLetter AI 캐릭터 브이로그 채널",
      who: `${input.creatorName}와 FanLetter 팬`,
      why: "팬들이 댓글, 저장, 후속 요청으로 다음 장면 제작에 참여할 수 있도록 하기 위해",
    };
  }

  return {
    body: [
      `${input.creatorName}'s vlog "${input.sourceTitle}" was presented on FanLetter as a ${accessLabel}. ${sourceSummary}`,
      `${input.reporterName} frames the moment as a fan-participation update where viewers can react, save, and request follow-up scenes. ${maturityNotice}`.trim(),
    ].join("\n\n"),
    dek: `A fan-reporter summary of ${input.creatorName}'s vlog using the five Ws and one H.`,
    how: "AI restructured the public title, summary, and teaser details into a fan report format",
    title: `${input.creatorName} shares fan report for "${input.sourceTitle}"`,
    what: `"${input.sourceTitle}" was shared on FanLetter as a ${accessLabel}`,
    when: sourceDate ?? "After publication on FanLetter",
    where: "FanLetter AI character vlog channel",
    who: `${input.creatorName} and FanLetter fans`,
    why: "To help fans participate through comments, saves, and follow-up scene requests",
  };
}

function createOpenAiReportPayload(input: FanletterNewsReportGenerationInput) {
  const language = input.locale === "ko" ? "Korean" : "English";
  const sourceDate = formatSourceDate(input.sourcePublishedAt, input.locale);
  const isRestricted =
    input.priceType === "paid" || input.contentMaturityRating === "nsfw";

  return {
    model: getFanletterNewsReportModel(),
    max_output_tokens: 1_800,
    input: [
      {
        role: "system",
        content: [
          "You write a shareable FanLetter AI fan report from a single AI character vlog.",
          "This must be positioned as an AI fan report, not independent journalism or a verified real-world news article.",
          "Use only the facts supplied by the user. Do not invent dates, locations, identities, purchase numbers, quotes, or events.",
          "The reporter byline is the sharing FanLetter member. Keep the reporter name exactly as provided.",
          "If the content is paid or NSFW, do not reveal hidden scenes, explicit details, or full paid-body information. Use only the supplied public teaser context.",
          "Keep copy suitable for general sharing. Avoid exaggerated sexualized or sensational wording.",
          `Write all user-facing text in ${language}.`,
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          contentMaturityRating: input.contentMaturityRating,
          creatorName: input.creatorName,
          fanletterSurface: "FanLetter",
          paidOrPublic: input.priceType,
          reporterName: input.reporterName,
          restrictedContextOnly: isRestricted,
          sourceBodyContext: input.contentBodyContext,
          sourcePublishedAt: sourceDate,
          sourceSummary: input.sourceSummary,
          sourceTitle: input.sourceTitle,
          task:
            "Create one concise AI fan report with title, dek, body, and who/when/where/what/why/how fields.",
        }),
      },
    ],
    reasoning: {
      effort: getFanletterNewsReportReasoningEffort(),
    },
    text: {
      format: {
        type: "json_schema",
        name: "fanletter_news_report",
        schema: createReportSchema(),
        strict: true,
      },
    },
  };
}

async function generateNewsReportPayload(input: FanletterNewsReportGenerationInput) {
  const fallback = createFallbackReportPayload(input);

  try {
    const response = await createOpenAiResponse(createOpenAiReportPayload(input));
    return {
      generatedBy: "openai" as const,
      payload: normalizeReportPayload(parseOpenAiReportPayload(response), fallback),
    };
  } catch (error) {
    console.error("Failed to generate FanLetter news report with OpenAI.", error);

    return {
      generatedBy: "fallback" as const,
      payload: fallback,
    };
  }
}

function getSourceBodyContext(
  post: ContentPostDocument,
  maturityRating: ContentMaturityRating,
) {
  const publicOnly = post.priceType === "paid" || maturityRating === "nsfw";
  const sourceText = publicOnly
    ? post.previewText || post.summary
    : post.body || post.previewText || post.summary;

  return trimMultilineToLength(sourceText, publicOnly ? 800 : 1_600);
}

export function createFanletterNewsReportShareHref(
  report: Pick<
    FanletterNewsReportDocument,
    "locale" | "reportId" | "reporterReferralCode"
  >,
) {
  return buildPathWithReferral(
    `/${report.locale}/fanletter/news/${report.reportId}`,
    report.reporterReferralCode,
  );
}

export async function getOrCreateFanletterNewsReport({
  contentId,
  locale,
  reporterReferralCode,
}: CreateFanletterNewsReportInput) {
  const normalizedContentId = contentId?.trim() ?? "";
  const normalizedLocale =
    locale && hasLocale(locale) ? normalizeContentLocale(locale) : defaultLocale;
  const normalizedReporterReferralCode =
    normalizeReferralCode(reporterReferralCode) ?? FALLBACK_REPORTER_REFERRAL_CODE;

  if (!normalizedContentId) {
    throw new Error("contentId is required.");
  }

  const reportsCollection = await getFanletterNewsReportsCollection();
  const existing = await reportsCollection.findOne({
    contentId: normalizedContentId,
    locale: normalizedLocale,
    reporterReferralCode: normalizedReporterReferralCode,
  });

  if (existing) {
    return existing;
  }

  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({
    contentId: normalizedContentId,
    status: "published",
  });

  if (!post) {
    throw new Error("Content not found.");
  }

  const profilesCollection = await getCreatorProfilesCollection();
  const profile = await profilesCollection.findOne({ email: post.authorEmail });
  const contentMaturityRating = getContentMaturityRating(post);
  const creatorName = getCreatorName(post, profile);
  const reporterName = getReporterName(
    normalizedReporterReferralCode,
    normalizedLocale,
  );
  const sourcePublishedAt = post.publishedAt ?? post.createdAt ?? null;
  const sourceSummary = trimToLength(post.summary || post.previewText, 220);
  const contentBodyContext = getSourceBodyContext(post, contentMaturityRating);
  const { generatedBy, payload } = await generateNewsReportPayload({
    contentBodyContext,
    contentMaturityRating,
    creatorName,
    locale: normalizedLocale,
    priceType: post.priceType,
    reporterName,
    sourcePublishedAt,
    sourceSummary,
    sourceTitle: post.title,
  });
  const now = new Date();
  const document: FanletterNewsReportDocument = {
    body: payload.body,
    contentId: post.contentId,
    contentMaturityRating,
    coverImageUrl: getCoverImageUrl(post, contentMaturityRating),
    createdAt: now,
    creatorName,
    creatorReferralCode: normalizeReferralCode(
      profile?.referralCode ?? post.authorReferralCode,
    ),
    dek: payload.dek,
    generatedBy,
    how: payload.how,
    locale: normalizedLocale,
    model: generatedBy === "openai" ? getFanletterNewsReportModel() : null,
    priceType: post.priceType,
    reporterName,
    reporterReferralCode: normalizedReporterReferralCode,
    reportId: `news_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    sourceHref: buildPathWithReferral(
      `/${normalizedLocale}/fanletter/content/${post.contentId}`,
      normalizedReporterReferralCode,
    ),
    sourcePublishedAt,
    sourceSummary,
    sourceTitle: trimToLength(post.title, 140),
    status: "published",
    title: payload.title,
    updatedAt: now,
    what: payload.what,
    when: payload.when,
    where: payload.where,
    who: payload.who,
    why: payload.why,
  };

  await reportsCollection.updateOne(
    {
      contentId: document.contentId,
      locale: document.locale,
      reporterReferralCode: document.reporterReferralCode,
    },
    {
      $setOnInsert: document,
    },
    { upsert: true },
  );

  return (
    (await reportsCollection.findOne({
      contentId: document.contentId,
      locale: document.locale,
      reporterReferralCode: document.reporterReferralCode,
    })) ?? document
  );
}

export const getFanletterNewsReportById = cache(async (reportId: string) => {
  const normalizedReportId = reportId.trim();

  if (!normalizedReportId) {
    return null;
  }

  const reportsCollection = await getFanletterNewsReportsCollection();

  return reportsCollection.findOne({
    reportId: normalizedReportId,
    status: "published",
  });
});

export const getLatestFanletterNewsReports = cache(
  async ({
    limit = 24,
    locale,
  }: {
    limit?: number;
    locale: Locale;
  }) => {
    const reportsCollection = await getFanletterNewsReportsCollection();

    return reportsCollection
      .find({
        locale,
        status: "published",
      })
      .sort({ sourcePublishedAt: -1, createdAt: -1 })
      .limit(Math.max(1, Math.min(limit, 48)))
      .toArray();
  },
);

export const getFanletterNewsReporterProfile = cache(
  async ({
    reporterReferralCode,
  }: {
    reporterReferralCode?: string | null;
  }): Promise<FanletterNewsReporterProfile | null> => {
    const normalizedReporterReferralCode =
      normalizeReferralCode(reporterReferralCode);

    if (!normalizedReporterReferralCode) {
      return null;
    }

    const [membersCollection, reportsCollection] = await Promise.all([
      getMembersCollection(),
      getFanletterNewsReportsCollection(),
    ]);
    const reportQuery = {
      reporterReferralCode: normalizedReporterReferralCode,
      status: "published" as const,
    };
    const [member, reportCount, latestReport, firstReport] = await Promise.all([
      membersCollection.findOne(
        { referralCode: normalizedReporterReferralCode },
        {
          projection: {
            createdAt: 1,
            lastConnectedAt: 1,
            locale: 1,
            referralCode: 1,
            registrationCompletedAt: 1,
            status: 1,
          },
        },
      ),
      reportsCollection.countDocuments(reportQuery),
      reportsCollection
        .find(reportQuery, {
          projection: {
            createdAt: 1,
            sourcePublishedAt: 1,
          },
        })
        .sort({ sourcePublishedAt: -1, createdAt: -1 })
        .limit(1)
        .next(),
      reportsCollection
        .find(reportQuery, {
          projection: {
            createdAt: 1,
            sourcePublishedAt: 1,
          },
        })
        .sort({ sourcePublishedAt: 1, createdAt: 1 })
        .limit(1)
        .next(),
    ]);

    return {
      firstReportAt: firstReport?.sourcePublishedAt ?? firstReport?.createdAt ?? null,
      joinedAt: member?.registrationCompletedAt ?? member?.createdAt ?? null,
      lastConnectedAt: member?.lastConnectedAt ?? null,
      latestReportAt:
        latestReport?.sourcePublishedAt ?? latestReport?.createdAt ?? null,
      locale: member?.locale && hasLocale(member.locale) ? member.locale : null,
      referralCode: normalizedReporterReferralCode,
      reportCount,
      status: member?.status ?? null,
    };
  },
);

export const getRelatedFanletterNewsReports = cache(
  async ({
    creatorReferralCode,
    excludeContentId,
    excludeReportId,
    limit = 4,
    locale,
  }: {
    creatorReferralCode?: string | null;
    excludeContentId?: string | null;
    excludeReportId: string;
    limit?: number;
    locale: Locale;
  }) => {
    const normalizedCreatorReferralCode =
      normalizeReferralCode(creatorReferralCode);
    const normalizedReportId = excludeReportId.trim();
    const normalizedContentId = excludeContentId?.trim();

    if (!normalizedCreatorReferralCode || !normalizedReportId) {
      return [];
    }

    const reportsCollection = await getFanletterNewsReportsCollection();
    const query = {
      creatorReferralCode: normalizedCreatorReferralCode,
      locale,
      reportId: { $ne: normalizedReportId },
      status: "published" as const,
      ...(normalizedContentId
        ? { contentId: { $ne: normalizedContentId } }
        : {}),
    };

    return reportsCollection
      .find(query)
      .sort({ sourcePublishedAt: -1, createdAt: -1 })
      .limit(Math.max(1, Math.min(limit, 8)))
      .toArray();
  },
);
