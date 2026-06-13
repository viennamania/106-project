"use client";

import {
  CheckCircle2,
  Loader2,
  Rocket,
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

  const handleClick = useCallback(async () => {
    if (state === "loading") {
      return;
    }

    setState("loading");

    try {
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
    <button
      className={className}
      disabled={state === "loading"}
      onClick={handleClick}
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
  );
}
