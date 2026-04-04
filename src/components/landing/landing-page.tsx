import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  Network,
  ShieldCheck,
  WalletMinimal,
} from "lucide-react";

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_24%),radial-gradient(circle_at_82%_8%,rgba(16,185,129,0.18),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.14),transparent_24%)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900">
              <WalletMinimal className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="eyebrow">{copy.hero.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  1066.my
                </h1>
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

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-card relative overflow-hidden rounded-[34px] p-6 sm:p-7">
            <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.2),transparent_68%)] blur-3xl" />

            <div className="relative space-y-6">
              <div className="flex flex-wrap gap-2">
                {copy.hero.badges.map((badge) => (
                  <Pill key={badge}>{badge}</Pill>
                ))}
              </div>

              <div className="space-y-4">
                <p className="eyebrow">{copy.sectionLabels.value}</p>
                <h2 className="max-w-3xl text-[2.45rem] font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl sm:leading-[1]">
                  {copy.hero.title}
                </h2>
                <p className="max-w-2xl text-[1rem] leading-7 text-slate-600 sm:text-lg">
                  {copy.hero.description}
                </p>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
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
                  href="#how-it-works"
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

          <aside className="flex flex-col gap-5">
            <div className="rounded-[34px] bg-slate-950 p-6 text-white shadow-[0_26px_80px_rgba(15,23,42,0.24)] sm:p-7">
              <p className="text-xs uppercase tracking-[0.26em] text-white/55">
                {copy.sectionLabels.howItWorks}
              </p>
              <ol className="mt-5 space-y-4">
                {copy.steps.map((step, index) => (
                  <li
                    className="rounded-[24px] border border-white/10 bg-white/7 px-4 py-4"
                    key={step.title}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-950">
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
                  </li>
                ))}
              </ol>
            </div>

            <div className="glass-card rounded-[34px] p-6 sm:p-7">
              <p className="eyebrow">{copy.sectionLabels.proof}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {copy.proof.title}
              </h3>
              <div className="mt-5 rounded-[26px] border border-slate-200 bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      PROJECT_WALLET
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-950">
                      {projectWallet ?? "Not configured yet"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <LandingSection
          eyebrow={copy.sectionLabels.value}
          id="why-this-build"
          title={copy.sectionTitles.value}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.values.map((value, index) => (
              <ValueCard
                description={value.description}
                icon={
                  index === 0 ? (
                    <BadgeCheck className="size-5" />
                  ) : index === 1 ? (
                    <WalletMinimal className="size-5" />
                  ) : index === 2 ? (
                    <Network className="size-5" />
                  ) : (
                    <Globe2 className="size-5" />
                  )
                }
                key={value.title}
                title={value.title}
              />
            ))}
          </div>
        </LandingSection>

        <LandingSection
          eyebrow={copy.sectionLabels.howItWorks}
          id="how-it-works"
          title={copy.mechanics.title}
        >
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
              <p className="text-base leading-7 text-slate-600">
                {copy.mechanics.description}
              </p>
            </div>
            <div className="rounded-[28px] bg-[linear-gradient(180deg,#0f172a,#111827)] p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-6">
              <ul className="space-y-3">
                {copy.mechanics.bullets.map((bullet) => (
                  <li className="flex items-start gap-3" key={bullet}>
                    <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      <BadgeCheck className="size-3.5" />
                    </span>
                    <span className="text-sm leading-6 text-white/74">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </LandingSection>

        <LandingSection eyebrow={copy.sectionLabels.proof} title={copy.proof.title}>
          <div className="grid gap-4 lg:grid-cols-2">
            {copy.proof.bullets.map((bullet) => (
              <div
                className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                key={bullet}
              >
                <p className="text-sm leading-7 text-slate-700">{bullet}</p>
              </div>
            ))}
          </div>
        </LandingSection>

        <LandingSection
          eyebrow={copy.sectionLabels.faq}
          title={copy.sectionTitles.faq}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {copy.faq.map((item) => (
              <div
                className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6"
                key={item.question}
              >
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </LandingSection>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-card rounded-[34px] p-6 sm:p-7">
            <p className="eyebrow">{copy.legal.title}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {copy.sectionTitles.finalCta}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {copy.legal.note}
            </p>
            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
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

          <div className="rounded-[34px] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {copy.sectionTitles.summary}
            </p>
            <div className="mt-5 space-y-4">
              <SummaryRow label={copy.metrics[0].label} value={copy.metrics[0].value} />
              <SummaryRow label={copy.metrics[1].label} value={copy.metrics[1].value} />
              <SummaryRow label={copy.metrics[2].label} value={copy.metrics[2].value} />
              <SummaryRow label={copy.metrics[3].label} value={copy.metrics[3].value} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LandingSection({
  children,
  eyebrow,
  id,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  id?: string;
  title: string;
}) {
  return (
    <section
      className={cn(
        "glass-card rounded-[32px] p-6 sm:p-7",
        id && "scroll-mt-24 sm:scroll-mt-28",
      )}
      id={id}
    >
      <div className="mb-5 space-y-2">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
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
    <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur">
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

function ValueCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
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
