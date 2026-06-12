import {
  createFanletterFounderClubCreatorLaunchDraft,
  getFanletterFounderClubCreatorUnlock,
  recordFanletterFounderUniverseCreatorLaunchCpPool,
} from "@/lib/fanletter-founder-club-service";
import {
  getFanletterFounderClubApiMode,
  getFanletterFounderClubRuntimeState,
} from "@/lib/fanletter-founder-club-runtime";
import {
  buildFanletterFounderUniverseCpPoolDistribution,
  resolveFanletterFounderUniverseUplinePath,
} from "@/lib/fanletter-founder-universe";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import { fanletterV2Mock, type SpawnedAIStar } from "@/mock/fanletterV2";

type CreatorLaunchRequestBody = {
  categoryLabel?: unknown;
  launchCostUsdt?: unknown;
  locale?: unknown;
  mode?: unknown;
  name?: unknown;
  ownerName?: unknown;
  portraitImageUrl?: unknown;
  sourceStarId?: unknown;
  sourceUniverseName?: unknown;
};

function jsonError(message: string, status: number, extra?: object) {
  return Response.json({ error: message, ...(extra ?? {}) }, { status });
}

function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && hasLocale(value) ? value : defaultLocale;
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";

  return (normalized || fallback).slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeLaunchCost(value: unknown) {
  const candidate = typeof value === "number" ? value : Number(value);

  return Number.isFinite(candidate) && candidate > 0 ? candidate : 10;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ai-star"
  );
}

function getSampleLaunchDefaults() {
  const sampleStar: SpawnedAIStar = fanletterV2Mock.aiStars[0].spawnedStars[0];
  const preview = fanletterV2Mock.creatorUnlock.launchPreview;

  return {
    name: preview?.newStarName ?? sampleStar.name,
    ownerName: preview?.ownerName ?? fanletterV2Mock.memberPortfolio.memberName,
    sourceStarId: sampleStar.spawnedFromStarId ?? fanletterV2Mock.aiStars[0].id,
    sourceUniverseName:
      preview?.sourceUniverseName ??
      sampleStar.sourceUniverseName ??
      fanletterV2Mock.aiStars[0].universeName,
  };
}

function buildPreviewCpPool({
  launchStarId,
  sourceStarId,
}: {
  launchStarId: string;
  sourceStarId: string;
}) {
  const launchCreatorEmail = "member-a@mock.fanletter";
  const upline = resolveFanletterFounderUniverseUplinePath({
    creatorEmail: "creator@mock.fanletter",
    launchCreatorEmail,
    referralEdges: [
      {
        sourceMemberEmail: "creator@mock.fanletter",
        targetMemberEmail: "genesis-founder@mock.fanletter",
      },
      {
        sourceMemberEmail: "genesis-founder@mock.fanletter",
        targetMemberEmail: "founder@mock.fanletter",
      },
      {
        sourceMemberEmail: "founder@mock.fanletter",
        targetMemberEmail: launchCreatorEmail,
      },
    ],
  });

  return buildFanletterFounderUniverseCpPoolDistribution({
    launchCreatorEmail,
    launchStarId,
    rootResolved: upline.rootResolved,
    sourceStarId,
    uplinePath: upline.path,
  });
}

function buildPreviewLaunchResponse({
  launchCostUsdt,
  locale,
  name,
  ownerName,
  runtime,
  sourceStarId,
  sourceUniverseName,
}: {
  launchCostUsdt: number;
  locale: Locale;
  name: string;
  ownerName: string;
  runtime: ReturnType<typeof getFanletterFounderClubRuntimeState>;
  sourceStarId: string;
  sourceUniverseName: string;
}) {
  const launchId = `mock-${slugify(name)}-${slugify(sourceStarId)}`;

  return {
    cpPool: buildPreviewCpPool({
      launchStarId: launchId,
      sourceStarId,
    }),
    launch: {
      createdAt: new Date().toISOString(),
      createdByUnlock: true,
      id: launchId,
      launchCostUsdt,
      name,
      ownerName,
      sourceUniverseName,
      spawnedFromStarId: sourceStarId,
      status: "draft",
      universeName: `${name} Universe`,
    },
    mode: "preview",
    next: {
      creatorUnlockHref: `/${locale}/fanletter/creator-unlock`,
      founderClubHref: `/${locale}/fanletter/founder-club`,
    },
    payment: {
      amountUsdt: launchCostUsdt,
      status: "mock_only",
    },
    runtime,
  };
}

