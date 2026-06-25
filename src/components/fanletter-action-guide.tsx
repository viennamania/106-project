"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  MapPin,
  MousePointer2,
} from "lucide-react";
import type { ReactNode } from "react";

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
  primaryActionSlot?: ReactNode;
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
      <span className="min-w-0 whitespace-normal text-center leading-tight [word-break:keep-all]">
        {action.label}
      </span>
      <ArrowRight className="size-4 shrink-0" />
    </FanletterTrackedLink>
  );
}

export function FanletterActionGuide({
  className,
  currentLabel,
  metrics = [],
  primaryAction,
  primaryActionSlot,
  reputationEventLabel,
  secondaryActions = [],
  steps,
  subtitle,
  title,
}: FanletterActionGuideProps) {
  const visibleSecondaryActions = secondaryActions.slice(0, 1);
  const shouldHideSecondaryOnMobile = Boolean(primaryAction || primaryActionSlot);
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
  const isKorean =
    /[가-힣]/.test(`${currentLabel} ${title} ${subtitle} ${reputationEventLabel}`);
  const actionTitle = title
    .replace(/^다음 행동:\s*/u, "")
    .replace(/^Next action:\s*/iu, "");
  const guideCopy = isKorean
    ? {
        current: "현재 위치",
        event: "활동 기록",
        next: "다음 행동",
        signal: "내 활동 기록",
        steps: "진행 상황",
      }
    : {
        current: "Current location",
        event: "Activity record",
        next: "Next action",
        signal: "Activity record",
        steps: "Progress",
      };

  return (
    <section
      className={joinClasses(
        "min-w-0 overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfc_100%)] text-zinc-950 shadow-[0_16px_46px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="grid min-w-0 sm:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <div className="min-w-0 border-b border-zinc-200 p-4 sm:border-b-0 sm:border-r sm:p-4">
          <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            <MapPin className="size-3.5 shrink-0 text-zinc-700" />
            {guideCopy.current}
          </p>
          <p className="mt-2 break-words text-base font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
            {currentLabel}
          </p>
          {metrics.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {metrics.slice(0, 2).map((metric) => (
                <div
                  className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                  key={metric.label}
                >
                  <p className="break-words text-[0.62rem] font-semibold leading-tight text-zinc-500 [word-break:keep-all]">
                    {metric.label}
                  </p>
                  <p className="mt-1 break-words text-[0.95rem] font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 border-b border-zinc-200 p-4 sm:border-b-0 sm:p-4">
          <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            <MousePointer2 className="size-3.5 shrink-0 text-zinc-700" />
            {guideCopy.next}
          </p>
          <h2 className="mt-2 break-words text-[1.35rem] font-semibold leading-tight text-zinc-950 [word-break:keep-all] sm:text-2xl">
            {actionTitle}
          </h2>
          <p className="mt-2 hidden max-w-2xl text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all] sm:block">
            {subtitle}
          </p>
        </div>

        <div className="min-w-0 p-4 sm:col-span-2 sm:border-t sm:border-zinc-200 sm:p-4">
          <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            <Activity className="size-3.5 shrink-0 text-zinc-700" />
            {guideCopy.event}
          </p>
          <p className="mt-2 break-words text-[0.95rem] font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
            {reputationEventLabel}
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            {guideCopy.signal}
          </p>
        </div>
      </div>

      {steps.length > 0 ||
      primaryAction ||
      primaryActionSlot ||
      visibleSecondaryActions.length > 0 ? (
        <div className="border-t border-zinc-200 bg-zinc-50/80 p-4 sm:p-4">
          {steps.length > 0 ? (
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  {guideCopy.steps}
                </p>
                <p className="text-[0.68rem] font-semibold text-zinc-700">
                  {progressPercent}%
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-zinc-950"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
                {steps.map((step, index) => {
                  const isDone = step.status === "done";
                  const isActive = step.status === "active";

                  return (
                    <div
                      className={joinClasses(
                        "flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold sm:min-w-[6.7rem] sm:shrink-0",
                        isActive
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : isDone
                            ? "border-zinc-300 bg-white text-zinc-900"
                            : "border-zinc-200 bg-white text-zinc-500",
                      )}
                      key={`${step.label}-${index}`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      ) : (
                        <Circle className="size-3.5 shrink-0" />
                      )}
                      <span className="min-w-0 whitespace-normal text-center leading-tight [word-break:keep-all]">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {primaryAction || primaryActionSlot || visibleSecondaryActions.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
              {primaryActionSlot ??
                (primaryAction
                ? renderAction(
                    primaryAction,
                    "inline-flex min-h-11 w-full max-w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800 sm:w-auto sm:px-5",
                  )
                : null)}
              {visibleSecondaryActions.map((action) =>
                renderAction(
                  action,
                  joinClasses(
                    "min-h-11 w-full max-w-full min-w-0 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm font-semibold leading-tight text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 sm:w-auto",
                    shouldHideSecondaryOnMobile
                      ? "hidden sm:inline-flex"
                      : "inline-flex",
                  ),
                  action.label,
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
