import { ImageResponse } from "next/og";

import type { ContentFeedItemRecord } from "@/lib/content";
import { getContentCopy } from "@/lib/content-copy";
import { getPublicNetworkFeedForReferralCode } from "@/lib/content-service";
import {
  defaultLocale,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

export const contentType = "image/png";
export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};

const PREVIEW_ITEM_LIMIT = 3;
const COVER_THEMES = [
  {
    accent: "#f97316",
    dark: "#111827",
    from: "#fff7ed",
    soft: "#fed7aa",
    to: "#0f172a",
  },
  {
    accent: "#0ea5e9",
    dark: "#082f49",
    from: "#eff6ff",
    soft: "#bae6fd",
    to: "#0f172a",
  },
  {
    accent: "#10b981",
    dark: "#064e3b",
    from: "#ecfdf5",
    soft: "#a7f3d0",
    to: "#0f172a",
  },
  {
    accent: "#e11d48",
    dark: "#4c0519",
    from: "#fff1f2",
    soft: "#fecdd3",
    to: "#0f172a",
  },
] as const;

function truncateText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  if (!normalized) {
    return "";
  }

  const characters = Array.from(normalized);

  if (characters.length <= maxLength) {
    return normalized;
  }

  return `${characters.slice(0, Math.max(0, maxLength - 3)).join("")}...`;
}

function readLocale(value: string | null) {
  return (value && hasLocale(value) ? value : defaultLocale) as Locale;
}

function getAuthorName(item: ContentFeedItemRecord | null) {
  return item?.authorProfile?.displayName?.trim() || "1066friend+ creator";
}

function getInitials(value: string) {
  const characters = Array.from(value.replace(/\s+/g, "").trim());

  return characters.slice(0, 2).join("").toUpperCase() || "10";
}

function getCoverTheme(seed: string | null | undefined) {
  const normalized = seed?.trim() || "1066friend";
  const index = Array.from(normalized).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return COVER_THEMES[index % COVER_THEMES.length];
}

function getAccessLabel(item: ContentFeedItemRecord, locale: Locale) {
  const copy = getContentCopy(locale);

  if (item.priceType === "paid") {
    return `${copy.labels.paid} - ${item.priceUsdt ?? "1"} USDT`;
  }

  return copy.labels.free;
}

