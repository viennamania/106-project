import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  Coins,
  Crown,
  Globe2,
  Network,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletMinimal,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { LandingMemberContentEntry } from "@/components/landing/landing-member-content-entry";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ReferralAwareCta } from "@/components/landing/referral-aware-cta";
import type { Locale } from "@/lib/i18n";
import type { LandingPageBranding } from "@/lib/landing-branding";
import type { LandingCopy } from "@/lib/marketing-copy";

const LANDING_IMAGE_VERSION = "20260415";

const HERO_WORLD_IMAGE =
  `/landing/global-network-map.png?v=${LANDING_IMAGE_VERSION}`;
const REWARD_PHONE_IMAGE =
  `/landing/premium-phone.png?v=${LANDING_IMAGE_VERSION}`;
const REWARD_BIKE_IMAGE =
  `/landing/electric-bike.png?v=${LANDING_IMAGE_VERSION}`;

export function LandingPage({
  activateHref,
  branding,
  copy,
  disclaimerHref,
  feedHref,
  disclaimerLabel,
  languageLabel,
  locale,
  projectWallet,
}: {
  activateHref: string;
  branding?: LandingPageBranding | null;
  copy: LandingCopy;
  disclaimerHref: string;
  feedHref: string;
  disclaimerLabel: string;
  languageLabel: string;
  locale: Locale;
  projectWallet: string | null;
}) {
  const activeBranding = branding ?? null;
  const heroBadges = activeBranding
    ? [activeBranding.badgeLabel, ...copy.hero.badges.slice(0, 2)]
    : copy.hero.badges;
  const heroTitleSource = activeBranding?.headline ?? copy.hero.title;
  const heroDescription = activeBranding?.description ?? copy.hero.description;
  const primaryCtaLabel = activeBranding?.ctaLabel ?? copy.cta.primary;
  const theme = activeBranding?.theme ?? null;
  const heroSectionStyle: CSSProperties | undefined = theme
    ? {
        backgroundImage: `linear-gradient(180deg,${theme.heroFrom} 0%,${theme.heroTo} 100%)`,
      }
    : undefined;
  const primaryCtaStyle: CSSProperties | undefined = theme
    ? {
        backgroundImage: `linear-gradient(135deg,${theme.buttonFrom} 0%,${theme.buttonMid} 52%,${theme.buttonTo} 100%)`,
        boxShadow: `0 20px 45px ${theme.glow}`,
      }
    : undefined;
  const heroPrimaryCtaStyle: CSSProperties | undefined = theme
    ? {
        backgroundImage: `linear-gradient(135deg,#ffffff 0%,${theme.lightAccent} 52%,${theme.accent} 100%)`,
        boxShadow: `0 28px 70px ${theme.glow}`,
      }
    : undefined;
  const sponsorCardStyle: CSSProperties | undefined = theme
    ? {
        backgroundImage: `linear-gradient(135deg,${theme.sponsorFrom} 0%,${theme.sponsorTo} 100%)`,
        boxShadow: `0 30px 90px ${theme.glow}`,
      }
    : undefined;
  const sponsorBadgeStyle: CSSProperties | undefined = theme
    ? {
        backgroundColor: theme.accentSoft,
        borderColor: theme.glow,
        color: theme.lightAccent,
      }
    : undefined;
  const sponsorCodeStyle: CSSProperties | undefined = theme
    ? {
        backgroundColor: theme.codeSurface,
        borderColor: theme.glow,
      }
    : undefined;
  const koreanHeroTitleHasBrand =
    !activeBranding &&
    locale === "ko" &&
    heroTitleSource.endsWith(" 1066friend+");
  const heroTitle = koreanHeroTitleHasBrand
    ? heroTitleSource.replace(/\s*1066friend\+$/, "")
    : heroTitleSource;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,161,58,0.22),transparent_22%),radial-gradient(circle_at_0%_10%,rgba(255,255,255,0.72),transparent_22%),radial-gradient(circle_at_100%_18%,rgba(15,23,42,0.16),transparent_24%),linear-gradient(180deg,#f6efe3_0%,#fbf7ef_40%,#f7f1e8_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.09),transparent)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <LandingReveal delay={10} variant="soft">
          <header className="glass-card flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/82 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950">
                <WalletMinimal className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="eyebrow">{copy.hero.eyebrow}</p>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-950">
                    1066friend+
                  </p>
                  <p className="text-sm text-slate-600">{copy.meta.description}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <LanguageSwitcher label={languageLabel} locale={locale} />
                <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200/90 bg-slate-50/90 p-2 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                  <HeaderUtilityLink href={disclaimerHref}>
                    {disclaimerLabel}
                  </HeaderUtilityLink>
                </div>
              </div>
              <ReferralAwareCta
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_52%,#b45309_100%)] px-6 text-sm font-semibold !text-white shadow-[0_20px_45px_rgba(15,23,42,0.22)] ring-1 ring-white/15 transition hover:translate-y-[-1px] hover:shadow-[0_26px_55px_rgba(15,23,42,0.28)] sm:min-w-[15rem] sm:w-auto"
                locale={locale}
                style={primaryCtaStyle}
              >
                <span>{primaryCtaLabel}</span>
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/14 text-white ring-1 ring-white/16">
                  <ArrowRight className="size-4" />
                </span>
              </ReferralAwareCta>
            </div>
          </header>
        </LandingReveal>

        <LandingReveal delay={30} variant="soft">
          <LandingMemberContentEntry
            activateHref={activateHref}
            feedHref={feedHref}
            locale={locale}
          />
        </LandingReveal>

        <section
          className="relative overflow-hidden rounded-[34px] border border-[#d5b782]/12 bg-[linear-gradient(180deg,#09111f_0%,#0f172a_38%,#1d2f4b_100%)] px-5 py-6 text-white shadow-[0_38px_120px_rgba(15,23,42,0.3)] sm:rounded-[40px] sm:px-8 sm:py-10"
          style={heroSectionStyle}
        >
          <div
            className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top,rgba(245,204,96,0.2),transparent_68%)]"
            style={
              theme
                ? {
                    backgroundImage: `radial-gradient(circle_at_top,${theme.heroGlow},transparent 68%)`,
                  }
                : undefined
            }
          />
          <div
            className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(131,169,238,0.18),transparent_70%)] blur-2xl"
            style={
              theme
                ? {
                    backgroundImage: `radial-gradient(circle,${theme.heroGlowSecondary},transparent 70%)`,
                  }
                : undefined
            }
          />
          <div
            className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(228,181,80,0.18),transparent_72%)] blur-2xl"
            style={
              theme
                ? {
                    backgroundImage: `radial-gradient(circle,${theme.heroGlow},transparent 72%)`,
                  }
                : undefined
            }
          />

          <LandingReveal delay={40} variant="hero">
            <div className="relative mx-auto max-w-4xl text-center">
              <div className="flex flex-wrap justify-center gap-2">
                {heroBadges.map((badge, index) => (
                  <HeroPill key={`${badge}-${index}`}>{badge}</HeroPill>
                ))}
              </div>

              <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/58 sm:mt-6 sm:text-xs sm:tracking-[0.28em]">
                {copy.hero.eyebrow}
              </p>
              {koreanHeroTitleHasBrand ? (
                <div className="mt-4 flex justify-center sm:mt-5">
                  <span className="inline-flex items-center rounded-full border border-[#f5c34d]/24 bg-[#f5c34d]/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#ffe9b0] shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                    1066friend+
                  </span>
                </div>
              ) : null}
              {activeBranding ? (
                <div className="mt-6 flex justify-center">
                  <div
                    className="w-full max-w-2xl rounded-[30px] border border-white/12 px-5 py-5 text-left backdrop-blur sm:px-6"
                    style={sponsorCardStyle}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
                        style={sponsorBadgeStyle}
                      >
                        {activeBranding.brandedExperienceLabel}
                      </span>
                      {activeBranding.referralCode ? (
                        <span
                          className="inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/76"
                          style={sponsorCodeStyle}
                        >
                          {activeBranding.referralCodeLabel}:{" "}
                          {activeBranding.referralCode}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/56">
                      {activeBranding.sharedByLabel}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                      {activeBranding.brandName}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/72">
                      {copy.hero.note}
                    </p>
                  </div>
                </div>
              ) : null}
              {activeBranding?.heroImageUrl ? (
                <div className="mt-6 flex justify-center">
                  <div
                    className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/12 bg-black/20 shadow-[0_30px_90px_rgba(15,23,42,0.24)]"
                    style={
                      theme
                        ? {
                            boxShadow: `0 30px 90px ${theme.glow}`,
                          }
                        : undefined
                    }
                  >
                    <div
                      className="h-56 w-full bg-cover bg-center sm:h-72"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.28)), url(${activeBranding.heroImageUrl})`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
              <h1
                className={`mx-auto mt-3 font-semibold tracking-tight text-white ${
                  locale === "ko"
                    ? "max-w-[10ch] break-keep text-[1.9rem] leading-[1.02] sm:mt-5 sm:max-w-[11ch] sm:text-[4rem] sm:leading-[0.96] lg:text-[4.7rem] xl:text-[5.1rem]"
                    : "sm:mt-4 max-w-4xl text-[2.15rem] leading-[0.94] sm:text-6xl sm:leading-[0.92]"
                }`}
              >
                {heroTitle}
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-[0.97rem] leading-7 text-white/76 sm:mt-5 sm:text-lg">
                {heroDescription}
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-white/56">
                {copy.hero.note}
              </p>

              <div className="mt-8 flex flex-col items-center gap-3">
                <ReferralAwareCta
                  className="group inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(135deg,#fff9dd_0%,#ffffff_48%,#f5c34d_100%)] px-7 text-base font-semibold !text-slate-950 shadow-[0_28px_70px_rgba(245,195,77,0.26)] ring-1 ring-white/16 transition hover:translate-y-[-1px] hover:shadow-[0_34px_80px_rgba(245,195,77,0.32)] sm:min-w-[18rem] sm:w-auto"
                  locale={locale}
                  style={heroPrimaryCtaStyle}
                >
                  <span>{primaryCtaLabel}</span>
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.2)] transition group-hover:translate-x-0.5">
                    <ArrowRight className="size-4" />
                  </span>
                </ReferralAwareCta>
                <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:justify-center">
                  <a
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 text-sm font-semibold text-white/88 transition hover:bg-white/12 sm:w-auto"
                    href="#profit-structure"
                  >
                    {copy.cta.secondary}
                  </a>
                </div>
              </div>
            </div>
          </LandingReveal>

          <LandingReveal delay={120} variant="soft">
            <div className="relative mt-7 overflow-hidden rounded-[24px] border border-[#d6bb8a]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur sm:mt-8 sm:rounded-[28px]">
              <Image
                alt="Global network visualization inspired by the Gamma reference"
                className="h-56 w-full rounded-[20px] object-cover object-center sm:h-72 sm:rounded-[24px]"
                height={1664}
                sizes="(max-width: 640px) 100vw, 960px"
                src={HERO_WORLD_IMAGE}
                width={1248}
              />
            </div>
          </LandingReveal>

          <div className="relative mt-4 grid grid-cols-2 gap-3 sm:mt-6 md:grid-cols-2 xl:grid-cols-4">
            {copy.metrics.map((metric, index) => (
                <LandingReveal delay={150 + index * 70} key={metric.label} variant="soft">
                <HeroMetricCard {...metric} locale={locale} />
              </LandingReveal>
            ))}
          </div>

          <LandingReveal delay={240} variant="soft">
            <div className="relative mt-4 rounded-[24px] border border-[#d5b782]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 backdrop-blur sm:mt-5 sm:rounded-[26px] sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#cbb07d]">
                    PROJECT_WALLET
                  </p>
                  <p className="mt-3 break-all text-sm font-semibold text-white">
                    {projectWallet ?? "Not configured yet"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#d5b782]/14 bg-black/18 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#d8bd89]">
                    Activation Flow
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {copy.finalCta.note}
                  </p>
                </div>
              </div>
            </div>
          </LandingReveal>
        </section>

        <SalesSection>
          <SectionIntro
            description={copy.rewards.description}
            eyebrow={copy.rewards.eyebrow}
            title={copy.rewards.title}
          />

          <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {copy.rewards.cards.map((card, index) => (
                <LandingReveal delay={index * 90} key={card.title}>
                  <RewardVisualCard
                    description={card.description}
                    icon={
                      index === 0 ? (
                        <Smartphone className="size-5" />
                      ) : (
                        <Bike className="size-5" />
                      )
                    }
                    imageAlt={card.title}
                    imageSrc={index === 0 ? REWARD_PHONE_IMAGE : REWARD_BIKE_IMAGE}
                    title={card.title}
                  />
                </LandingReveal>
              ))}
            </div>

            <LandingReveal delay={120} variant="soft">
              <div className="rounded-[30px] border border-[#d4b680]/14 bg-[linear-gradient(180deg,#0f172a,#172554)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[#d8bd89]">
                  {copy.rewards.liquidityTitle}
                </p>
                <div className="mt-5 space-y-3">
                  {copy.rewards.liquiditySteps.map((step, index) => (
                    <LandingReveal delay={180 + index * 60} key={step.title} variant="soft">
                      <div className="grid grid-cols-[auto_1fr] gap-3 rounded-[22px] border border-white/10 bg-white/7 p-4">
                        <div className="flex size-9 items-center justify-center rounded-full border border-[#d4b680]/30 bg-white/10 text-sm font-semibold text-[#f7dfb1]">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold tracking-tight text-white">
                            {step.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/68">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </LandingReveal>
                  ))}
                </div>

                <div className="mt-5 rounded-[22px] border border-white/10 bg-black/12 px-4 py-5">
                  <p className="text-sm leading-7 text-white/72">
                    {copy.finalCta.note}
                  </p>
                </div>
              </div>
            </LandingReveal>
          </div>
        </SalesSection>

        <SalesSection>
          <SectionIntro
            description={copy.overview.description}
            eyebrow={copy.overview.eyebrow}
            title={copy.overview.title}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {copy.overview.cards.map((card, index) => (
              <LandingReveal delay={index * 80} key={card.title}>
                <NarrativeCard
                  description={card.description}
                  icon={
                    index === 0 ? (
                      <Sparkles className="size-5" />
                    ) : index === 1 ? (
                      <Crown className="size-5" />
                    ) : (
                      <Globe2 className="size-5" />
                    )
                  }
                  title={card.title}
                />
              </LandingReveal>
            ))}
          </div>
        </SalesSection>

        <SalesSection className="bg-[linear-gradient(180deg,rgba(255,248,232,0.98),rgba(255,255,255,0.96))]">
          <SectionIntro
            description={copy.engine.description}
            eyebrow={copy.engine.eyebrow}
            title={copy.engine.title}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {copy.engine.cards.map((card, index) => (
              <LandingReveal delay={index * 90} key={card.title}>
                <NumberedCard
                  description={card.description}
                  icon={
                    index === 0 ? (
                      <Network className="size-5" />
                    ) : index === 1 ? (
                      <Coins className="size-5" />
                    ) : (
                      <ShieldCheck className="size-5" />
                    )
                  }
                  number={index + 1}
                  title={card.title}
                />
              </LandingReveal>
            ))}
          </div>
        </SalesSection>

        <SalesSection id="profit-structure">
          <SectionIntro
            description={copy.generations.description}
            eyebrow={copy.generations.eyebrow}
            title={copy.generations.title}
          />

          <LandingReveal variant="soft">
            <div className="overflow-hidden rounded-[24px] border border-[#dcc6a0] bg-[linear-gradient(180deg,#fffaf0,#fffefb)] shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:rounded-[30px]">
              <div className="border-b border-[#eadcc3] bg-[linear-gradient(90deg,#fff7e7,#fffefb)] px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f7342]">
                      Generation Matrix
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {copy.generations.description}
                    </p>
                  </div>
                  <div className="rounded-full border border-[#e7d6b7] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-800">
                    6 x 6 Engine
                  </div>
                </div>
              </div>
              <div className="grid gap-3 p-4 sm:hidden">
                {copy.generations.rows.map((row, index) => (
                  <div
                    className="rounded-[22px] border border-[#ead7b5] bg-white/95 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                    key={`${row.generation}-mobile`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#ead7b5] bg-[#fffaf0] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-800">
                          <span className="flex size-6 items-center justify-center rounded-full bg-slate-950 text-[0.62rem] font-semibold text-[#f5deb0]">
                            {index + 1}
                          </span>
                          {row.generation}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <MobileGenerationMetric
                        label={copy.generations.columns.people}
                        locale={locale}
                        value={row.people}
                      />
                      <MobileGenerationMetric
                        accent
                        label={copy.generations.columns.points}
                        locale={locale}
                        value={row.points}
                      />
                    </div>

                    <div className="mt-3 rounded-[18px] border border-[#efe2cc] bg-[#fff9ef] px-3 py-3">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#8d7142]">
                        {copy.generations.columns.remark}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {row.remark}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full text-left">
                  <thead className="bg-[linear-gradient(90deg,#0f172a,#1e293b)] text-[#f7e8c8]">
                    <tr>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em]">
                        {copy.generations.columns.generation}
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.22em]">
                        {copy.generations.columns.people}
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.22em]">
                        {copy.generations.columns.points}
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em]">
                        {copy.generations.columns.remark}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {copy.generations.rows.map((row, index) => (
                      <tr
                        className="border-b border-[#efe2cc] bg-white/92 last:border-b-0 odd:bg-[#fff9ef]"
                        key={row.generation}
                      >
                        <td className="px-5 py-4 text-sm font-semibold text-slate-950">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead7b5] bg-white px-3 py-2 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
                            <span className="flex size-7 items-center justify-center rounded-full bg-slate-950 text-[0.65rem] font-semibold text-[#f5deb0]">
                              {index + 1}
                            </span>
                            <span>{row.generation}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-slate-700">
                          <div className="inline-flex min-w-[7rem] items-center justify-end rounded-full border border-[#ead7b5] bg-white px-3 py-2 font-semibold text-slate-950 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
                            <AnimatedNumberText locale={locale} value={row.people} />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-slate-700">
                          <div className="inline-flex min-w-[7rem] items-center justify-end rounded-full border border-[#d6bb8a] bg-[linear-gradient(180deg,#fff8e8,#fff1cf)] px-3 py-2 font-semibold text-slate-950 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
                            <AnimatedNumberText locale={locale} value={row.points} />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm leading-6 text-slate-600">
                          {row.remark}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </LandingReveal>

          <LandingReveal delay={80} variant="soft">
            <div className="rounded-[30px] border border-[#d4b680]/14 bg-[linear-gradient(180deg,#111827,#0f172a)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
              <div className="mx-auto max-w-4xl text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-[#d8bd89]">
                  {copy.generations.insightLabel}
                </p>
                <p className="mt-4 text-base leading-8 text-white/74 sm:text-lg">
                  {copy.generations.insight}
                </p>
              </div>
            </div>
          </LandingReveal>

          <div className="grid gap-4 md:grid-cols-3">
            {copy.generations.totals.map((total, index) => (
              <LandingReveal delay={120 + index * 80} key={total.label}>
                <FinalMetricCard {...total} locale={locale} />
              </LandingReveal>
            ))}
          </div>
        </SalesSection>

        <section className="relative overflow-hidden rounded-[34px] border border-[#d4b680]/14 bg-[linear-gradient(180deg,#111827_0%,#172334_55%,#1f2937_100%)] px-5 py-7 text-white shadow-[0_28px_100px_rgba(15,23,42,0.26)] sm:rounded-[38px] sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.22),transparent_70%)]" />
          <LandingReveal variant="hero">
            <div className="relative mx-auto max-w-4xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/50">
                {copy.finalCta.eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                {copy.finalCta.title}
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/74">
                {copy.finalCta.description}
              </p>
            </div>
          </LandingReveal>

          <div className="relative mt-7 grid gap-4 md:grid-cols-3">
            {copy.generations.totals.map((total, index) => (
              <LandingReveal delay={80 + index * 80} key={total.label}>
                <DarkSummaryCard {...total} locale={locale} />
              </LandingReveal>
            ))}
          </div>

          <LandingReveal delay={220} variant="soft">
            <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <ReferralAwareCta
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.12)] transition hover:bg-slate-100"
                locale={locale}
                style={heroPrimaryCtaStyle}
              >
                {primaryCtaLabel}
                <ArrowRight className="size-4" />
              </ReferralAwareCta>
            </div>
          </LandingReveal>
        </section>
      </main>
    </div>
  );
}

function MobileGenerationMetric({
  accent = false,
  label,
  locale,
  value,
}: {
  accent?: boolean;
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div
      className={
        accent
          ? "flex items-center justify-between gap-3 rounded-[18px] border border-[#d6bb8a] bg-[linear-gradient(180deg,#fff8e8,#fff1cf)] px-3 py-3"
          : "flex items-center justify-between gap-3 rounded-[18px] border border-[#ead7b5] bg-white px-3 py-3"
      }
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {label}
      </p>
      <p className="text-right text-base font-semibold tracking-tight text-slate-950">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
    </div>
  );
}

function SalesSection({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      className={`glass-card rounded-[28px] border border-[#eadcc3]/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.98),rgba(255,255,255,0.96))] p-5 shadow-[0_20px_55px_rgba(15,23,42,0.05)] sm:rounded-[34px] sm:p-7 ${className ?? ""}`}
      id={id}
    >
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function HeaderUtilityLink({
  children,
  href,
  icon,
}: {
  children: ReactNode;
  href: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
      href={href}
    >
      {icon}
      {children}
    </Link>
  );
}

function SectionIntro({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <LandingReveal variant="soft">
      <div className="mx-auto max-w-3xl text-left sm:text-center">
        <p className="eyebrow text-[#8d7142]">{eyebrow}</p>
        <h2 className="mt-3 text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      </div>
    </LandingReveal>
  );
}

function HeroPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#d8bc87]/18 bg-white/8 px-3 py-2 text-xs font-medium text-white/78 backdrop-blur">
      {children}
    </div>
  );
}

function HeroMetricCard({
  hint,
  label,
  locale,
  value,
}: {
  hint: string;
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#d6bb8a]/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur sm:rounded-[24px]">
      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[#d7be8d] sm:text-xs sm:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-white/64 sm:text-sm">{hint}</p>
      ) : null}
    </div>
  );
}

function NarrativeCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#ebddc5] bg-[linear-gradient(180deg,#fffdf7,#fff7ea)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#2b3548)] text-[#f5ddb0]">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function NumberedCard({
  description,
  icon,
  number,
  title,
}: {
  description: string;
  icon: ReactNode;
  number: number;
  title: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#ebddc5] bg-[linear-gradient(180deg,#fffdf8,#fff8ed)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex size-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#111827,#2b3548)] text-sm font-semibold text-[#f5ddb0]">
          {number}
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#fff6e0,#ffe9b6)] text-slate-950">
          {icon}
        </div>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function RewardVisualCard({
  description,
  icon,
  imageAlt,
  imageSrc,
  title,
}: {
  description: string;
  icon: ReactNode;
  imageAlt: string;
  imageSrc: string;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#ebddc5] bg-[linear-gradient(180deg,#fffdfa,#fff7ea)] shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <Image
        alt={imageAlt}
        className="h-52 w-full object-cover object-center"
        height={imageSrc === REWARD_PHONE_IMAGE ? 1088 : 1088}
        sizes="(max-width: 768px) 100vw, 50vw"
        src={imageSrc}
        width={imageSrc === REWARD_PHONE_IMAGE ? 1920 : 1920}
      />
      <div className="p-5 sm:p-6">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#2b3548)] text-[#f5ddb0]">
          {icon}
        </div>
        <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function FinalMetricCard({
  hint,
  label,
  locale,
  value,
}: {
  hint: string;
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#ebddc5] bg-[linear-gradient(180deg,#fff8ea,#fffefc)] p-5 text-right shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-[#8d7142]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
      {hint ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p>
      ) : null}
    </div>
  );
}

function DarkSummaryCard({
  hint,
  label,
  locale,
  value,
}: {
  hint: string;
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div className="flex min-h-[12.5rem] flex-col justify-between rounded-[22px] border border-[#d6bb8a]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 text-right sm:min-h-[13.5rem] sm:rounded-[24px]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#d8bd89]">{label}</p>
        <p className="mt-3 text-[1.8rem] font-semibold tracking-tight text-white sm:text-3xl">
          <AnimatedNumberText locale={locale} value={value} />
        </p>
      </div>
      {hint ? (
        <p className="mt-4 text-sm leading-6 text-white/62">{hint}</p>
      ) : (
        <div className="mt-4 min-h-[1.5rem]" aria-hidden="true" />
      )}
    </div>
  );
}
