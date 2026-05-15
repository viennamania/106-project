import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "1066friend+ global network landing preview";
export const contentType = "image/png";
export const runtime = "nodejs";
export const size = {
  height: 630,
  width: 1200,
};

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

export default async function Image() {
  const fontData = await notoSansKrBoldFontPromise;

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #09111f 0%, #12345a 50%, #b45309 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "58px 64px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at 82% 18%, rgba(245,195,77,0.34), transparent 28%), radial-gradient(circle at 12% 88%, rgba(52,211,153,0.24), transparent 30%)",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            color: "rgba(255,255,255,0.12)",
            display: "flex",
            fontSize: 150,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            position: "absolute",
            right: -24,
            top: 112,
          }}
        >
          1066
        </div>

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
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.62)",
                display: "flex",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              1066friend+
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.78)",
                display: "flex",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              Mobile-first smart wallet network
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 999,
              color: "#fff1cf",
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              padding: "14px 22px",
            }}
          >
            10 USDT activation
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 26,
            maxWidth: 900,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 1.04,
              whiteSpace: "pre-wrap",
            }}
          >
            Global network access with verified wallet activation
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.76)",
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.36,
              maxWidth: 840,
            }}
          >
            Locale-aware landing, referral handoff, BSC USDT verification, and
            member state in one first-party Next.js experience.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            position: "relative",
            width: "100%",
          }}
        >
          {["BSC", "Referral routing", "Webhook confirmed"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 20,
                color: "rgba(255,255,255,0.82)",
                display: "flex",
                fontSize: 22,
                fontWeight: 800,
                padding: "16px 20px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData
        ? {
            fonts: [
              {
                data: fontData,
                name: "FanLetterKR",
                style: "normal" as const,
                weight: 700 as const,
              },
            ],
          }
        : {}),
    },
  );
}