function renderImagePanel({
  label,
  seed,
  summary,
  title,
}: {
  label: string;
  seed: string;
  summary: string;
  title: string;
}) {
  const theme = getCoverTheme(seed);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${theme.dark} 0%, ${theme.to} 58%, ${theme.accent} 100%)`,
        borderRadius: 36,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: 30,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.30), transparent 30%), radial-gradient(circle at bottom left, rgba(255,255,255,0.16), transparent 34%)",
          inset: 0,
          position: "absolute",
        }}
      />
      <div
        style={{
          color: "rgba(255,255,255,0.10)",
          display: "flex",
          fontSize: 128,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          position: "absolute",
          right: -12,
          top: 72,
        }}
      >
        FEED
      </div>
      <div
        style={{
          alignItems: "center",
          alignSelf: "flex-start",
          background: "rgba(255,255,255,0.94)",
          borderRadius: 999,
          color: "#111827",
          display: "flex",
          fontSize: 19,
          fontWeight: 800,
          padding: "10px 16px",
          position: "relative",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          position: "relative",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.20)",
            borderRadius: 26,
            color: "white",
            display: "flex",
            fontSize: 42,
            fontWeight: 900,
            height: 96,
            justifyContent: "center",
            width: 96,
          }}
        >
          {getInitials(title)}
        </div>
        <div
          style={{
            color: "white",
            display: "flex",
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.12,
          }}
        >
          {truncateText(title, 52)}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.78)",
            display: "flex",
            fontSize: 23,
            fontWeight: 600,
            lineHeight: 1.34,
          }}
        >
          {truncateText(summary, 92)}
        </div>
      </div>
    </div>
  );
}

function renderPreviewCard({
  item,
  locale,
}: {
  item: ContentFeedItemRecord;
  locale: Locale;
}) {
  const authorName = getAuthorName(item);
  const theme = getCoverTheme(item.contentId);

  return (
    <div
      key={item.contentId}
      style={{
        alignItems: "center",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 28,
        boxShadow: "0 16px 34px rgba(15,23,42,0.08)",
        display: "flex",
        gap: 18,
        height: 132,
        padding: 14,
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: `linear-gradient(135deg, ${theme.dark} 0%, ${theme.accent} 100%)`,
          borderRadius: 22,
          color: "white",
          display: "flex",
          fontSize: 32,
          fontWeight: 900,
          height: 104,
          justifyContent: "center",
          width: 104,
        }}
      >
        {getInitials(item.title)}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: 8,
          minWidth: 0,
        }}
      >
        <div
          style={{
            color: "#111827",
            display: "flex",
            fontSize: 23,
            fontWeight: 800,
            lineHeight: 1.16,
          }}
        >
          {truncateText(item.title, 38)}
        </div>
        <div
          style={{
            color: "#64748b",
            display: "flex",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {truncateText(authorName, 28)}
        </div>
        <div
          style={{
            alignItems: "center",
            color: "#f97316",
            display: "flex",
            fontSize: 17,
            fontWeight: 800,
          }}
        >
          {getAccessLabel(item, locale)}
        </div>
      </div>
    </div>
  );
}

function renderEmptyPreviewCard(index: number) {
  return (
    <div
      key={`empty-${index}`}
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 28,
        boxShadow: "0 16px 34px rgba(15,23,42,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: 132,
        justifyContent: "center",
        padding: 22,
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#e5e7eb",
          borderRadius: 999,
          display: "flex",
          height: 18,
          width: `${72 - index * 12}%`,
        }}
      />
      <div
        style={{
          background: "#f1f5f9",
          borderRadius: 999,
          display: "flex",
          height: 18,
          width: `${54 - index * 8}%`,
        }}
      />
    </div>
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = readLocale(url.searchParams.get("lang"));
  const referralCode = normalizeReferralCode(url.searchParams.get("ref"));
  const copy = getContentCopy(locale);
  let items: ContentFeedItemRecord[] = [];

  if (referralCode) {
    try {
      const feed = await getPublicNetworkFeedForReferralCode(referralCode, locale);
      items = feed.items.slice(0, PREVIEW_ITEM_LIMIT);
    } catch {
      items = [];
    }
  }

  const featuredItem = items[0] ?? null;
  const secondaryItems = items.slice(1, PREVIEW_ITEM_LIMIT);
  const featuredTitle = featuredItem?.title ?? copy.meta.feedTitle;
  const featuredSummary =
    featuredItem?.summary?.trim() || copy.meta.feedDescription;
  const featuredAuthor = featuredItem
    ? getAuthorName(featuredItem)
    : locale === "ko"
      ? "공개 네트워크 크리에이터"
      : "public network creators";
  const previewCards = [
    ...secondaryItems.map((item) => renderPreviewCard({ item, locale })),
    ...Array.from(
      { length: Math.max(0, 2 - secondaryItems.length) },
      (_, index) => renderEmptyPreviewCard(index),
    ),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          background: "#f8fafc",
          color: "#0f172a",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          overflow: "hidden",
          padding: 42,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 42,
            bottom: 24,
            boxShadow: "0 28px 80px rgba(15,23,42,0.10)",
            display: "flex",
            left: 24,
            position: "absolute",
            right: 24,
            top: 24,
          }}
        />

        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 16,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#0f172a",
                borderRadius: 18,
                color: "white",
                display: "flex",
                fontSize: 24,
                fontWeight: 900,
                height: 52,
                justifyContent: "center",
                width: 72,
              }}
            >
              1066
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  color: "#0f172a",
                  display: "flex",
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                1066friend+
              </div>
              <div
                style={{
                  color: "#64748b",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Network Feed
              </div>
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 999,
              color: "#9a3412",
              display: "flex",
              fontSize: 20,
              fontWeight: 900,
              padding: "12px 18px",
            }}
          >
            {items.length > 0
              ? locale === "ko"
                ? "대표 콘텐츠 미리보기"
                : "Featured content preview"
              : locale === "ko"
                ? "공개 피드 미리보기"
                : "Public feed preview"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 34,
            marginTop: 30,
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              height: 430,
              width: 520,
            }}
          >
            {renderImagePanel({
              label: featuredItem
                ? getAccessLabel(featuredItem, locale)
                : copy.meta.feedTitle,
              seed: featuredItem?.contentId ?? referralCode ?? "1066friend",
              summary: featuredSummary,
              title: featuredTitle,
            })}
          </div>

          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  color: "#f97316",
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                @{truncateText(featuredAuthor, 34)}
              </div>
              <div
                style={{
                  color: "#0f172a",
                  display: "flex",
                  fontSize: 48,
                  fontWeight: 900,
                  lineHeight: 1.07,
                }}
              >
                {truncateText(featuredTitle, 62)}
              </div>
              <div
                style={{
                  color: "#475569",
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 600,
                  lineHeight: 1.38,
                }}
              >
                {truncateText(featuredSummary, 126)}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {previewCards}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      },
    },
  );
}
