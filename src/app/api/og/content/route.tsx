import { ImageResponse } from "next/og";

import { getPublishedContentShareMetadata } from "@/lib/content-service";
import {
  defaultLocale,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import { getContentCopy } from "@/lib/content-copy";

export const contentType = "image/png";
export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const localeInput = url.searchParams.get("lang") ?? defaultLocale;
  const locale = (hasLocale(localeInput) ? localeInput : defaultLocale) as Locale;
  const contentId = url.searchParams.get("contentId")?.trim() ?? "";
  const copy = getContentCopy(locale);

  if (!contentId) {
    return new Response("contentId is required.", { status: 400 });
  }

  const content = await getPublishedContentShareMetadata(contentId);

  if (!content) {
    return new Response("Content not found.", { status: 404 });
  }

  const summary = content.summary.trim() || copy.meta.detailDescription;
  const accessLabel =
    content.priceType === "paid"
      ? `${copy.labels.paid} · ${content.priceUsdt ?? "1"} USDT`
      : copy.labels.free;
  const mediaLabel = content.hasVideo
    ? locale === "ko"
      ? "동영상 콘텐츠"
      : "Video content"
    : copy.meta.detailTitle;
  const eyebrow = content.authorDisplayName
    ? `${content.authorDisplayName} · ${mediaLabel}`
    : mediaLabel;
  const hasVisualPanel = Boolean(content.coverImageUrl || content.hasVideo);
  const shouldBlurCover = content.priceType === "paid";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e293b 100%)",
          color: "white",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(244,114,182,0.18), transparent 30%)",
            inset: 0,
            position: "absolute",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 32,
            height: "100%",
            padding: "46px 48px",
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
              maxWidth: hasVisualPanel ? 640 : 980,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  alignSelf: "flex-start",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 999,
                  color: "rgba(255,255,255,0.82)",
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  padding: "12px 18px",
                  textTransform: "uppercase",
                }}
              >
                {eyebrow}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 64,
                  fontWeight: 700,
                  letterSpacing: 0,
                  lineHeight: 1.04,
                  whiteSpace: "pre-wrap",
                }}
              >
                {content.title}
              </div>

              <div
                style={{
                  color: "rgba(255,255,255,0.78)",
                  display: "flex",
                  fontSize: 28,
                  lineHeight: 1.42,
                  whiteSpace: "pre-wrap",
                }}
              >
                {summary.slice(0, 180)}
              </div>
            </div>

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
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 999,
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 600,
                  padding: "12px 18px",
                }}
              >
                {accessLabel}
              </div>
              {content.authorDisplayName ? (
                <div
                  style={{
                    alignItems: "center",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 999,
                    display: "flex",
                    fontSize: 18,
                    fontWeight: 600,
                    padding: "12px 18px",
                  }}
                >
                  {content.authorDisplayName}
                </div>
              ) : null}
            </div>
          </div>

          {hasVisualPanel ? (
            <div
              style={{
                background:
                  "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(2,6,23,0.98))",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 32,
                display: "flex",
                height: "100%",
                maxHeight: 538,
                overflow: "hidden",
                position: "relative",
                width: 372,
              }}
            >
              {content.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets.
                <img
                  alt={content.title}
                  height="538"
                  src={content.coverImageUrl}
                  style={{
                    display: "flex",
                    height: "100%",
                    objectFit: "cover",
                    width: "100%",
                    ...(shouldBlurCover
                      ? {
                          filter: "blur(10px) brightness(0.72) saturate(0.88)",
                          transform: "scale(1.04)",
                        }
                      : {}),
                  }}
                  width="372"
                />
              ) : (
                <div
                  style={{
                    alignItems: "center",
                    background:
                      "radial-gradient(circle at 50% 36%, rgba(255,255,255,0.16), transparent 34%), linear-gradient(160deg, #020617 0%, #0f172a 100%)",
                    color: "rgba(255,255,255,0.74)",
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 700,
                    height: "100%",
                    justifyContent: "center",
                    textTransform: "uppercase",
                    width: "100%",
                  }}
                >
                  1066friend+
                </div>
              )}

              {content.hasVideo ? (
                <div
                  style={{
                    alignItems: "center",
                    background:
                      "linear-gradient(180deg, rgba(2,6,23,0.16), rgba(2,6,23,0.52))",
                    bottom: 0,
                    display: "flex",
                    height: "100%",
                    justifyContent: "center",
                    left: 0,
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      backdropFilter: "blur(12px)",
                      background: "rgba(15,23,42,0.74)",
                      border: "2px solid rgba(255,255,255,0.74)",
                      borderRadius: 999,
                      boxShadow: "0 24px 80px rgba(0,0,0,0.36)",
                      display: "flex",
                      height: 118,
                      justifyContent: "center",
                      width: 118,
                    }}
                  >
                    <span
                      style={{
                        color: "white",
                        display: "flex",
                        fontSize: 52,
                        lineHeight: 1,
                        marginLeft: 6,
                      }}
                    >
                      ▶
                    </span>
                  </div>
                </div>
              ) : null}

              {content.hasVideo ? (
                <div
                  style={{
                    alignItems: "center",
                    background: "rgba(255,255,255,0.92)",
                    borderRadius: 999,
                    color: "#020617",
                    display: "flex",
                    fontSize: 20,
                    fontWeight: 800,
                    left: 22,
                    padding: "10px 16px",
                    position: "absolute",
                    top: 22,
                  }}
                >
                  {mediaLabel}
                </div>
              ) : null}

              {content.hasVideo ? (
                <div
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(56,189,248,0.94), rgba(244,114,182,0.94))",
                    bottom: 0,
                    display: "flex",
                    height: 10,
                    left: 0,
                    position: "absolute",
                    right: 0,
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
