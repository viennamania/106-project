import { ImageResponse } from "next/og";

import { createFanletterNewsPublicCutFeedItem } from "@/lib/fanletter-news-public-cuts";
import { normalizeFanletterNewsPublicCutSlotNumber } from "@/lib/fanletter-news-public-cuts-shared";
import { getFanletterNewsReportById } from "@/lib/fanletter-news-report-service";
import {
  defaultLocale,
  hasLocale,
  type Locale,
} from "@/lib/i18n";

export const contentType = "image/png";
export const runtime = "nodejs";
export const size = {
  height: 630,
  width: 1200,
};

function readLocale(value: string | null) {
  return (value && hasLocale(value) ? value : defaultLocale) as Locale;
}

function getRenderableImageUrl(
  value: string | null | undefined,
  origin: string,
) {
  if (!value) {
    return null;
  }

  try {
    const imageUrl = new URL(value, origin);

    return imageUrl.protocol === "https:" || imageUrl.protocol === "http:"
      ? imageUrl.toString()
      : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId")?.trim() ?? "";
  const locale = readLocale(url.searchParams.get("lang"));
  const requestedCutSlotNumber = normalizeFanletterNewsPublicCutSlotNumber(
    url.searchParams.get("cut"),
  );

  if (!reportId) {
    return new Response("reportId is required.", { status: 400 });
  }

  const report = await getFanletterNewsReportById(reportId);

  if (!report || report.locale !== locale) {
    return new Response("Report not found.", { status: 404 });
  }

  const feedItem = createFanletterNewsPublicCutFeedItem(report);

  if (!feedItem) {
    return new Response("Reporter cuts not found.", { status: 404 });
  }

  const selectedCut =
    feedItem.cuts.find((cut) => cut.slotNumber === requestedCutSlotNumber) ??
    feedItem.leadCut;
  const cutImageUrl = getRenderableImageUrl(selectedCut.imageUrl, url.origin);

  if (!cutImageUrl) {
    return new Response("Reporter cut image is not renderable.", {
      status: 404,
    });
  }

  const reporterAvatarImageUrl = getRenderableImageUrl(
    report.reporterAvatarImageUrl ?? null,
    url.origin,
  );

  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
        <img
          alt={report.title}
          height="630"
          src={cutImageUrl}
          style={{
            display: "flex",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
            width: "100%",
          }}
          width="1200"
        />

        {reporterAvatarImageUrl ? (
          <div
            style={{
              border: "4px solid rgba(255,255,255,0.92)",
              borderRadius: 999,
              bottom: 32,
              boxShadow: "0 18px 46px rgba(0,0,0,0.36)",
              display: "flex",
              height: 104,
              overflow: "hidden",
              position: "absolute",
              right: 34,
              width: 104,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires plain img for remote assets. */}
            <img
              alt={report.reporterName}
              height="104"
              src={reporterAvatarImageUrl}
              style={{
                borderRadius: 999,
                display: "flex",
                height: "100%",
                objectFit: "cover",
                width: "100%",
              }}
              width="104"
            />
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}
