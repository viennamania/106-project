import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
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

import { LanguageSwitcher } from "@/components/language-switcher";
import { ReferralAwareCta } from "@/components/landing/referral-aware-cta";
import type { Locale } from "@/lib/i18n";
import type { LandingCopy } from "@/lib/marketing-copy";
import { cn } from "@/lib/utils";

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
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,168,108,0.24),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.16),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.08),transparent)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
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
            <Link
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              href={`/${locale}/referrals`}
            >
              {copy.cta.referrals}
            </Link>
            <ReferralAwareCta
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
              locale={locale}
            >
              {copy.cta.primary}
              <ArrowRight className="size-4" />
            </ReferralAwareCta>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
          <div className="glass-card relative overflow-hidden rounded-[38px] px-6 py-7 sm:px-7 sm:py-8">
            <div className="absolute inset-x-8 top-0 h-36 rounded-full bg-[radial-gradient(circle,rgba(201,168,108,0.22),transparent_72%)] blur-3xl" />
            <div className="relative space-y-6">
              <div className="flex flex-wrap gap-2">
                {copy.hero.badges.map((badge) => (
                  <Pill key={badge}>{badge}</Pill>
                ))}
              </div>

              <div className="space-y-4">
                <p className="eyebrow">{copy.hero.eyebrow}</p>
                <h1 className="max-w-4xl text-[2.65rem] font-semibold leading-[0.96] tracking-tight text-slate-950 sm:text-6xl">
                  {copy.hero.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                  {copy.hero.description}
                </p>
                <p className="max-w-3xl text-sm leading-6 text-slate-500">
                  {copy.hero.note}
                </p>
              </div>

              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <ReferralAwareCta
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold !text-white shadow-[0_22px_40px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                  locale={locale}
                >
                  {copy.cta.primary}
                  <ArrowRight className="size-4" />
                </ReferralAwareCta>
                <a
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                  href="#profit-structure"
                >
                  {copy.cta.secondary}
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {copy.metrics.map((metric) => (
                  <MetricCard key={metric.label} {...metric} />
                ))}
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[38px] bg-[linear-gradient(180deg,#0f172a,#111827_60%,#172554)] p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:p-7">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_70%)]" />
            <div className="relative space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-white/55">
                  {copy.generations.insightLabel}
                </p>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-[2.2rem]">
                  {copy.generations.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/74">
                  {copy.generations.insight}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {copy.generations.totals.map((total) => (
                  <DarkMetricCard key={total.label} {...total} />
                ))}
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                  PROJECT_WALLET
                </p>
                <p className="mt-3 break-all text-sm font-semibold text-white">
                  {projectWallet ?? "Not configured yet"}
                </p>
                <div className="mt-5 rounded-[22px] bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Activation Flow
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {copy.finalCta.note}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <LandingSection
          description={copy.overview.description}
          eyebrow={copy.overview.eyebrow}
          title={copy.overview.title}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {copy.overview.cards.map((card, index) => (
              <FeatureCard
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
                key={card.title}
                title={card.title}
              />
            ))}
          </div>
        </LandingSection>

        <LandingSection
          description={copy.engine.description}
          eyebrow={copy.engine.eyebrow}
          title={copy.engine.title}
        >
          <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="grid gap-4 md:grid-cols-3">
              {copy.engine.cards.map((card, index) => (
                <FeatureCard
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
                  key={card.title}
                  title={card.title}
                />
              ))}
            </div>

            <div className="rounded-[30px] bg-[linear-gradient(180deg,#fff8e5,#fff4d8)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="eyebrow">Core Momentum</p>
              <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-950">
                6 x 6 x 6
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {copy.engine.description}
              </p>
              <div className="mt-6 space-y-3">
                {copy.engine.cards.map((card) => (
                  <div
                    className="flex items-start gap-3 rounded-[22px] border border-slate-200/90 bg-white/85 px-4 py-4"
                    key={card.title}
                  >
                    <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                      <BadgeCheck className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {card.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {card.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection
          description={copy.generations.description}
          eyebrow={copy.generations.eyebrow}
          id="profit-structure"
          title={copy.generations.title}
        >
          <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
            <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em]">
                        {copy.generations.columns.generation}
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em]">
                        {copy.generations.columns.people}
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em]">
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
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {row.people}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {row.points}
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

            <div className="rounded-[30px] bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                {copy.generations.insightLabel}
              </p>
              <p className="mt-4 text-base leading-7 text-white/72">
                {copy.generations.insight}
              </p>
              <div className="mt-6 grid gap-3">
                {copy.generations.totals.map((total) => (
                  <div
                    className="rounded-[22px] border border-white/10 bg-white/7 p-4"
                    key={total.label}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {total.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {total.value}
                    </p>
                    <p className="mt-1 text-sm text-white/62">{total.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection
          description={copy.rewards.description}
          eyebrow={copy.rewards.eyebrow}
          title={copy.rewards.title}
        >
          <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {copy.rewards.cards.map((card, index) => (
                <FeatureCard
                  description={card.description}
                  icon={
                    index === 0 ? (
                      <Smartphone className="size-5" />
                    ) : (
                      <Bike className="size-5" />
                    )
                  }
                  key={card.title}
                  title={card.title}
                />
              ))}
            </div>

            <div className="rounded-[30px] bg-[linear-gradient(180deg,#0f172a,#172554)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                {copy.rewards.liquidityTitle}
              </p>
              <div className="mt-5 space-y-3">
                {copy.rewards.liquiditySteps.map((step) => (
                  <div
                    className="rounded-[22px] border border-white/10 bg-white/7 p-4"
                    key={step.title}
                  >
                    <p className="text-sm font-semibold tracking-tight text-white">
                      {step.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </LandingSection>

        <section className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="glass-card rounded-[36px] p-6 sm:p-7">
            <p className="eyebrow">{copy.finalCta.eyebrow}</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {copy.finalCta.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {copy.finalCta.description}
            </p>
            <div className="mt-6 space-y-3">
              {copy.finalCta.bullets.map((bullet) => (
                <div className="flex items-start gap-3" key={bullet}>
                  <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                    <BadgeCheck className="size-3.5" />
                  </span>
                  <p className="text-sm leading-7 text-slate-700">{bullet}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              <ReferralAwareCta
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold !text-white shadow-[0_20px_38px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                locale={locale}
              >
                {copy.cta.primary}
                <ArrowRight className="size-4" />
              </ReferralAwareCta>
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                href={`/${locale}/referrals`}
              >
                {copy.cta.referrals}
              </Link>
            </div>
          </div>

          <div className="rounded-[36px] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              PROJECT_WALLET
            </p>
            <p className="mt-3 break-all text-sm font-semibold text-slate-950">
              {projectWallet ?? "Not configured yet"}
            </p>

            <div className="mt-6 rounded-[26px] bg-[linear-gradient(180deg,#fff9e8,#ffffff)] p-5">
              <p className="eyebrow">{copy.finalCta.eyebrow}</p>
              <div className="mt-4 space-y-4">
                {copy.metrics.map((metric) => (
                  <SummaryRow
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LandingSection({
  children,
  description,
  eyebrow,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  eyebrow: string;
  id?: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        "glass-card rounded-[34px] p-6 sm:p-7",
        id && "scroll-mt-24 sm:scroll-mt-28",
      )}
      id={id}
    >
      <div className="mb-6 max-w-3xl space-y-3">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="text-base leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function DarkMetricCard({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/7 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/48">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-sm leading-6 text-white/62">{hint}</p>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur">
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function FeatureCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
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