export async function POST(request: Request) {
  let body: CreatorLaunchRequestBody;

  try {
    body = (await request.json()) as CreatorLaunchRequestBody;
  } catch {
    return jsonError("Invalid AI Star launch request.", 400);
  }

  const defaults = getSampleLaunchDefaults();
  const locale = normalizeLocale(body.locale);
  const requestedMode = getFanletterFounderClubApiMode(body.mode);
  const runtime = getFanletterFounderClubRuntimeState("creator_launch");
  const name = normalizeText(body.name, defaults.name, 64);
  const sourceStarId =
    normalizeFanletterStarId(
      typeof body.sourceStarId === "string" ? body.sourceStarId : null,
    ) ?? defaults.sourceStarId;
  const sourceUniverseName = normalizeText(
    body.sourceUniverseName,
    defaults.sourceUniverseName,
    96,
  );
  const ownerName = normalizeText(body.ownerName, defaults.ownerName, 64);
  const launchCostUsdt = normalizeLaunchCost(body.launchCostUsdt);

  if (requestedMode !== "live") {
    return Response.json(
      buildPreviewLaunchResponse({
        launchCostUsdt,
        locale,
        name,
        ownerName,
        runtime,
        sourceStarId,
        sourceUniverseName,
      }),
    );
  }

  if (runtime.blockedReasons.length > 0) {
    return jsonError("Creator launch live mode is not available.", 409, {
      preview: buildPreviewLaunchResponse({
        launchCostUsdt,
        locale,
        name,
        ownerName,
        runtime,
        sourceStarId,
        sourceUniverseName,
      }),
      runtime,
    });
  }

  const session = await readMemberServerSession();

  if (!session?.email) {
    return jsonError("Member session is required.", 401, { runtime });
  }

  const launchResult = await createFanletterFounderClubCreatorLaunchDraft({
    categoryLabel: normalizeOptionalText(body.categoryLabel, 96),
    launchCostUsdt,
    memberEmail: session.email,
    name,
    portraitImageUrl: normalizeOptionalText(body.portraitImageUrl, 500),
    requireUnlocked: true,
    sourceStarId,
  });

  if (launchResult.status !== "created" && launchResult.status !== "existing") {
    return jsonError("Creator launch draft could not be created.", 409, {
      launchResult,
      runtime,
    });
  }

  const cpPoolLedger = await recordFanletterFounderUniverseCreatorLaunchCpPool({
    createdAt: launchResult.star.createdAt,
    distribution: launchResult.cpPool,
  });
  const unlock = await getFanletterFounderClubCreatorUnlock(session.email);

  return Response.json({
    cpPool: launchResult.cpPool,
    cpPoolLedger: {
      insertedCount: cpPoolLedger.insertedCount,
      skippedCount: cpPoolLedger.skippedCount,
      status:
        cpPoolLedger.insertedCount > 0
          ? "recorded"
          : cpPoolLedger.skippedCount > 0
            ? "already_recorded"
            : "no_allocated_recipients",
    },
    launch: {
      createdAt: launchResult.star.createdAt.toISOString(),
      createdByUnlock: true,
      id: launchResult.star.starId,
      launchCostUsdt: launchResult.star.launchCostUsdt ?? launchCostUsdt,
      name: launchResult.star.characterName,
      ownerName,
      sourceUniverseName: `${launchResult.sourceStar.characterName} Universe`,
      spawnedFromStarId: launchResult.sourceStar.starId,
      status: launchResult.star.status,
      universeName: `${launchResult.star.characterName} Universe`,
    },
    mode: "live",
    next: {
      creatorUnlockHref: `/${locale}/fanletter/creator-unlock`,
      founderClubHref: `/${locale}/fanletter/founder-club`,
      universeHref: `/${locale}/fanletter/${encodeURIComponent(
        launchResult.star.starId,
      )}`,
    },
    payment: {
      amountUsdt: launchCostUsdt,
      status: runtime.testPaymentBypassEnabled ? "test_bypass" : "verified",
    },
    runtime,
    status: launchResult.status,
    unlock,
  });
}
