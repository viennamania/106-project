import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

const fanletterOgFontFamily =
  "FanLetterKR, Arial, Helvetica, sans-serif";
const notoSansKrBoldFontPromise = readFile(
  join(process.cwd(), "public/fonts/noto-sans-kr-bold.ttf"),
)
  .then((buffer) =>
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  )
  .catch(() => null);

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

function getOgAvatarExpressionLabel(
  expression: string | null | undefined,
  label: string | null | undefined,
  locale: Locale,
) {
  if (expression === "fanservice") {
    return locale === "ko" ? "팬 리액션" : "Fan reaction";
  }

  if (label?.trim()) {
    return label.trim();
  }

  if (expression === "smile") {
    return locale === "ko" ? "미소" : "Smile";
  }

  if (expression === "serious") {
    return locale === "ko" ? "차분함" : "Calm";
  }

  if (expression === "reaction") {
    return locale === "ko" ? "리액션" : "Reaction";
  }

  if (expression === "shy") {
    return locale === "ko" ? "설렘" : "Delight";
  }

  if (expression === "focus") {
    return locale === "ko" ? "집중" : "Focus";
  }

  if (expression === "thumbnail") {
    return locale === "ko" ? "썸네일" : "Thumbnail";
  }

  return locale === "ko" ? "대표" : "Default";
}

