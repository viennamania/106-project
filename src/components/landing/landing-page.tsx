import Image from "next/image";
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
import type { ReactNode } from "react";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ReferralAwareCta } from "@/components/landing/referral-aware-cta";
import type { Locale } from "@/lib/i18n";
import type { LandingCopy } from "@/lib/marketing-copy";

const HERO_WORLD_IMAGE =
  "/landing/global-network-map.png";
const REWARD_PHONE_IMAGE =
  "/landing/premium-phone.png";
const REWARD_BIKE_IMAGE =
  "/landing/electric-bike.png";

export function LandingPage({
  copy,
  languageLabel,
  locale,
  projectWallet,
}: {
  copy: LandingCopy;
  languageLabel: string;
  locale: Locale;
  projectWallet: string | null;
}) {
  const koreanHeroTitleHasBrand =
    locale === "ko" && copy.hero.title.endsWith(" 1066friend+");
  const koreanHeroLead = koreanHeroTitleHasBrand
    ? copy.hero.title.replace(/\s*1066friend\+$/, "")
    : copy.hero.title;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.18),transparent_22%),radial-gradient(circle_at_0%_10%,rgba(255,255,255,0.66),transparent_22%),radial-gradient(circle_at_100%_22%,rgba(30,41,59,0.14),transparent_22%),linear-gradient(180deg,#f7f2e8_0%,#fbf7ef_42%,#f6f2eb_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.08),transparent)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <LandingReveal delay={10} variant="soft">
          <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950">
                <WalletMinimal className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="eyebrow">{copy.hero.eyebrow}</p>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-950">
                    1066friend+
                  </p>
                  <p className="text-sm text-slate-600">{copy.meta.description}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <LanguageSwitcher label={languageLabel} locale={locale} />
              <ReferralAwareCta
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                locale={locale}
              >
                {copy.cta.primary}
                <ArrowRight className="size-4" />
              </ReferralAwareCta>
            </div>
          </header>
        </LandingReveal>

        <section className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#111827_0%,#0f172a_45%,#1e293b_100%)] px-5 py-6 text-white shadow-[0_32px_120px_rgba(15,23,42,0.28)] sm:rounded-[40px] sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_68%)]" />
          <div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.18),transparent_70%)] blur-2xl" />
          <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.14),transparent_72%)] blur-2xl" />

          <LandingReveal delay={40} variant="hero">
            <div className="relative mx-auto max-w-4xl text-center">
              <div className="flex flex-wrap justify-center gap-2">
                {copy.hero.badges.map((badge) => (
                  <HeroPill key={badge}>{badge}</HeroPill>
                ))}
              </div>

              <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/58 sm:mt-6 sm:text-xs sm:tracking-[0.28em]">
                {copy.hero.eyebrow}
              </p>
              <h1
                className={`mx-auto mt-3 font-semibold tracking-tight text-white sm:mt-4 sm:max-w-4xl sm:text-6xl sm:leading-[0.92] ${
                  locale === "ko"
                    ? "max-w-[12ch] break-keep text-[1.9rem] leading-[1.02]"
                    : "max-w-4xl text-[2.15rem] leading-[0.94]"
                }`}
              >
                {koreanHeroTitleHasBrand ? (
                  <>
                    <span>{koreanHeroLead}</span>
                    <span className="mt-2 block text-[1.75rem] leading-none tracking-[-0.04em] sm:mt-0 sm:inline sm:text-inherit sm:leading-inherit sm:tracking-tight">
                      1066friend+
                    </span>
                  </>
                ) : (
                  copy.hero.title
                )}
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-[0.97rem] leading-7 text-white/76 sm:mt-5 sm:text-lg">
                {copy.hero.description}
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-white/56">
                {copy.hero.note}
              </p>

              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
                <ReferralAwareCta
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.12)] transition hover:bg-slate-100 sm:w-auto"
                  locale={locale}
                >
                  {copy.cta.primary}
                  <ArrowRight className="size-4" />
                </ReferralAwareCta>
                <a
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 sm:w-auto"
                  href="#profit-structure"
                >
                  {copy.cta.secondary}
                </a>
              </div>
            </div>
          </LandingReveal>

          <LandingReveal delay={120} variant="soft">
            <div className="relative mt-7 overflow-hidden rounded-[24px] border border-white/10 bg-white/6 p-2 backdrop-blur sm:mt-8 sm:rounded-[28px]">
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
            <div className="relative mt-4 rounded-[24px] border border-white/10 bg-white/7 p-4 backdrop-blur sm:mt-5 sm:rounded-[26px] sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                    PROJECT_WALLET
                  </p>
                  <p className="mt-3 break-all text-sm font-semibold text-white">
                    {projectWallet ?? "Not configured yet"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-black/12 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/48">
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

        <SalesSection className="bg-[linear-gradient(180deg,rgba(255,249,230,0.96),rgba(255,255,255,0.94))]">
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
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:rounded-[30px]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-950 text-white">
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
                    {copy.generations.rows.map((row) => (
                      <tr
                        className="border-b border-slate-200 last:border-b-0"
                        key={row.generation}
                      >
                        <td className="px-5 py-4 text-sm font-semibold text-slate-950">
                          {row.generation}
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-slate-700">
                          <AnimatedNumberText locale={locale} value={row.people} />
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-slate-700">
                          <AnimatedNumberText locale={locale} value={row.points} />
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
            <div className="rounded-[30px] bg-[linear-gradient(180deg,#111827,#0f172a)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
              <div className="mx-auto max-w-4xl text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">
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
              <div className="rounded-[30px] bg-[linear-gradient(180deg,#0f172a,#172554)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  {copy.rewards.liquidityTitle}
                </p>
                <div className="mt-5 space-y-3">
                  {copy.rewards.liquiditySteps.map((step, index) => (
                    <LandingReveal delay={180 + index * 60} key={step.title} variant="soft">
                      <div className="rounded-[22px] border border-white/10 bg-white/7 p-4">
                        <p className="text-sm font-semibold tracking-tight text-white">
                          {step.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/68">
                          {step.description}
                        </p>
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

        <section className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)] px-5 py-7 text-white shadow-[0_28px_100px_rgba(15,23,42,0.26)] sm:rounded-[38px] sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_70%)]" />
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
              >
                {copy.cta.primary}
                <ArrowRight className="size-4" />
              </ReferralAwareCta>
            </div>
          </LandingReveal>
        </section>
      </main>
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
      className={`glass-card rounded-[28px] p-5 sm:rounded-[34px] sm:p-7 ${className ?? ""}`}
      id={id}
    >
      <div className="space-y-6">{children}</div>
    </section>
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
        <p className="eyebrow">{eyebrow}</p>
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
    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-medium text-white/74 backdrop-blur">
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
    <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 text-right backdrop-blur sm:rounded-[24px]">
      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/48 sm:text-xs sm:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
      <p className="mt-2 text-xs text-white/58 sm:text-sm">{hint}</p>
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
    <div className="rounded-[28px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
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
    <div className="rounded-[28px] border border-slate-200 bg-white/94 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex size-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
          {number}
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-slate-950">
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
    <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/94 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <Image
        alt={imageAlt}
        className="h-52 w-full object-cover object-center"
        height={imageSrc === REWARD_PHONE_IMAGE ? 1088 : 1088}
        sizes="(max-width: 768px) 100vw, 50vw"
        src={imageSrc}
        width={imageSrc === REWARD_PHONE_IMAGE ? 1920 : 1920}
      />
      <div className="p-5 sm:p-6">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
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
    <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,#fffaf0,#ffffff)] p-5 text-right shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p>
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
    <div className="rounded-[22px] border border-white/10 bg-white/7 p-5 text-right sm:rounded-[24px]">
      <p className="text-xs uppercase tracking-[0.2em] text-white/48">{label}</p>
      <p className="mt-3 text-[1.8rem] font-semibold tracking-tight text-white sm:text-3xl">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
      <p className="mt-2 text-sm leading-6 text-white/62">{hint}</p>
    </div>
  );
}
