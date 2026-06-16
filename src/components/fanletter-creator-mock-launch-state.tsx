"use client";

import {
  CheckCircle2,
  Loader2,
  Rocket,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "@/lib/i18n";
import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import type { FunnelEventMetadata } from "@/lib/funnel";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { MemberOwnedAIStar } from "@/mock/fanletterV2";

const FANLETTER_CREATOR_MOCK_LAUNCHES_STORAGE_KEY =
  "fanletter:v2:mock-creator-launches";
const FANLETTER_CREATOR_MOCK_LAUNCH_EVENT =
  "fanletter:mock-creator-launch-change";

export type FanletterCreatorMockLaunch = MemberOwnedAIStar & {
  createdAt: string;
  ownerName: string;
  status: "draft";
};

type StoredCreatorMockLaunches = Record<string, FanletterCreatorMockLaunch>;

type FanletterCreatorMockLaunchResponse = {
  launch: FanletterCreatorMockLaunch;
  mode: "mock" | "preview";
  next: {
    creatorUnlockHref: string;
    founderClubHref: string;
  };
  payment: {
    amountUsdt: number;
    status: "mock_only";
  };
};

function isCreatorMockLaunch(value: unknown): value is FanletterCreatorMockLaunch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FanletterCreatorMockLaunch>;

  return (
    typeof candidate.createdAt === "string" &&
    candidate.createdByUnlock === true &&
    typeof candidate.id === "string" &&
    typeof candidate.launchCostUsdt === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.ownerName === "string" &&
    typeof candidate.sourceUniverseName === "string" &&
    (typeof candidate.spawnedFromStarId === "string" ||
      candidate.spawnedFromStarId === null ||
      candidate.spawnedFromStarId === undefined) &&
    candidate.status === "draft" &&
    typeof candidate.universeName === "string"
  );
}

