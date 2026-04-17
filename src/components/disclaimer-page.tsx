import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/i18n";
import type { DisclaimerCopy } from "@/lib/disclaimer-copy";

export function DisclaimerPage({
  copy,
  homeHref,
  languageLabel,
  locale,
}: {
  copy: DisclaimerCopy;
  homeHref: string;
  languageLabel: string;
  locale: Locale;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,161,58,0.18),transparent_24%),radial-gradient(circle_at_0%_8%,rgba(255,255,255,0.7),transparent_26%),linear-gradient(180deg,#f6efe3_0%,#fbf7ef_42%,#f7f1e8_100%)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/82 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {copy.intro}
            </p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <LanguageSwitcher label={languageLabel} locale={locale} />
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50"
              href={homeHref}
            >
              {copy.backHomeLabel}
            </Link>
          </div>
        </header>

        <section className="glass-card rounded-[30px] border border-[#eadcc3]/80 bg-[linear-gradient(180deg,rgba(255,251,242,0.98),rgba(255,255,255,0.96))] p-5 shadow-[0_20px_55px_rgba(15,23,42,0.05)] sm:p-7">
          <SectionBlock clauses={copy.disclaimerClauses} title={copy.disclaimerTitle} />
          <div className="my-6 h-px bg-[linear-gradient(90deg,transparent,#e3d0aa,transparent)]" />
          <SectionBlock clauses={copy.termsClauses} title={copy.termsTitle} />
        </section>
      </main>
    </div>
  );
}

function SectionBlock({
  clauses,
  title,
}: {
  clauses: DisclaimerCopy["disclaimerClauses"];
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d7142]">
        {title}
      </p>
      <div className="mt-4 space-y-4">
        {clauses.map((clause) => (
          <article
            className="rounded-[24px] border border-[#ebddc5] bg-[linear-gradient(180deg,#fffdf7,#fff8ee)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]"
            key={clause.title}
          >
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              {clause.title}
            </h2>
            {clause.body.map((paragraph) => (
              <p className="mt-3 text-sm leading-7 text-slate-700" key={paragraph}>
                {paragraph}
              </p>
            ))}
            {clause.bullets?.length ? (
              <ul className="mt-3 space-y-2">
                {clause.bullets.map((bullet) => (
                  <li className="rounded-[18px] border border-[#efe2cc] bg-white px-4 py-3 text-sm leading-6 text-slate-700" key={bullet}>
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
