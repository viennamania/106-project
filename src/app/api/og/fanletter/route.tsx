import { ImageResponse } from "next/og";

import {
  FANLETTER_OG_IMAGE_SIZE,
  isFanletterOgVariant,
  type FanletterOgVariant,
} from "@/lib/fanletter-og";
import {
  getFanletterCreatorPageData,
  type FanletterCreatorPageData,
} from "@/lib/fanletter-content-service";
import { getFanletterLandingData } from "@/lib/fanletter-landing-service";
import {
  defaultLocale,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

export const contentType = "image/png";
export const runtime = "nodejs";
export const size = FANLETTER_OG_IMAGE_SIZE;

type FanletterOgCopy = {
  badge: string;
  description: string;
  footer: string;
  metrics: Array<{ label: string; value: string }>;
  title: string;
  variantLabels: Record<FanletterOgVariant, string>;
};

const copyByLocale: Record<"en" | "ko", FanletterOgCopy> = {
  en: {
    badge: "Creator AI monetisation",
    description:
      "Persona, AI images, AI videos, fan-only feeds, and sales flows in one mobile-first creator home.",
    footer: "Mobile first · AI content · Fan sales",
    metrics: [
      { label: "AI content flow", value: "05" },
      { label: "Creator studio", value: "01" },
      { label: "Mobile first", value: "24/7" },
    ],
    title: "FanLetter Creator AI",
    variantLabels: {
      creator: "Creator channel",
      feed: "Public AI feed",
      home: "FanLetter",
      start: "Start creating",
    },
  },
  ko: {
    badge: "AI 캐릭터 브이로그 플랫폼",
    description:
      "고정 AI 캐릭터, 공개 브이로그, 팬 전용 피드, 판매 흐름을 하나의 모바일 홈으로 연결합니다.",
    footer: "모바일 중심 · AI 콘텐츠 · 팬 판매",
    metrics: [
      { label: "AI 콘텐츠 흐름", value: "05" },
      { label: "크리에이터 스튜디오", value: "01" },
      { label: "모바일 중심", value: "24/7" },
    ],
    title: "FanLetter AI 캐릭터 브이로그",
    variantLabels: {
      creator: "크리에이터 채널",
      feed: "공개 AI 피드",
      home: "FanLetter",
      start: "콘텐츠 시작",
    },
  },
};

function truncateText(value: string, maxLength: number) {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());

  if (characters.length <= maxLength) {
    return characters.join("");
  }

  return `${characters.slice(0, Math.max(0, maxLength - 3)).join("")}...`;
}

function readLocale(value: string | null) {
  return (value && hasLocale(value) ? value : defaultLocale) as Locale;
}

function getLocaleCopy(locale: Locale) {
  return locale === "ko" ? copyByLocale.ko : copyByLocale.en;
}

function getRenderableImageUrl(
  value: string | null | undefined,
  origin?: string,
) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, origin);

    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function stripFanletterTitleSuffix(value: string) {
  return value.replace(/\s*\|\s*FanLetter\s*$/i, "").trim();
}

function getCreatorName(data: FanletterCreatorPageData | null) {
  return data?.profile.character?.name ?? data?.profile.displayName ?? null;
}

function getCreatorLatestTitle(data: FanletterCreatorPageData) {
  return data.profile.character?.latestTitle ?? data.items[0]?.title ?? null;
}

function getLocaleSafeTitle(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  if (locale === "ko" && !/[가-힣]/.test(value)) {
    return null;
  }

  return value;
}

