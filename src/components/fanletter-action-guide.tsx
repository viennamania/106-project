"use client";

import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";

import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import type { FunnelEventMetadata, FunnelEventName } from "@/lib/funnel";

type ActionGuideAction = {
  agentRank?: AgentRankInteractionSignal | null;
  eventName?: FunnelEventName;
  href: string;
  label: string;
  metadata?: FunnelEventMetadata;
  referralCode?: string | null;
};

type ActionGuideStep = {
  label: string;
  status?: "active" | "done" | "next";
};

type ActionGuideMetric = {
  label: string;
  value: string;
};

type FanletterActionGuideProps = {
  className?: string;
  currentLabel: string;
  metrics?: ActionGuideMetric[];
  primaryAction?: ActionGuideAction;
  reputationEventLabel: string;
  secondaryActions?: ActionGuideAction[];
  steps: ActionGuideStep[];
  subtitle: string;
  title: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function renderAction(
  action: ActionGuideAction,
  className: string,
  key?: string,
) {
  return (
    <FanletterTrackedLink
      agentRank={action.agentRank}
      className={className}
      eventName={action.eventName ?? "signup_cta_click"}
      href={action.href}
      key={key ?? action.label}
      metadata={action.metadata}
      referralCode={action.referralCode}
    >
      <span className="truncate">{action.label}</span>
      <ArrowRight className="size-4 shrink-0" />
    </FanletterTrackedLink>
  );
}

export function FanletterActionGuide({
  className,
  currentLabel,
  metrics = [],
  primaryAction,
  reputationEventLabel,
  secondaryActions = [],
  steps,
  subtitle,
  title,
}: FanletterActionGuideProps) {
  const visibleSecondaryActions = secondaryActions.slice(0, 2);

  return (
    <section
      className={joinClasses(
        "min-w-0 overflow-hidden rounded-[1.25rem] border border-violet-100 bg-white/94 p-3 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[0.66rem] font-semibold text-[#6d28d9]">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="truncate">{currentLabel}</span>
          </p>
          <h2 className="mt-2 break-words text-xl font-semibold leading-tight text-[#12041f] [word-break:keep-all] sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-5 text-black/58 [word-break:keep-all]">
            {subtitle}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 sm:inline-flex">
          {reputationEventLabel}
        </span>
      </div>
      <span className="mt-2 inline-flex max-w-full rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 sm:hidden">
        <span className="truncate">{reputationEventLabel}</span>
      </span>

      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((step, index) => {
            const isDone = step.status === "done";
            const isActive = step.status === "active";

            return (
              <div
                className={joinClasses(
                  "flex min-w-[6.75rem] shrink-0 items-center gap-2 rounded-full border px-2.5 py-2 text-xs font-semibold",
                  isActive
                    ? "border-violet-200 bg-violet-50 text-[#6d28d9]"
                    : isDone
                      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                      : "border-slate-100 bg-slate-50 text-slate-500",
                )}
                key={`${step.label}-${index}`}
              >
                {isDone ? (
                  <CheckCircle2 className="size-3.5 shrink-0" />
                ) : (
                  <Circle className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>

        {metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {metrics.map((metric) => (
              <div
                className="min-w-0 rounded-lg bg-slate-50 px-3 py-2"
                key={metric.label}
              >
                <p className="truncate text-[0.62rem] font-semibold text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#12041f]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {primaryAction || visibleSecondaryActions.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
          {primaryAction
            ? renderAction(
                primaryAction,
                "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,58,237,0.22)] transition hover:bg-[#6d28d9] sm:w-auto",
              )
            : null}
          {visibleSecondaryActions.map((action) =>
            renderAction(
              action,
              "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-violet-100 bg-white px-4 text-sm font-semibold text-[#5b21b6] transition hover:bg-violet-50 sm:w-auto",
              action.label,
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
