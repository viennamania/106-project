import "server-only";

import { randomUUID } from "node:crypto";

import type { Filter } from "mongodb";

import { hasLocale, type Locale } from "@/lib/i18n";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import { getFanletterNewsPlatformInquiriesCollection } from "@/lib/mongodb";

export const fanletterNewsPlatformInquiryTypes = [
  "investment",
  "partnership",
  "media",
  "other",
] as const;

export type FanletterNewsPlatformInquiryType =
  (typeof fanletterNewsPlatformInquiryTypes)[number];

export type FanletterNewsPlatformInquiryStatus =
  | "new"
  | "contacted"
  | "closed"
  | "spam";

export type FanletterNewsPlatformInquiryDocument = {
  createdAt: Date;
  email: string;
  inquiryId: string;
  inquiryType: FanletterNewsPlatformInquiryType;
  locale: Locale;
  message: string;
  name: string;
  organization: string | null;
  referralCode: string | null;
  requesterFingerprint: string | null;
  sourcePath: string | null;
  sourceUrl: string | null;
  status: FanletterNewsPlatformInquiryStatus;
  updatedAt: Date;
  userAgent: string | null;
};

export type FanletterNewsPlatformInquiryRecord = {
  createdAt: string;
  inquiryId: string;
  status: FanletterNewsPlatformInquiryStatus;
};

const INQUIRY_NAME_LIMIT = 80;
const INQUIRY_ORGANIZATION_LIMIT = 120;
const INQUIRY_MESSAGE_LIMIT = 1200;
const INQUIRY_SOURCE_LIMIT = 520;
const INQUIRY_USER_AGENT_LIMIT = 180;
const INQUIRY_RATE_LIMIT_COUNT = 5;
const INQUIRY_RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const INQUIRY_DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const INQUIRY_BLOCKED_PATTERNS = [
  /바카라|카지노|도박|토토|대출|성인광고|텔레그램|오픈채팅|카톡/i,
  /\b(casino|betting|telegram|whatsapp|loan|spam)\b/i,
];

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function trimSingleLine(value: string | null | undefined, limit: number) {
  const normalized = collapseWhitespace(value ?? "");

  return normalized ? normalized.slice(0, limit) : null;
}

function trimMessage(value: string | null | undefined) {
  const normalized = (value ?? "").trim().replace(/[ \t]+/g, " ");

  return normalized ? normalized.slice(0, INQUIRY_MESSAGE_LIMIT) : null;
}

function normalizeInquiryType(
  value: string | null | undefined,
): FanletterNewsPlatformInquiryType {
  return fanletterNewsPlatformInquiryTypes.includes(
    value as FanletterNewsPlatformInquiryType,
  )
    ? (value as FanletterNewsPlatformInquiryType)
    : "investment";
}

function normalizeLocale(value: string | null | undefined): Locale {
  return value && hasLocale(value) ? value : "ko";
}

function serializePlatformInquiry(
  inquiry: FanletterNewsPlatformInquiryDocument,
): FanletterNewsPlatformInquiryRecord {
  return {
    createdAt: inquiry.createdAt.toISOString(),
    inquiryId: inquiry.inquiryId,
    status: inquiry.status,
  };
}

function assertMessageAllowed(message: string) {
  if (INQUIRY_BLOCKED_PATTERNS.some((pattern) => pattern.test(message))) {
    throw new Error("Inquiry contains blocked content.");
  }
}

function buildRequesterFilter(
  inquiry: Pick<
    FanletterNewsPlatformInquiryDocument,
    "email" | "requesterFingerprint"
  >,
): Filter<FanletterNewsPlatformInquiryDocument> {
  if (inquiry.requesterFingerprint) {
    return {
      $or: [
        { email: inquiry.email },
        { requesterFingerprint: inquiry.requesterFingerprint },
      ],
    };
  }

  return { email: inquiry.email };
}

async function assertPlatformInquirySubmissionAllowed({
  inquiry,
  now,
}: {
  inquiry: FanletterNewsPlatformInquiryDocument;
  now: Date;
}) {
  assertMessageAllowed(inquiry.message);

  const collection = await getFanletterNewsPlatformInquiriesCollection();
  const requesterFilter = buildRequesterFilter(inquiry);
  const duplicateSince = new Date(
    now.getTime() - INQUIRY_DUPLICATE_WINDOW_MS,
  );
  const duplicateInquiry = await collection.findOne({
    email: inquiry.email,
    message: inquiry.message,
    createdAt: { $gte: duplicateSince },
  });

  if (duplicateInquiry) {
    throw new Error("Duplicate inquiry.");
  }

  const rateLimitSince = new Date(
    now.getTime() - INQUIRY_RATE_LIMIT_WINDOW_MS,
  );
  const recentInquiryCount = await collection.countDocuments({
    ...requesterFilter,
    createdAt: { $gte: rateLimitSince },
  });

  if (recentInquiryCount >= INQUIRY_RATE_LIMIT_COUNT) {
    throw new Error("Too many inquiries. Please try again later.");
  }
}