function formatMetric(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getCreatorOgTitle({
  creatorName,
  locale,
  requestedTitle,
}: {
  creatorName: string;
  locale: Locale;
  requestedTitle: string | null;
}) {
  const normalizedTitle = stripFanletterTitleSuffix(requestedTitle ?? "");

  if (normalizedTitle && normalizedTitle !== creatorName) {
    return normalizedTitle;
  }

  return locale === "ko"
    ? `${creatorName} AI 브이로그 채널`
    : `${creatorName} AI vlog channel`;
}

function getCreatorOgDescription({
  data,
  locale,
  requestedDescription,
}: {
  data: FanletterCreatorPageData;
  locale: Locale;
  requestedDescription: string | null;
}) {
  const hasShareSignal = locale === "ko"
    ? requestedDescription?.includes("공개 브이로그")
    : requestedDescription?.toLowerCase().includes("public vlog");

  if (requestedDescription && hasShareSignal) {
    return requestedDescription;
  }

  const publicCount = formatMetric(data.publicContentCount, locale);
  const fanOnlyCount = formatMetric(data.fanOnlyContentCount, locale);
  const level = data.profile.character?.growth.level ?? 1;
  const latestTitle = getLocaleSafeTitle(getCreatorLatestTitle(data), locale);

  if (locale === "ko") {
    return latestTitle
      ? `공개 브이로그 ${publicCount}개, 팬 전용 ${fanOnlyCount}개, Lv.${level} 캐릭터 채널입니다. 대표 브이로그: ${latestTitle}.`
      : `공개 브이로그 ${publicCount}개와 팬 전용 ${fanOnlyCount}개를 볼 수 있는 Lv.${level} AI 캐릭터 채널입니다.`;
  }

  return latestTitle
    ? `${publicCount} public vlogs, ${fanOnlyCount} fan-only posts, and a Lv.${level} AI character channel. Featured vlog: ${latestTitle}.`
    : `A Lv.${level} AI character channel with ${publicCount} public vlogs and ${fanOnlyCount} fan-only posts.`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = readLocale(url.searchParams.get("lang"));
  const variantInput = url.searchParams.get("variant");
  const variant = isFanletterOgVariant(variantInput) ? variantInput : "home";
  const copy = getLocaleCopy(locale);
  const referralCode = normalizeReferralCode(url.searchParams.get("ref") ?? "");
  const creatorData =
    variant === "creator" && referralCode
      ? await getFanletterCreatorPageData(locale, referralCode).catch(() => null)
      : null;
  const landingData =
    !creatorData && (variant === "home" || variant === "feed")
      ? await getFanletterLandingData(locale).catch(() => null)
      : null;
  const homeFeaturedVideo =
    landingData?.featuredVideos[0] ?? landingData?.featuredPaidVideos[0] ?? null;
  const creatorCoverImageUrl = getRenderableImageUrl(
    creatorData?.items[0]?.coverImageUrl,
    url.origin,
  );
  const creatorAvatarImageUrl = getRenderableImageUrl(
    creatorData?.profile.character?.avatarImageSet[0]?.url ??
      creatorData?.profile.avatarImageUrl,
    url.origin,
  );
  const creatorVisualUrl = creatorCoverImageUrl ?? creatorAvatarImageUrl;
  const homeVisualUrl = getRenderableImageUrl(
    homeFeaturedVideo?.coverImageUrl ?? homeFeaturedVideo?.authorAvatarImageUrl,
    url.origin,
  );
  const visualUrl = creatorVisualUrl ?? homeVisualUrl;
  const shouldBlurVisual =
    creatorData?.items[0]?.priceType === "paid" ||
    (!creatorData && homeFeaturedVideo?.priceLabel === "paid");
  const creatorName = getCreatorName(creatorData);
  const visualLabel = creatorData
    ? creatorCoverImageUrl
      ? locale === "ko"
        ? "대표 브이로그"
        : "Featured vlog"
      : locale === "ko"
        ? "대표 페르소나"
        : "Character identity"
    : homeFeaturedVideo?.priceLabel === "paid"
      ? locale === "ko"
        ? "팬 전용 브이로그"
        : "Fan-only vlog"
      : locale === "ko"
        ? "대표 공개 브이로그"
        : "Featured public vlog";
  const visualName = creatorData
    ? creatorName
    : homeFeaturedVideo?.authorName ?? null;
  const title = truncateText(
    creatorData && creatorName
      ? getCreatorOgTitle({
          creatorName,
          locale,
          requestedTitle: url.searchParams.get("title"),
        })
      : url.searchParams.get("title") || copy.title,
    creatorData ? 54 : 62,
  );
  const description = truncateText(
    creatorData
      ? getCreatorOgDescription({
          data: creatorData,
          locale,
          requestedDescription: url.searchParams.get("description"),
        })
      : url.searchParams.get("description") || copy.description,
    creatorData ? 112 : 122,
  );
  const variantLabel = copy.variantLabels[variant];
  const badge = creatorData
    ? locale === "ko"
      ? "AI 캐릭터 채널"
      : "AI character channel"
    : copy.badge;
  const footer = creatorData
    ? locale === "ko"
      ? "팔로우 · 팬 요청 · 팬 전용 브이로그"
      : "Follow · Fan requests · Fan-only vlogs"
    : copy.footer;
  const latestTitle = creatorData
    ? getLocaleSafeTitle(getCreatorLatestTitle(creatorData), locale)
    : getLocaleSafeTitle(homeFeaturedVideo?.title ?? null, locale);
  const metrics = creatorData
    ? [
        {
          label: locale === "ko" ? "공개 브이로그" : "Public vlogs",
          value: formatMetric(creatorData.publicContentCount, locale),
        },
        {
          label: locale === "ko" ? "팬 전용" : "Fan-only",
          value: formatMetric(creatorData.fanOnlyContentCount, locale),
        },
        {
          label: locale === "ko" ? "캐릭터 레벨" : "Character level",
          value: creatorData.profile.character
            ? `Lv.${creatorData.profile.character.growth.level}`
            : "Lv.1",
        },
      ]
    : landingData
      ? [
          {
            label: locale === "ko" ? "공개 브이로그" : "Public vlogs",
            value: formatMetric(landingData.liveStats.publicVideoCount, locale),
          },
          {
            label: locale === "ko" ? "활성 캐릭터" : "Active characters",
            value: formatMetric(landingData.liveStats.activeCreatorCount, locale),
          },
          {
            label: locale === "ko" ? "확정 판매" : "Confirmed sales",
            value: formatMetric(landingData.liveStats.confirmedSalesCount, locale),
          },
        ]
      : copy.metrics;
  const categoryLabels = creatorData
    ? locale === "ko"
      ? ["브이로그", "팬 요청", "팬 전용"]
      : ["Vlog", "Requests", "Fan-only"]
    : locale === "ko"
      ? ["캐릭터", "숏폼", "팬 전용"]
      : ["Persona", "Vlog", "Fan-only"];

  return new ImageResponse(
    (
      <div
        style={{
          background: "#030504",
          color: "white",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          overflow: "hidden",
          padding: 44,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at 16% 14%, rgba(68,242,110,0.28), transparent 28%), radial-gradient(circle at 86% 80%, rgba(68,242,110,0.16), transparent 34%), linear-gradient(135deg, #06120c 0%, #030504 50%, #112417 100%)",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 44,
            inset: 24,
            position: "absolute",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 44,
            height: "100%",
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
              ...(visualUrl ? { maxWidth: 700 } : {}),
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    background: "#44f26e",
                    borderRadius: 16,
                    color: "#030504",
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 900,
                    height: 54,
                    justifyContent: "center",
                    width: 54,
                  }}
                >
                  F
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 900 }}>
                    FanLetter
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.58)",
                      display: "flex",
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    {locale === "ko" ? "AI CHARACTER VLOG" : "CREATOR AI"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  color: "#44f26e",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 800,
                  padding: "12px 18px",
                }}
              >
                {variantLabel}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                maxWidth: 720,
              }}
            >
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(68,242,110,0.12)",
                  border: "1px solid rgba(68,242,110,0.34)",
                  borderRadius: 999,
                  color: "#44f26e",
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  padding: "12px 18px",
                  textTransform: "uppercase",
                }}
              >
                {badge}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 72,
                  fontWeight: 900,
                  letterSpacing: 0,
                  lineHeight: 0.98,
                  whiteSpace: "pre-wrap",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.74)",
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 600,
                  lineHeight: 1.34,
                  whiteSpace: "pre-wrap",
                }}
              >
                {description}
              </div>
            </div>

            <div
              style={{
                alignItems: "center",
                color: "rgba(255,255,255,0.62)",
                display: "flex",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {footer}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              width: visualUrl ? 390 : 350,
            }}
          >
            {visualUrl ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 38,
                  boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
                  display: "flex",
                  height: 480,
                  overflow: "hidden",
                  position: "relative",
                  width: "100%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
                <img
                  alt=""
                  height="480"
                  src={visualUrl}
                  style={{
                    display: "flex",
                    filter: shouldBlurVisual
                      ? "blur(10px) brightness(0.72) saturate(0.88)"
                      : "none",
                    height: "100%",
                    objectFit: "cover",
                    transform: shouldBlurVisual ? "scale(1.04)" : "none",
                    width: "100%",
                  }}
                  width="390"
                />
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(3,5,4,0.02) 0%, rgba(3,5,4,0.08) 34%, rgba(3,5,4,0.86) 100%)",
                    inset: 0,
                    position: "absolute",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    left: 20,
                    position: "absolute",
                    right: 20,
                    top: 20,
                  }}
                >
                  <div
                    style={{
                      alignSelf: "flex-start",
                      background: "#44f26e",
                      borderRadius: 999,
                      color: "#07100b",
                      display: "flex",
                      fontSize: 16,
                      fontWeight: 900,
                      padding: "10px 14px",
                    }}
                  >
                    {variantLabel}
                  </div>
                </div>
                <div
                  style={{
                    bottom: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    left: 20,
                    position: "absolute",
                    right: 20,
                  }}
                >
                  <div
                    style={{
                      color: "white",
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        color: "#44f26e",
                        display: "flex",
                        fontSize: 17,
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {visualLabel}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 34,
                        fontWeight: 900,
                        lineHeight: 1.04,
                      }}
                    >
                      {visualName ?? stripFanletterTitleSuffix(title)}
                    </div>
                    {latestTitle ? (
                      <div
                        style={{
                          color: "rgba(255,255,255,0.74)",
                          display: "flex",
                          fontSize: 16,
                          fontWeight: 800,
                          lineHeight: 1.25,
                        }}
                      >
                        {locale === "ko"
                          ? `최근: ${truncateText(latestTitle, 28)}`
                          : `Latest: ${truncateText(latestTitle, 28)}`}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 9,
                      width: "100%",
                    }}
                  >
                    {metrics.map((metric, index) => (
                      <div
                        key={metric.label}
                        style={{
                          background:
                            index === 0 ? "#44f26e" : "rgba(255,255,255,0.92)",
                          border:
                            index === 0
                              ? "1px solid rgba(68,242,110,0.8)"
                              : "1px solid rgba(255,255,255,0.16)",
                          borderRadius: 18,
                          color: "#07100b",
                          display: "flex",
                          flex: 1,
                          flexDirection: "column",
                          gap: 5,
                          padding: "12px 10px",
                        }}
                      >
                        <div
                          style={{
                            color:
                              index === 0 ? "#07100b" : "rgba(7,16,11,0.62)",
                            display: "flex",
                            fontSize: 12,
                            fontWeight: 900,
                            lineHeight: 1.1,
                          }}
                        >
                          {metric.label}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            fontSize: 30,
                            fontWeight: 900,
                            lineHeight: 1,
                          }}
                        >
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 34,
                  boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
                  color: "#07100b",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  padding: 18,
                  width: "100%",
                }}
              >
                {metrics.map((metric, index) => (
                  <div
                    key={metric.label}
                    style={{
                      alignItems: "center",
                      background: index === 0 ? "#44f26e" : "#f4f6f2",
                      borderRadius: 22,
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "18px 20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          color: index === 0 ? "#07100b" : "#5b665f",
                          display: "flex",
                          fontSize: 15,
                          fontWeight: 800,
                        }}
                      >
                        {metric.label}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          fontSize: 42,
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {metric.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 14,
              }}
            >
              {categoryLabels.map((label) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.09)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 999,
                    color: "rgba(255,255,255,0.72)",
                    display: "flex",
                    fontSize: 17,
                    fontWeight: 800,
                    padding: "12px 15px",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    FANLETTER_OG_IMAGE_SIZE,
  );
}