function formatMetric(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

async function getFanletterOgImageOptions() {
  const fontData = await notoSansKrBoldFontPromise;

  if (!fontData) {
    return FANLETTER_OG_IMAGE_SIZE;
  }

  return {
    ...FANLETTER_OG_IMAGE_SIZE,
    fonts: ([400, 700, 900] as const).map((weight) => ({
      data: fontData,
      name: "FanLetterKR",
      style: "normal" as const,
      weight,
    })),
  };
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
  const layout = url.searchParams.get("layout");
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
  const creatorExpressionCards = (() => {
    const cards: Array<{ imageUrl: string; label: string }> = [];
    const seenImageUrls = new Set<string>();
    const seenLabels = new Set<string>();
    const addCard = (
      imageUrl: string | null | undefined,
      label: string,
    ) => {
      const renderableImageUrl = getRenderableImageUrl(imageUrl, url.origin);
      const normalizedLabel = label.trim();
      const labelKey = normalizedLabel.toLowerCase();

      if (
        !renderableImageUrl ||
        seenImageUrls.has(renderableImageUrl) ||
        seenLabels.has(labelKey)
      ) {
        return;
      }

      seenImageUrls.add(renderableImageUrl);
      seenLabels.add(labelKey);
      cards.push({
        imageUrl: renderableImageUrl,
        label: normalizedLabel,
      });
    };

    for (const avatar of creatorData?.profile.character?.avatarImageSet ?? []) {
      addCard(
        avatar.url,
        getOgAvatarExpressionLabel(avatar.expression, avatar.label, locale),
      );
    }

    if (cards.length < 2) {
      addCard(
        creatorData?.profile.avatarImageUrl,
        locale === "ko" ? "대표" : "Default",
      );
    }

    if (cards.length < 5) {
      addCard(
        creatorData?.items[0]?.coverImageUrl,
        locale === "ko" ? "브이로그" : "Vlog",
      );
    }

    return cards.slice(0, 8);
  })();
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
  const homeProfileCards = (() => {
    const cards: Array<{ imageUrl: string; name: string }> = [];
    const seenImageUrls = new Set<string>();
    const addCard = (imageUrl: string | null, name: string) => {
      if (!imageUrl || seenImageUrls.has(imageUrl)) {
        return;
      }

      seenImageUrls.add(imageUrl);
      cards.push({
        imageUrl,
        name: name.trim() || "FanLetter",
      });
    };

    for (const video of landingData?.featuredVideos ?? []) {
      addCard(
        getRenderableImageUrl(video.authorAvatarImageUrl, url.origin),
        video.authorName,
      );
    }

    for (const video of landingData?.featuredPaidVideos ?? []) {
      addCard(
        getRenderableImageUrl(video.authorAvatarImageUrl, url.origin),
        video.authorName,
      );
    }

    for (const video of landingData?.featuredVideos ?? []) {
      addCard(
        getRenderableImageUrl(video.coverImageUrl, url.origin),
        video.authorName,
      );
    }

    return cards.slice(0, 8);
  })();
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

  if (!creatorData && variant === "home" && (homeProfileCards.length > 0 || visualUrl)) {
    const homeProfiles =
      homeProfileCards.length > 0
        ? homeProfileCards
        : [
            {
              imageUrl: visualUrl as string,
              name: visualName ?? "FanLetter",
            },
          ];
    const homeHeadline = locale === "ko"
      ? "팬이 키우는\nAI 캐릭터"
      : "Fan-powered\nAI characters";
    const getHomeProfile = (index: number) =>
      homeProfiles[index % homeProfiles.length];
    const primaryProfile = getHomeProfile(0);
    const leftProfileCards = [
      {
        height: 252,
        profile: getHomeProfile(1),
        width: 184,
      },
      {
        height: 252,
        profile: getHomeProfile(2),
        width: 184,
      },
    ];
    const rightProfileCards = [
      {
        height: 166,
        profile: getHomeProfile(3),
        width: 178,
      },
      {
        height: 166,
        profile: getHomeProfile(4),
        width: 178,
      },
      {
        height: 166,
        profile: getHomeProfile(5),
        width: 178,
      },
    ];
    const bottomProfileCards = [
      getHomeProfile(6),
      getHomeProfile(7),
      getHomeProfile(2),
      getHomeProfile(4),
    ];

    return new ImageResponse(
      (
        <div
          style={{
            background: "#030504",
            color: "white",
            display: "flex",
            fontFamily: fanletterOgFontFamily,
            height: "100%",
            overflow: "hidden",
            position: "relative",
            width: "100%",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
          <img
            alt=""
            height="630"
            src={primaryProfile.imageUrl}
            style={{
              display: "flex",
              filter: "blur(20px) brightness(0.54) saturate(1.1)",
              height: "100%",
              objectFit: "cover",
              opacity: 0.96,
              position: "absolute",
              transform: "scale(1.09)",
              width: "100%",
            }}
            width="1200"
          />
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(3,5,4,0.95) 0%, rgba(3,5,4,0.74) 35%, rgba(3,5,4,0.28) 72%, rgba(3,5,4,0.5) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <div
            style={{
              background:
                "linear-gradient(0deg, rgba(3,5,4,0.76) 0%, rgba(3,5,4,0.03) 50%, rgba(3,5,4,0.32) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 30,
              height: "100%",
              padding: 32,
              position: "relative",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "14px 0 12px 10px",
                width: 374,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  background: "rgba(3,5,4,0.58)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 999,
                  display: "flex",
                  gap: 12,
                  padding: "8px 16px 8px 8px",
                  width: 234,
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    background: "#44f26e",
                    borderRadius: 14,
                    color: "#030504",
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 900,
                    height: 46,
                    justifyContent: "center",
                    width: 46,
                  }}
                >
                  F
                </div>
                <div
                  style={{
                    display: "flex",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 25, fontWeight: 900 }}>
                    FanLetter
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div
                  style={{
                    background: "#44f26e",
                    display: "flex",
                    height: 8,
                    width: 86,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 68,
                    fontWeight: 900,
                    letterSpacing: 0,
                    lineHeight: 0.98,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {homeHeadline}
                </div>
              </div>

              <div style={{ display: "flex", gap: 14 }}>
                {bottomProfileCards.map((profile, index) => (
                  <div
                    key={`${profile.imageUrl}:bottom:${index}`}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "2px solid rgba(255,255,255,0.14)",
                      borderRadius: 999,
                      display: "flex",
                      height: 72,
                      overflow: "hidden",
                      width: 72,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
                    <img
                      alt=""
                      height="72"
                      src={profile.imageUrl}
                      style={{
                        display: "flex",
                        height: "100%",
                        objectFit: "cover",
                        width: "100%",
                      }}
                      width="72"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                alignItems: "center",
                display: "flex",
                flex: 1,
                gap: 14,
                justifyContent: "flex-end",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  justifyContent: "center",
                }}
              >
                {leftProfileCards.map((card, index) => (
                  <div
                    key={`${card.profile.imageUrl}:left:${index}`}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 36,
                      boxShadow: "0 24px 80px rgba(0,0,0,0.34)",
                      display: "flex",
                      height: card.height,
                      overflow: "hidden",
                      width: card.width,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
                    <img
                      alt=""
                      height={card.height}
                      src={card.profile.imageUrl}
                      style={{
                        display: "flex",
                        height: "100%",
                        objectFit: "cover",
                        width: "100%",
                      }}
                      width={card.width}
                    />
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "2px solid rgba(68,242,110,0.6)",
                  borderRadius: 44,
                  boxShadow: "0 34px 100px rgba(0,0,0,0.42)",
                  display: "flex",
                  height: 536,
                  overflow: "hidden",
                  padding: 10,
                  position: "relative",
                  width: 330,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
                <img
                  alt=""
                  height="536"
                  src={primaryProfile.imageUrl}
                  style={{
                    borderRadius: 32,
                    display: "flex",
                    height: "100%",
                    objectFit: "cover",
                    width: "100%",
                  }}
                  width="330"
                />
                <div
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(3,5,4,0.24) 0%, rgba(3,5,4,0.02) 42%, rgba(3,5,4,0.14) 100%)",
                    borderRadius: 32,
                    inset: 10,
                    position: "absolute",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  justifyContent: "center",
                }}
              >
                {rightProfileCards.map((card, index) => (
                  <div
                    key={`${card.profile.imageUrl}:right:${index}`}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 34,
                      boxShadow: "0 20px 70px rgba(0,0,0,0.3)",
                      display: "flex",
                      height: card.height,
                      overflow: "hidden",
                      width: card.width,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
                    <img
                      alt=""
                      height={card.height}
                      src={card.profile.imageUrl}
                      style={{
                        display: "flex",
                        height: "100%",
                        objectFit: "cover",
                        width: "100%",
                      }}
                      width={card.width}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      await getFanletterOgImageOptions(),
    );
  }

  if (creatorData && visualUrl && layout === "promo") {
    const creatorDisplayName = truncateText(
      visualName ?? stripFanletterTitleSuffix(title),
      32,
    );
    const promoHeroImageUrl = creatorCoverImageUrl ?? creatorAvatarImageUrl ?? visualUrl;
    const promoHeadline = latestTitle
      ? truncateText(latestTitle, 42)
      : truncateText(title, 44);
    const promoDescription = truncateText(description, 72);
    const promoKicker =
      locale === "ko" ? "FanLetter 공유 미리보기" : "FanLetter share preview";
    const promoVisualLabel =
      creatorCoverImageUrl
        ? locale === "ko"
          ? "대표 브이로그"
          : "Featured vlog"
        : locale === "ko"
          ? "AI 캐릭터"
          : "AI character";
    const promoMetricCards = metrics.slice(0, 3);
    const showAvatarInset =
      Boolean(creatorAvatarImageUrl) && creatorAvatarImageUrl !== promoHeroImageUrl;

    return new ImageResponse(
      (
        <div
          style={{
            background: "#030504",
            color: "white",
            display: "flex",
            fontFamily: fanletterOgFontFamily,
            height: "100%",
            overflow: "hidden",
            position: "relative",
            width: "100%",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
          <img
            alt=""
            height="630"
            src={promoHeroImageUrl}
            style={{
              display: "flex",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              width: "100%",
            }}
            width="1200"
          />
          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(3,5,4,0.16) 0%, rgba(3,5,4,0.1) 38%, rgba(3,5,4,0.88) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(3,5,4,0.78) 0%, rgba(3,5,4,0.24) 44%, rgba(3,5,4,0.08) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 38,
              inset: 22,
              position: "absolute",
            }}
          />

          <div
            style={{
              alignItems: "center",
              background: "rgba(3,5,4,0.68)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 999,
              display: "flex",
              gap: 12,
              left: 46,
              padding: "8px 16px 8px 8px",
              position: "absolute",
              top: 42,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#44f26e",
                borderRadius: 13,
                color: "#030504",
                display: "flex",
                fontSize: 24,
                fontWeight: 900,
                height: 46,
                justifyContent: "center",
                width: 46,
              }}
            >
              F
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", fontSize: 25, fontWeight: 900 }}>
                FanLetter
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.62)",
                  display: "flex",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                AI CHARACTER VLOG
              </div>
            </div>
          </div>

          {showAvatarInset ? (
            <div
              style={{
                background: "rgba(3,5,4,0.5)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 32,
                boxShadow: "0 26px 80px rgba(0,0,0,0.36)",
                display: "flex",
                height: 152,
                overflow: "hidden",
                padding: 8,
                position: "absolute",
                right: 48,
                top: 42,
                width: 152,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
              <img
                alt=""
                height="136"
                src={creatorAvatarImageUrl ?? promoHeroImageUrl}
                style={{
                  borderRadius: 24,
                  display: "flex",
                  height: "100%",
                  objectFit: "cover",
                  width: "100%",
                }}
                width="136"
              />
            </div>
          ) : null}

          <div
            style={{
              bottom: 42,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              left: 48,
              position: "absolute",
              width: 684,
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                background: "#44f26e",
                borderRadius: 999,
                color: "#07100b",
                display: "flex",
                fontSize: 18,
                fontWeight: 900,
                padding: "10px 15px",
              }}
            >
              {promoVisualLabel}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  color: "white",
                  display: "flex",
                  fontSize: 66,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  lineHeight: 0.98,
                }}
              >
                {creatorDisplayName}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.82)",
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 900,
                  lineHeight: 1.18,
                }}
              >
                {promoHeadline}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.58)",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.32,
                }}
              >
                {promoDescription}
              </div>
            </div>
          </div>

          <div
            style={{
              alignItems: "stretch",
              background: "rgba(3,5,4,0.66)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 30,
              bottom: 42,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 18,
              position: "absolute",
              right: 48,
              width: 310,
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.56)",
                display: "flex",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {promoKicker}
            </div>
            {promoMetricCards.map((metric) => (
              <div
                key={metric.label}
                style={{
                  alignItems: "center",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 22,
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "13px 15px",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.58)",
                    display: "flex",
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {metric.label}
                </div>
                <div
                  style={{
                    color: "#44f26e",
                    display: "flex",
                    fontSize: 25,
                    fontWeight: 900,
                  }}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      await getFanletterOgImageOptions(),
    );
  }

  if (creatorData && visualUrl && layout === "promo-gallery") {
    const creatorDisplayName = truncateText(
      visualName ?? stripFanletterTitleSuffix(title),
      28,
    );
    const promoVisualUrl = creatorAvatarImageUrl ?? visualUrl;
    const fallbackExpressionCard = {
      imageUrl: promoVisualUrl,
      label: locale === "ko" ? "대표" : "Default",
    };
    const promoExpressionCards =
      creatorExpressionCards.length > 0
        ? creatorExpressionCards
        : [fallbackExpressionCard];
    const getPromoExpressionCard = (index: number) =>
      promoExpressionCards[index] ?? fallbackExpressionCard;
    const expressionSlots: Array<{
      card: { imageUrl: string; label: string };
      featured: boolean;
      height: number;
      left: number;
      radius: number;
      top: number;
      width: number;
    }> = [];
    const addExpressionSlot = (
      card: { imageUrl: string; label: string } | undefined,
      slot: Omit<(typeof expressionSlots)[number], "card">,
    ) => {
      if (!card) {
        return;
      }

      expressionSlots.push({
        ...slot,
        card,
      });
    };

    addExpressionSlot(promoExpressionCards[1], {
      featured: false,
      height: 226,
      left: 332,
      radius: 30,
      top: 70,
      width: 200,
    });
    addExpressionSlot(promoExpressionCards[2], {
      featured: false,
      height: 226,
      left: 332,
      radius: 30,
      top: 334,
      width: 200,
    });
    addExpressionSlot(promoExpressionCards[0] ?? fallbackExpressionCard, {
      featured: true,
      height: 570,
      left: 558,
      radius: 38,
      top: 30,
      width: 396,
    });
    addExpressionSlot(promoExpressionCards[3], {
      featured: false,
      height: 226,
      left: 982,
      radius: 30,
      top: 70,
      width: 184,
    });
    addExpressionSlot(promoExpressionCards[4], {
      featured: false,
      height: 226,
      left: 982,
      radius: 30,
      top: 334,
      width: 184,
    });
    const promoBadge = locale === "ko" ? "AI 표정 갤러리" : "AI expression set";

    return new ImageResponse(
      (
        <div
          style={{
            background: "#030504",
            color: "white",
            display: "flex",
            fontFamily: fanletterOgFontFamily,
            height: "100%",
            overflow: "hidden",
            position: "relative",
            width: "100%",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
          <img
            alt=""
            height="630"
            src={getPromoExpressionCard(0).imageUrl}
            style={{
              display: "flex",
              filter: "blur(22px) brightness(0.46) saturate(1.08)",
              height: "100%",
              objectFit: "cover",
              opacity: 0.96,
              position: "absolute",
              transform: "scale(1.1)",
              width: "100%",
            }}
            width="1200"
          />
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(3,5,4,0.74) 0%, rgba(3,5,4,0.2) 46%, rgba(3,5,4,0.32) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <div
            style={{
              background:
                "linear-gradient(0deg, rgba(3,5,4,0.56) 0%, rgba(3,5,4,0.02) 46%, rgba(3,5,4,0.32) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 42,
              inset: 20,
              position: "absolute",
            }}
          />

          <div
            style={{
              display: "flex",
              height: "100%",
              position: "relative",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                left: 44,
                position: "absolute",
                top: 42,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  background: "rgba(3,5,4,0.66)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 999,
                  display: "flex",
                  gap: 12,
                  padding: "8px 16px 8px 8px",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    background: "#44f26e",
                    borderRadius: 13,
                    color: "#030504",
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 900,
                    height: 46,
                    justifyContent: "center",
                    width: 46,
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
                  <div style={{ display: "flex", fontSize: 25, fontWeight: 900 }}>
                    FanLetter
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.56)",
                      display: "flex",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    AI CHARACTER VLOG
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                left: 48,
                position: "absolute",
                top: 186,
                width: 266,
              }}
            >
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#44f26e",
                  borderRadius: 999,
                  color: "#07100b",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 900,
                  padding: "10px 15px",
                }}
              >
                {promoBadge}
              </div>
              <div
                style={{
                  color: "white",
                  display: "flex",
                  fontSize: 52,
                  fontWeight: 900,
                  lineHeight: 1.04,
                }}
              >
                {creatorDisplayName}
              </div>
            </div>

            {expressionSlots.map((slot, index) => (
              <div
                key={`${slot.card.imageUrl}:promo-expression:${index}`}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: slot.radius,
                  boxShadow:
                    slot.featured
                      ? "0 34px 110px rgba(0,0,0,0.48)"
                      : "0 22px 70px rgba(0,0,0,0.38)",
                  display: "flex",
                  height: slot.height,
                  left: slot.left,
                  overflow: "hidden",
                  padding: slot.featured ? 10 : 8,
                  position: "absolute",
                  top: slot.top,
                  width: slot.width,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
                <img
                  alt=""
                  height={slot.height}
                  src={slot.card.imageUrl}
                  style={{
                    borderRadius: slot.radius - 8,
                    display: "flex",
                    height: "100%",
                    objectFit: "cover",
                    width: "100%",
                  }}
                  width={slot.width}
                />
                <div
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(3,5,4,0.58) 0%, rgba(3,5,4,0.02) 48%)",
                    borderRadius: slot.radius - 8,
                    inset: slot.featured ? 10 : 8,
                    position: "absolute",
                  }}
                />
                <div
                  style={{
                    background:
                      slot.featured
                        ? "#44f26e"
                        : "rgba(3,5,4,0.72)",
                    border:
                      slot.featured
                        ? "1px solid rgba(68,242,110,0.3)"
                        : "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 999,
                    bottom: slot.featured ? 24 : 18,
                    color: slot.featured ? "#07100b" : "white",
                    display: "flex",
                    fontSize: slot.featured ? 22 : 18,
                    fontWeight: 900,
                    left: slot.featured ? 24 : 18,
                    padding: slot.featured ? "10px 15px" : "8px 12px",
                    position: "absolute",
                  }}
                >
                  {slot.card.label}
                </div>
              </div>
            ))}

          </div>
        </div>
      ),
      await getFanletterOgImageOptions(),
    );
  }

  if (creatorData && visualUrl) {
    const creatorDisplayName = truncateText(
      visualName ?? stripFanletterTitleSuffix(title),
      34,
    );
    const posterTitle = latestTitle
      ? truncateText(latestTitle, 48)
      : truncateText(title, 48);
    const posterBadge = creatorCoverImageUrl ? visualLabel : badge;

    return new ImageResponse(
      (
        <div
          style={{
            background: "#030504",
            color: "white",
            display: "flex",
            fontFamily: fanletterOgFontFamily,
            height: "100%",
            overflow: "hidden",
            position: "relative",
            width: "100%",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
          <img
            alt=""
            height="630"
            src={visualUrl}
            style={{
              display: "flex",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              width: "100%",
              ...(shouldBlurVisual
                ? {
                    filter: "blur(7px) brightness(0.72) saturate(0.9)",
                    transform: "scale(1.035)",
                  }
                : {}),
            }}
            width="1200"
          />
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(3,5,4,0.88) 0%, rgba(3,5,4,0.36) 43%, rgba(3,5,4,0.08) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <div
            style={{
              background:
                "linear-gradient(0deg, rgba(3,5,4,0.9) 0%, rgba(3,5,4,0.42) 24%, rgba(3,5,4,0.08) 58%, rgba(3,5,4,0.42) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 42,
              inset: 24,
              position: "absolute",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "space-between",
              padding: 44,
              position: "relative",
              width: "100%",
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
                  background: "rgba(3,5,4,0.62)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  display: "flex",
                  gap: 14,
                  padding: "10px 18px 10px 10px",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    background: "#44f26e",
                    borderRadius: 15,
                    color: "#030504",
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 900,
                    height: 50,
                    justifyContent: "center",
                    width: 50,
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
                  <div style={{ display: "flex", fontSize: 27, fontWeight: 900 }}>
                    FanLetter
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.62)",
                      display: "flex",
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    AI CHARACTER VLOG
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "#44f26e",
                  borderRadius: 999,
                  color: "#07100b",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 900,
                  padding: "14px 20px",
                }}
              >
                {variantLabel}
              </div>
            </div>

            <div
              style={{
                alignItems: "flex-end",
                display: "flex",
                gap: 24,
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  background: "rgba(3,5,4,0.66)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 30,
                  boxShadow: "0 24px 90px rgba(0,0,0,0.32)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 15,
                  maxWidth: 640,
                  padding: "24px 28px",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: 14,
                  }}
                >
                  {creatorAvatarImageUrl && creatorAvatarImageUrl !== visualUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets.
                    <img
                      alt=""
                      height="62"
                      src={creatorAvatarImageUrl}
                      style={{
                        border: "2px solid rgba(68,242,110,0.78)",
                        borderRadius: 999,
                        display: "flex",
                        height: 62,
                        objectFit: "cover",
                        width: 62,
                      }}
                      width="62"
                    />
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    <div
                      style={{
                        color: "#44f26e",
                        display: "flex",
                        fontSize: 17,
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      {posterBadge}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 44,
                        fontWeight: 900,
                        lineHeight: 0.98,
                      }}
                    >
                      {creatorDisplayName}
                    </div>
                  </div>
                </div>
                {creatorCoverImageUrl ? (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.78)",
                      display: "flex",
                      fontSize: 22,
                      fontWeight: 800,
                      lineHeight: 1.18,
                    }}
                  >
                    {posterTitle}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
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
                          ? "1px solid rgba(68,242,110,0.85)"
                          : "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 24,
                      color: "#07100b",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      minWidth: 132,
                      padding: "17px 18px",
                    }}
                  >
                    <div
                      style={{
                        color:
                          index === 0 ? "#07100b" : "rgba(7,16,11,0.62)",
                        display: "flex",
                        fontSize: 14,
                        fontWeight: 900,
                        lineHeight: 1.1,
                      }}
                    >
                      {metric.label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 38,
                        fontWeight: 900,
                        lineHeight: 0.95,
                      }}
                    >
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      await getFanletterOgImageOptions(),
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#030504",
          color: "white",
          display: "flex",
          fontFamily: fanletterOgFontFamily,
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
                    height: "100%",
                    objectFit: "cover",
                    width: "100%",
                    ...(shouldBlurVisual
                      ? {
                          filter: "blur(10px) brightness(0.72) saturate(0.88)",
                          transform: "scale(1.04)",
                        }
                      : {}),
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
    await getFanletterOgImageOptions(),
  );
}
