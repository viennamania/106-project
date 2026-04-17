import { ImageResponse } from "next/og";

import { getReferralLandingExperience } from "@/lib/landing-branding-service";
import { getLandingBrandTheme } from "@/lib/landing-branding";
import {
  defaultLocale,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import { getLandingCopy } from "@/lib/marketing-copy";
import { normalizeReferralCode } from "@/lib/member";

export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const localeInput = url.searchParams.get("lang") ?? defaultLocale;
  const locale = (hasLocale(localeInput) ? localeInput : defaultLocale) as Locale;
  const referralCode = normalizeReferralCode(url.searchParams.get("ref"));
  const copy = getLandingCopy(locale);
  const experience = await getReferralLandingExperience(locale, referralCode);
  const branding = experience.branding;
  const theme = branding?.theme ?? getLandingBrandTheme();
  const title = branding?.headline ?? copy.hero.title;
  const description = branding?.description ?? copy.hero.description;
  const ctaLabel = branding?.ctaLabel ?? copy.cta.primary;
  const topRightLabel = branding
    ? `${branding.sharedByLabel}: ${branding.brandName}`
    : copy.hero.badges[0] ?? copy.hero.eyebrow;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: `linear-gradient(135deg, ${theme.previewFrom} 0%, ${theme.previewTo} 100%)`,
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "54px 58px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: `radial-gradient(circle at top right, ${theme.glow}, transparent 34%), radial-gradient(circle at bottom left, ${theme.accentSoft}, transparent 38%)`,
            inset: 0,
            position: "absolute",
          }}
        />

        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: 28,
            justifyContent: "space-between",
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 520,
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.56)",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              1066friend+
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.74)",
                fontSize: 22,
                lineHeight: 1.35,
              }}
            >
              {branding?.brandedExperienceLabel ?? copy.hero.eyebrow}
            </div>
          </div>

          {branding?.heroImageUrl ? (
            <div
              style={{
                alignItems: "flex-end",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxWidth: 300,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 600,
                  justifyContent: "center",
                  maxWidth: 300,
                  padding: "14px 20px",
                  textAlign: "center",
                }}
              >
                {topRightLabel}
              </div>
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 28,
                  display: "flex",
                  height: 180,
                  overflow: "hidden",
                  width: 300,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- next/og ImageResponse requires a plain img for remote Blob assets. */}
                <img
                  alt={branding.brandName}
                  height="180"
                  src={branding.heroImageUrl}
                  style={{
                    display: "flex",
                    height: "100%",
                    objectFit: "cover",
                    width: "100%",
                  }}
                  width="300"
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                alignItems: "center",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                display: "flex",
                fontSize: 20,
                fontWeight: 600,
                maxWidth: 460,
                padding: "14px 20px",
              }}
            >
              {topRightLabel}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            maxWidth: branding?.heroImageUrl ? 780 : 980,
            position: "relative",
          }}
        >
          {branding ? (
            <div
              style={{
                alignItems: "center",
                alignSelf: "flex-start",
                background: theme.accentSoft,
                border: `1px solid ${theme.glow}`,
                borderRadius: 999,
                color: theme.lightAccent,
                display: "flex",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "12px 18px",
                textTransform: "uppercase",
              }}
            >
              {branding.badgeLabel}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              lineHeight: 1.04,
              maxWidth: 980,
              whiteSpace: "pre-wrap",
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "rgba(255,255,255,0.76)",
              display: "flex",
              fontSize: 28,
              lineHeight: 1.42,
              maxWidth: 920,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            alignItems: "flex-end",
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
              gap: 12,
              maxWidth: 520,
            }}
          >
            {branding?.referralCode ? (
              <>
                <div
                  style={{
                    color: "rgba(255,255,255,0.56)",
                    display: "flex",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {branding.referralCodeLabel}
                </div>
                <div
                  style={{
                    background: theme.codeSurface,
                    border: `1px solid ${theme.glow}`,
                    borderRadius: 999,
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 700,
                    padding: "14px 20px",
                  }}
                >
                  {branding.referralCode}
                </div>
              </>
            ) : (
              <div
                style={{
                  color: "rgba(255,255,255,0.68)",
                  display: "flex",
                  fontSize: 24,
                  lineHeight: 1.35,
                }}
              >
                {copy.meta.title}
              </div>
            )}
          </div>

          <div
            style={{
              alignItems: "center",
              background: `linear-gradient(135deg, ${theme.buttonFrom} 0%, ${theme.buttonMid} 52%, ${theme.buttonTo} 100%)`,
              borderRadius: 999,
              boxShadow: `0 24px 60px ${theme.glow}`,
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              justifyContent: "center",
              maxWidth: 360,
              padding: "18px 28px",
              textAlign: "center",
            }}
          >
            {ctaLabel}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