function readStoredCreatorMockLaunches() {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(
    FANLETTER_CREATOR_MOCK_LAUNCHES_STORAGE_KEY,
  );

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<StoredCreatorMockLaunches>(
      (launches, [launchId, launch]) => {
        if (isCreatorMockLaunch(launch) && launch.id === launchId) {
          launches[launchId] = launch;
        }

        return launches;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeStoredCreatorMockLaunches(launches: StoredCreatorMockLaunches) {
  window.localStorage.setItem(
    FANLETTER_CREATOR_MOCK_LAUNCHES_STORAGE_KEY,
    JSON.stringify(launches),
  );
}

function dispatchCreatorMockLaunchChange(launch: FanletterCreatorMockLaunch) {
  window.dispatchEvent(
    new CustomEvent(FANLETTER_CREATOR_MOCK_LAUNCH_EVENT, {
      detail: launch,
    }),
  );
}

export function recordFanletterCreatorMockLaunch(
  launch: FanletterCreatorMockLaunch,
) {
  if (typeof window === "undefined") {
    return null;
  }

  const launches = readStoredCreatorMockLaunches();
  launches[launch.id] = launch;
  writeStoredCreatorMockLaunches(launches);
  dispatchCreatorMockLaunchChange(launch);

  return launch;
}

export function getFanletterCreatorMockLaunches() {
  return readStoredCreatorMockLaunches();
}

export function useFanletterCreatorMockLaunches() {
  const [launches, setLaunches] = useState<StoredCreatorMockLaunches>({});

  useEffect(() => {
    function refreshLaunches() {
      setLaunches(getFanletterCreatorMockLaunches());
    }

    refreshLaunches();

    function handleStorage(event: StorageEvent) {
      if (
        event.key === FANLETTER_CREATOR_MOCK_LAUNCHES_STORAGE_KEY ||
        event.key === null
      ) {
        refreshLaunches();
      }
    }

    function handleLaunchChange() {
      refreshLaunches();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      FANLETTER_CREATOR_MOCK_LAUNCH_EVENT,
      handleLaunchChange,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        FANLETTER_CREATOR_MOCK_LAUNCH_EVENT,
        handleLaunchChange,
      );
    };
  }, []);

  return launches;
}

export function toMemberOwnedAIStar(
  launch: FanletterCreatorMockLaunch,
): MemberOwnedAIStar {
  return {
    createdByUnlock: launch.createdByUnlock,
    id: launch.id,
    launchCostUsdt: launch.launchCostUsdt,
    name: launch.name,
    sourceUniverseName: launch.sourceUniverseName,
    spawnedFromStarId: launch.spawnedFromStarId ?? null,
    status: launch.status,
    universeName: launch.universeName,
  };
}

async function requestFanletterCreatorMockLaunch({
  launchCostUsdt,
  locale,
  name,
  ownerName,
  sourceStarId,
  sourceUniverseName,
}: {
  launchCostUsdt: number;
  locale: Locale;
  name: string;
  ownerName: string;
  sourceStarId?: string | null;
  sourceUniverseName: string;
}) {
  const response = await fetch("/api/fanletter/founder-club/creator-launch", {
    body: JSON.stringify({
      launchCostUsdt,
      locale,
      mode: "preview",
      name,
      ownerName,
      sourceStarId,
      sourceUniverseName,
    }),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as
    | FanletterCreatorMockLaunchResponse
    | { error?: string }
    | null;

  if (!response.ok || !data || !("launch" in data)) {
    throw new Error(
      data && "error" in data && data.error
        ? data.error
        : "Failed to preview AI Star launch.",
    );
  }

  return data;
}

function getButtonCopy(locale: Locale, state: "done" | "idle" | "loading") {
  if (locale === "ko") {
    return state === "loading"
      ? "Mock 생성 중"
      : state === "done"
        ? "Mock 생성 완료"
        : "Mock 생성 완료하기";
  }

  if (locale === "ja") {
    return state === "loading"
      ? "Mock作成中"
      : state === "done"
        ? "Mock作成完了"
        : "Complete mock launch";
  }

  return state === "loading"
    ? "Creating mock"
    : state === "done"
      ? "Mock launch complete"
      : "Complete mock launch";
}

function getConfirmCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStar: "AI 스타",
      cancel: "취소",
      close: "Mock 생성 확인 닫기",
      confirm: "Mock 생성 확정",
      cost: "비용",
      event: "AgentRank 이벤트",
      payment: "실제 결제 없음",
      source: "출처",
      title: "10 USDT Mock 생성 확인",
    };
  }

  if (locale === "ja") {
    return {
      aiStar: "AI Star",
      cancel: "キャンセル",
      close: "Mock作成確認を閉じる",
      confirm: "Mock作成を確定",
      cost: "Cost",
      event: "AgentRank event",
      payment: "No real payment",
      source: "Source",
      title: "Confirm 10 USDT mock launch",
    };
  }

  return {
    aiStar: "AI Star",
    cancel: "Cancel",
    close: "Close mock launch confirmation",
    confirm: "Confirm mock launch",
    cost: "Cost",
    event: "AgentRank event",
    payment: "No real payment",
    source: "Source",
    title: "Confirm 10 USDT mock launch",
  };
}

export function FanletterCreatorMockLaunchButton({
  agentRank,
  children,
  className,
  launchCostUsdt,
  locale,
  name,
  onLaunch,
  ownerName,
  trackingMetadata,
  sourceStarId,
  sourceUniverseName,
}: {
  agentRank?: AgentRankInteractionSignal | null;
  children?: ReactNode;
  className?: string;
  launchCostUsdt: number;
  locale: Locale;
  name: string;
  onLaunch?: (launch: FanletterCreatorMockLaunch) => void;
  ownerName: string;
  trackingMetadata?: FunnelEventMetadata;
  sourceStarId?: string | null;
  sourceUniverseName: string;
}) {
  const [state, setState] = useState<"done" | "idle" | "loading">("idle");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const confirmCopy = getConfirmCopy(locale);

  useEffect(() => {
    if (!isConfirmOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsConfirmOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isConfirmOpen]);

  const handleConfirm = useCallback(async () => {
    if (state === "loading") {
      return;
    }

    setState("loading");

    try {
      trackFunnelEvent("fanletter_x402_mock_payment_intent", {
        agentRank: {
          eventType: "x402_mock_payment_intent",
          intent: "creator_launch_mock_payment_intent",
          source: "fanletter_creator_unlock",
          starId: sourceStarId ?? agentRank?.starId ?? null,
        },
        metadata: {
          ...trackingMetadata,
          amountUsdt: launchCostUsdt,
          checkoutMode: "mock",
          currency: "USDT",
          launchStarName: name,
          mockPaymentIntent: true,
          ownerName,
          paymentStatus: "mock_intent",
          sourceStarId: sourceStarId ?? null,
          sourceUniverseName,
          x402Ready: true,
        },
        targetHref: `/${locale}/fanletter/creator-unlock`,
      });
      const preview = await requestFanletterCreatorMockLaunch({
        launchCostUsdt,
        locale,
        name,
        ownerName,
        sourceStarId,
        sourceUniverseName,
      });

      recordFanletterCreatorMockLaunch(preview.launch);
      trackFunnelEvent("signup_cta_click", {
        agentRank,
        metadata: {
          launchMode: preview.mode,
          launchPaymentStatus: preview.payment.status,
          launchSourceUniverseName: preview.launch.sourceUniverseName ?? null,
          launchStarName: preview.launch.name,
          ...trackingMetadata,
        },
        targetHref: `/${locale}/fanletter/${encodeURIComponent(
          preview.launch.id,
        )}/universe`,
      });
      onLaunch?.(preview.launch);
      setState("done");
      setIsConfirmOpen(false);
    } catch {
      setState("idle");
    }
  }, [
    launchCostUsdt,
    locale,
    name,
    onLaunch,
    ownerName,
    sourceStarId,
    sourceUniverseName,
    state,
    agentRank,
    trackingMetadata,
  ]);

  const Icon =
    state === "loading" ? Loader2 : state === "done" ? CheckCircle2 : Rocket;

  return (
    <>
      <button
        className={className}
        disabled={state === "loading"}
        onClick={() => setIsConfirmOpen(true)}
        type="button"
      >
        {children ?? getButtonCopy(locale, state)}
        <Icon
          className={[
            "size-4",
            state === "loading" ? "animate-spin" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </button>

      {isConfirmOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/42 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <button
            aria-label={confirmCopy.close}
            className="absolute inset-0 cursor-default"
            onClick={() => setIsConfirmOpen(false)}
            type="button"
          />
          <section className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-950 shadow-[0_28px_90px_rgba(15,23,42,0.22)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {confirmCopy.payment}
                </p>
                <h2 className="mt-2 text-xl font-semibold leading-tight">
                  {confirmCopy.title}
                </h2>
              </div>
              <button
                aria-label={confirmCopy.close}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
                onClick={() => setIsConfirmOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {[
                [confirmCopy.event, "x402_mock_payment_intent"],
                [confirmCopy.aiStar, name],
                [confirmCopy.source, sourceUniverseName],
                [confirmCopy.cost, `${launchCostUsdt} USDT`],
              ].map(([label, value]) => (
                <div
                  className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                  key={label}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    {label}
                  </span>
                  <span className="min-w-0 truncate text-right text-sm font-semibold text-zinc-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                onClick={() => setIsConfirmOpen(false)}
                type="button"
              >
                {confirmCopy.cancel}
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
                disabled={state === "loading"}
                onClick={handleConfirm}
                type="button"
              >
                {state === "loading" ? getButtonCopy(locale, state) : confirmCopy.confirm}
                <Icon
                  className={[
                    "size-4",
                    state === "loading" ? "animate-spin" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
