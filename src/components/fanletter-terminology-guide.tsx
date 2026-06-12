"use client";

import { Crown, Network, Sparkles } from "lucide-react";

import type { Locale } from "@/lib/i18n";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type FanletterTerminologyGuideProps = {
  className?: string;
  locale: Locale;
  variant?: "compact" | "panel";
};

type TerminologyCopy = {
  eyebrow: string;
  terms: Array<{
    body: string;
    Icon: typeof Crown;
    title: string;
  }>;
  title: string;
};

const enCopy: TerminologyCopy = {
  eyebrow: "Terminology",
  title: "Founder Club structure",
  terms: [
    {
      body: "Product layer",
      Icon: Crown,
      title: "Founder Club",
    },
    {
      body: "Per-AI-Star space",
      Icon: Sparkles,
      title: "Star Universe",
    },
    {
      body: "6-level invite and CP structure",
      Icon: Network,
      title: "Founder Network",
    },
  ],
};

const copyByLocale: Partial<Record<Locale, TerminologyCopy>> = {
  en: {
    ...enCopy,
  },
  ja: {
    eyebrow: "Terminology",
    title: "Founder Club structure",
    terms: [
      {
        body: "Product layer",
        Icon: Crown,
        title: "Founder Club",
      },
      {
        body: "Per-AI-Star space",
        Icon: Sparkles,
        title: "Star Universe",
      },
      {
        body: "6-level invite and CP structure",
        Icon: Network,
        title: "Founder Network",
      },
    ],
  },
  ko: {
    eyebrow: "용어 기준",
    title: "파운더 클럽 구조",
    terms: [
      {
        body: "전체 제품",
        Icon: Crown,
        title: "파운더 클럽",
      },
      {
        body: "AI 스타별 공간",
        Icon: Sparkles,
        title: "스타 유니버스",
      },
      {
        body: "6단계 초대/CP 구조",
        Icon: Network,
        title: "파운더 네트워크",
      },
    ],
  },
};

export function FanletterTerminologyGuide({
  className,
  locale,
  variant = "panel",
}: FanletterTerminologyGuideProps) {
  const copy = copyByLocale[locale] ?? enCopy;
  const isCompact = variant === "compact";

  return (
    <aside
      className={joinClasses(
        "min-w-0 rounded-lg border border-violet-100 bg-white/82 shadow-[0_16px_38px_rgba(88,28,135,0.08)] backdrop-blur",
        isCompact ? "p-3" : "p-4 sm:p-5",
        className,
      )}
    >
      <div
        className={joinClasses(
          "flex min-w-0",
          isCompact ? "items-center gap-3" : "flex-col gap-3",
        )}
      >
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#6d28d9]">
            {copy.eyebrow}
          </p>
          {isCompact ? null : (
            <h2 className="mt-1 text-lg font-semibold tracking-normal text-[#12041f]">
              {copy.title}
            </h2>
          )}
        </div>

        <div
          className={joinClasses(
            "grid min-w-0 gap-2",
            isCompact ? "flex-1 sm:grid-cols-3" : "sm:grid-cols-3",
          )}
        >
          {copy.terms.map((term) => {
            const Icon = term.Icon;

            return (
              <div
                className="flex min-w-0 items-center gap-2 rounded-lg border border-violet-50 bg-[#fbfaff] px-2.5 py-2"
                key={term.title}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[#7c3aed]">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-[#12041f]">
                    {term.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.66rem] font-semibold text-slate-500">
                    {term.body}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
