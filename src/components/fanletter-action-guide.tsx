"use client";

import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDot,
  Sparkles,
} from "lucide-react";

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
  const visibleSecondaryActions = secondaryActions.slice(0, 1);
  const shouldHideSecondaryOnMobile = Boolean(primaryAction);
  const completedStepCount = steps.filter((step) => step.status === "done")
    .length;
  const activeStepIndex = steps.findIndex((step) => step.status === "active");
  const progressStepCount = Math.max(
    completedStepCount,
    activeStepIndex >= 0 ? activeStepIndex + 1 : 0,
  );
  const progressPercent =
    steps.length > 0
      ? Math.min(100, Math.round((progressStepCount / steps.length) * 100))
      : 0;

  return (
    <section
      className={joinClasses(
        "min-w-0 overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white p-3 shadow-[0_18px_46px_rgba(15,23,42,0.07)] sm:p-4",
        className,
      )}
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[0.66rem] font-semibold text-zinc-700">
              <CircleDot className="size-3.5 shrink-0 text-zinc-950" />
              <span className="truncate">{currentLabel}</span>
            </p>
            <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-900 bg-zinc-950 px-2.5 py-1 text-[0.66rem] font-semibold text-white">
              <Sparkles className="size-3.5 shrink-0" />
              <span className="truncate">{reputationEventLabel}</span>
            </p>
          </div>
          <h2 className="mt-2 break-words text-xl font-semibold leading-tight text-zinc-950 [word-break:keep-all] sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 hidden max-w-2xl text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all] sm:block">
            {subtitle}
          </p>
        </div>
        {metrics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            {metrics.map((metric) => (
              <div
                className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                key={metric.label}
              >
                <p className="truncate text-[0.62rem] font-semibold text-zinc-500">
                  {metric.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-zinc-950">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {steps.length > 0 ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid min-w-0 gap-2">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((step, index) => {
            const isDone = step.status === "done";
            const isActive = step.status === "active";

            return (
              <div
                className={joinClasses(
                  "flex min-w-[5.75rem] shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold",
                  isActive
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : isDone
                      ? "border-zinc-200 bg-zinc-50 text-zinc-800"
                      : "border-zinc-200 bg-white text-zinc-500",
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
      </div>

      {primaryAction || visibleSecondaryActions.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
          {primaryAction
            ? renderAction(
                primaryAction,
                "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800 sm:w-auto",
              )
            : null}
          {visibleSecondaryActions.map((action) =>
            renderAction(
              action,
              joinClasses(
                "h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto",
                shouldHideSecondaryOnMobile
                  ? "hidden sm:inline-flex"
                  : "inline-flex",
              ),
              action.label,
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