async function notifyPlatformInquiry(
  inquiry: FanletterNewsPlatformInquiryDocument,
) {
  const webhookUrl = process.env.NEWS_PLATFORM_INQUIRY_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return;
  }

  const typeLabelByLocale: Record<
    Locale,
    Record<FanletterNewsPlatformInquiryType, string>
  > = {
    en: {
      investment: "Investment review",
      media: "Media",
      other: "Other",
      partnership: "Strategic partnership",
    },
    id: {
      investment: "Investment review",
      media: "Media",
      other: "Other",
      partnership: "Strategic partnership",
    },
    ja: {
      investment: "Investment review",
      media: "Media",
      other: "Other",
      partnership: "Strategic partnership",
    },
    ko: {
      investment: "투자 검토",
      media: "미디어/취재",
      other: "기타",
      partnership: "전략적 제휴",
    },
    vi: {
      investment: "Investment review",
      media: "Media",
      other: "Other",
      partnership: "Strategic partnership",
    },
    zh: {
      investment: "Investment review",
      media: "Media",
      other: "Other",
      partnership: "Strategic partnership",
    },
  };
  const typeLabel =
    typeLabelByLocale[inquiry.locale]?.[inquiry.inquiryType] ??
    inquiry.inquiryType;
  const summaryLines = [
    `유형: ${typeLabel}`,
    `이름: ${inquiry.name}`,
    `이메일: ${inquiry.email}`,
    inquiry.organization ? `회사/소속: ${inquiry.organization}` : null,
    inquiry.referralCode ? `ref: ${inquiry.referralCode}` : null,
    inquiry.sourceUrl ? `페이지: ${inquiry.sourceUrl}` : null,
    `내용: ${inquiry.message.slice(0, 240)}`,
  ].filter(Boolean);
  const content = [
    `[AIAVpark] 투자자/제휴 문의가 접수되었습니다.`,
    ...summaryLines,
  ].join("\n");

  await fetch(webhookUrl, {
    body: JSON.stringify({
      content,
      embeds: [
        {
          color: 4518510,
          description: inquiry.message.slice(0, 1200),
          fields: [
            { inline: true, name: "Type", value: typeLabel },
            { inline: true, name: "Name", value: inquiry.name },
            { inline: true, name: "Email", value: inquiry.email },
            {
              inline: true,
              name: "Organization",
              value: inquiry.organization ?? "-",
            },
            {
              inline: true,
              name: "Referral",
              value: inquiry.referralCode ?? "-",
            },
            {
              inline: false,
              name: "Source",
              value: inquiry.sourceUrl ?? inquiry.sourcePath ?? "-",
            },
          ],
          title: "AIAVpark platform inquiry",
          timestamp: inquiry.createdAt.toISOString(),
        },
      ],
      inquiry: {
        createdAt: inquiry.createdAt.toISOString(),
        email: inquiry.email,
        inquiryId: inquiry.inquiryId,
        inquiryType: inquiry.inquiryType,
        locale: inquiry.locale,
        name: inquiry.name,
        organization: inquiry.organization,
        referralCode: inquiry.referralCode,
        sourcePath: inquiry.sourcePath,
        sourceUrl: inquiry.sourceUrl,
      },
      text: content,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }).catch((error: unknown) => {
    console.warn("[platform-inquiry] webhook notification failed", {
      inquiryId: inquiry.inquiryId,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}

export async function createFanletterNewsPlatformInquiry(input: {
  email?: string | null;
  inquiryType?: string | null;
  locale?: string | null;
  message?: string | null;
  name?: string | null;
  organization?: string | null;
  referralCode?: string | null;
  requesterFingerprint?: string | null;
  sourcePath?: string | null;
  sourceUrl?: string | null;
  userAgent?: string | null;
}) {
  const name = trimSingleLine(input.name, INQUIRY_NAME_LIMIT);
  const email = normalizeEmail(input.email ?? "");
  const message = trimMessage(input.message);

  if (!name) {
    throw new Error("Inquiry name is required.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Valid inquiry email is required.");
  }

  if (!message || message.length < 10) {
    throw new Error("Inquiry message is required.");
  }

  const now = new Date();
  const inquiry: FanletterNewsPlatformInquiryDocument = {
    createdAt: now,
    email,
    inquiryId: randomUUID(),
    inquiryType: normalizeInquiryType(input.inquiryType),
    locale: normalizeLocale(input.locale),
    message,
    name,
    organization: trimSingleLine(
      input.organization,
      INQUIRY_ORGANIZATION_LIMIT,
    ),
    referralCode: normalizeReferralCode(input.referralCode),
    requesterFingerprint: trimSingleLine(input.requesterFingerprint, 80),
    sourcePath: trimSingleLine(input.sourcePath, INQUIRY_SOURCE_LIMIT),
    sourceUrl: trimSingleLine(input.sourceUrl, INQUIRY_SOURCE_LIMIT),
    status: "new",
    updatedAt: now,
    userAgent: trimSingleLine(input.userAgent, INQUIRY_USER_AGENT_LIMIT),
  };
  const collection = await getFanletterNewsPlatformInquiriesCollection();

  await assertPlatformInquirySubmissionAllowed({ inquiry, now });
  await collection.insertOne(inquiry);
  await notifyPlatformInquiry(inquiry);

  return serializePlatformInquiry(inquiry);
}
