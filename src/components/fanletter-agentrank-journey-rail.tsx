import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Crown,
  Database,
  GitBranch,
  Sparkles,
} from "lucide-react";

import type { Locale } from "@/lib/i18n";

type FanletterAgentRankJourneyStep =
  | "agentrank"
  | "creator"
  | "discovery"
  | "founder"
  | "network";

type FanletterAgentRankJourneyRailProps = {
  active: FanletterAgentRankJourneyStep;
  className?: string;
  locale: Locale;
  starId?: string | null;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FanletterAgentRankJourneyRail({
  active,
  className,
  locale,
  starId,
}: FanletterAgentRankJourneyRailProps) {
  const encodedStarId = starId ? encodeURIComponent(starId) : null;
  const isKorean = locale === "ko";
  const copy = isKorean
    ? {
        current: "현재",
        eyebrow: "현재 흐름",
        title: "AI 스타 발견부터 AgentRank까지",
      }
    : {
        current: "Current",
        eyebrow: "Current flow",
        title: "From AI Star Discovery to AgentRank",
      };
  const steps: Array<{
    Icon: typeof Bot;
    key: FanletterAgentRankJourneyStep;
    href: string;
    label: string;
  }> = [
    {
      Icon: Bot,
      href: `/${locale}/fanletter/characters`,
      key: "discovery",
      label: isKorean ? "AI 스타 발견" : "Discovery",
    },
    {
      Icon: Crown,
      href: encodedStarId
        ? `/${locale}/fanletter/${encodedStarId}`
        : `/${locale}/fanletter/characters`,
      key: "founder",
      label: isKorean ? "Founder 참여" : "Founder",
    },
    {
      Icon: GitBranch,
      href: encodedStarId
        ? `/${locale}/fanletter/${encodedStarId}/universe`
        : `/${locale}/fanletter/founder-club`,
      key: "network",
      label: isKorean ? "파운더 네트워크" : "Founder Network",
    },
    {
      Icon: Sparkles,
      href: `/${locale}/fanletter/creator-unlock${
        encodedStarId ? `?starId=${encodedStarId}` : ""
      }`,
      key: "creator",
      label: "Creator Journey",
    },
    {
      Icon: Database,
      href: `/${locale}/fanletter/agentrank${
        encodedStarId ? `?starId=${encodedStarId}` : ""
      }`,
      key: "agentrank",
      label: "AgentRank",
    },
  ];
  const activeIndex = steps.findIndex((step) => step.key === active);

  return (
    <nav
      aria-label={copy.title}
      className={joinClasses(
        "rounded-[1.1rem] border border-zinc-200 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.055)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {copy.eyebrow}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
            {copy.title}
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-zinc-400" />
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
        {steps.map((step, index) => {
          const Icon = step.Icon;
          const isActive = step.key === active;
          const isDone = index < activeIndex;

          return (
            <Link
              className={joinClasses(
                "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border px-3 text-center text-xs font-semibold sm:shrink-0 sm:text-sm",
                isActive
                  ? "border-black bg-black !text-white"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700",
              )}
              href={step.href}
              key={step.key}
            >
              {isDone ? (
                <BadgeCheck className="size-4 shrink-0" />
              ) : (
                <Icon className="size-4 shrink-0" />
              )}
              <span className="min-w-0 truncate">{step.label}</span>
              {isActive ? (
                <span className="hidden rounded-full bg-white/16 px-2 py-0.5 text-[0.62rem] !text-white sm:inline-flex">
                  {copy.current}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
