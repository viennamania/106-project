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
  const eyebrow = content.authorDisplayName
    ? `${content.authorDisplayName} · ${copy.meta.detailTitle}`
    : copy.meta.detailTitle;

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
              maxWidth: content.coverImageUrl ? 640 : 980,
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
                  letterSpacing: "-0.05em",
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
                {copy.labels.free}
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

          {content.coverImageUrl ? (
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 32,
                display: "flex",
                height: "100%",
                maxHeight: 538,
                overflow: "hidden",
                width: 372,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
              <img
                alt={content.title}
                height="538"
                src={content.coverImageUrl}
                style={{
                  display: "flex",
                  height: "100%",
                  objectFit: "cover",
                  width: "100%",
                }}
                width="372"
              />
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
