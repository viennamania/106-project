import { ImageResponse } from "next/og";

import {
  FANLETTER_OG_IMAGE_SIZE,
  isFanletterOgVariant,
  type FanletterOgVariant,
} from "@/lib/fanletter-og";
import { getFanletterCreatorPageData } from "@/lib/fanletter-content-service";
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
    badge: "AI 크리에이터 수익화",
    description:
      "인물 페르소나, AI 이미지와 동영상, 팬 전용 피드, 판매 흐름을 하나의 모바일 홈으로 연결합니다.",
    footer: "모바일 중심 · AI 콘텐츠 · 팬 판매",
    metrics: [
      { label: "AI 콘텐츠 흐름", value: "05" },
      { label: "크리에이터 스튜디오", value: "01" },
      { label: "모바일 중심", value: "24/7" },
    ],
    title: "FanLetter Creator AI",
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

function getRenderableImageUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
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
  const creatorVisualUrl = getRenderableImageUrl(
    creatorData?.profile.character?.avatarImageSet[0]?.url ??
      creatorData?.profile.avatarImageUrl ??
      creatorData?.items[0]?.coverImageUrl,
  );
  const title = truncateText(url.searchParams.get("title") || copy.title, 62);
  const description = truncateText(
    url.searchParams.get("description") || copy.description,
    122,
  );
  const variantLabel = copy.variantLabels[variant];
  const metrics = creatorData
    ? [
        {
          label: locale === "ko" ? "공개 브이로그" : "Public vlogs",
          value: new Intl.NumberFormat(locale).format(creatorData.publicContentCount),
        },
        {
          label: locale === "ko" ? "팬 전용" : "Fan-only",
          value: new Intl.NumberFormat(locale).format(
            creatorData.fanOnlyContentCount,
          ),
        },
        {
          label: locale === "ko" ? "캐릭터 레벨" : "Character level",
          value: creatorData.profile.character
            ? `Lv.${creatorData.profile.character.growth.level}`
            : "Lv.1",
        },
      ]
    : copy.metrics;

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
              ...(creatorVisualUrl ? { maxWidth: 700 } : {}),
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
                    Creator AI
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
                {copy.badge}
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
              {copy.footer}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              justifyContent: "center",
              width: creatorVisualUrl ? 366 : 350,
            }}
          >
            {creatorVisualUrl ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 38,
                  boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
                  display: "flex",
                  height: 424,
                  overflow: "hidden",
                  position: "relative",
                  width: "100%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
                <img
                  alt=""
                  height="424"
                  src={creatorVisualUrl}
                  style={{
                    display: "flex",
                    height: "100%",
                    objectFit: "cover",
                    width: "100%",
                  }}
                  width="366"
                />
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(3,5,4,0.02) 0%, rgba(3,5,4,0.1) 42%, rgba(3,5,4,0.78) 100%)",
                    inset: 0,
                    position: "absolute",
                  }}
                />
                <div
                  style={{
                    bottom: 18,
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    left: 20,
                    position: "absolute",
                    right: 20,
                  }}
                >
                  <div
                    style={{
                      color: "#44f26e",
                      display: "flex",
                      fontSize: 18,
                      fontWeight: 900,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {locale === "ko" ? "대표 페르소나" : "Character identity"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 32,
                      fontWeight: 900,
                      lineHeight: 1.05,
                    }}
                  >
                    {title.replace(/\s*\|\s*FanLetter$/, "")}
                  </div>
                </div>
              </div>
            ) : null}
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: 34,
                boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
                color: "#07100b",
                display: "flex",
                flexDirection: "column",
                gap: 16,
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
                  <div
                    style={{
                      background: index === 0 ? "#07100b" : "#07100b",
                      borderRadius: 999,
                      display: "flex",
                      height: 48,
                      width: 48,
                    }}
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
              }}
            >
              {["Persona", "Image", "Video"].map((label) => (
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
