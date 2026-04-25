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

function getCoverImageUrl(item: ContentFeedItemRecord | null) {
  const coverImageUrl = item?.coverImageUrl?.trim();

  return coverImageUrl || null;
}

function getAccessLabel(item: ContentFeedItemRecord, locale: Locale) {
  const copy = getContentCopy(locale);

  if (item.priceType === "paid") {
    return `${copy.labels.paid} - ${item.priceUsdt ?? "1"} USDT`;
  }

  return copy.labels.free;
}

function renderImagePanel({
  imageUrl,
  label,
  title,
}: {
  imageUrl: string | null;
  label: string;
  title: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: 36,
        display: "flex",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets.
        <img
          alt={title}
          height="430"
          src={imageUrl}
          style={{
            display: "flex",
            height: "100%",
            objectFit: "cover",
            width: "100%",
          }}
          width="520"
        />
      ) : (
        <div
          style={{
            alignItems: "center",
            background:
              "linear-gradient(135deg, #111827 0%, #334155 48%, #f97316 100%)",
            color: "rgba(255,255,255,0.86)",
            display: "flex",
            fontSize: 108,
            fontWeight: 800,
            height: "100%",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {getInitials(title)}
        </div>
      )}
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.78) 100%)",
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          left: 0,
          padding: 30,
          position: "absolute",
          right: 0,
        }}
      >
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
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: "white",
            display: "flex",
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.18,
          }}
        >
          {truncateText(title, 46)}
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
  const imageUrl = getCoverImageUrl(item);

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
          background: "#111827",
          borderRadius: 22,
          display: "flex",
          height: 104,
          overflow: "hidden",
          width: 104,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets.
          <img
            alt={item.title}
            height="104"
            src={imageUrl}
            style={{
              display: "flex",
              height: "100%",
              objectFit: "cover",
              width: "100%",
            }}
            width="104"
          />
        ) : (
          <div
            style={{
              alignItems: "center",
              background: "#f97316",
              color: "white",
              display: "flex",
              fontSize: 34,
              fontWeight: 800,
              height: "100%",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {getInitials(item.title)}
          </div>
        )}
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
  const featuredImageUrl = getCoverImageUrl(featuredItem);
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
              imageUrl: featuredImageUrl,
              label: featuredItem
                ? getAccessLabel(featuredItem, locale)
                : copy.meta.feedTitle,
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
    size,
  );
}
