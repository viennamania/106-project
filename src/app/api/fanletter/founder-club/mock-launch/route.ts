import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import { fanletterV2Mock, type SpawnedAIStar } from "@/mock/fanletterV2";

type MockLaunchRequestBody = {
  launchCostUsdt?: unknown;
  locale?: unknown;
  name?: unknown;
  ownerName?: unknown;
  sourceStarId?: unknown;
  sourceUniverseName?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && hasLocale(value) ? value : defaultLocale;
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";

  return (normalized || fallback).slice(0, maxLength);
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

export async function POST(request: Request) {
  let body: MockLaunchRequestBody;

  try {
    body = (await request.json()) as MockLaunchRequestBody;
  } catch {
    return jsonError("Invalid mock AI Star launch request.", 400);
  }

  const defaults = getSampleLaunchDefaults();
  const locale = normalizeLocale(body.locale);
  const name = normalizeText(body.name, defaults.name, 64);
  const sourceUniverseName = normalizeText(
    body.sourceUniverseName,
    defaults.sourceUniverseName,
    96,
  );
  const sourceStarId = normalizeText(body.sourceStarId, defaults.sourceStarId, 96);
  const ownerName = normalizeText(body.ownerName, defaults.ownerName, 64);
  const launchCostUsdt = normalizeLaunchCost(body.launchCostUsdt);
  const session = await readMemberServerSession();
  const id = `mock-${slugify(name)}-${slugify(sourceStarId)}`;

  return Response.json({
    launch: {
      createdAt: new Date().toISOString(),
      createdByUnlock: true,
      id,
      launchCostUsdt,
      name,
      ownerName,
      sourceUniverseName,
      spawnedFromStarId: sourceStarId,
      status: "draft",
      universeName: `${name} Universe`,
    },
    mode: "mock",
    next: {
      creatorUnlockHref: `/${locale}/fanletter/creator-unlock`,
      founderClubHref: `/${locale}/fanletter/founder-club`,
    },
    payment: {
      amountUsdt: launchCostUsdt,
      status: "mock_only",
    },
    session: {
      email: session?.email ?? null,
      hasMemberSession: Boolean(session?.email),
      walletAddress: session?.walletAddress ?? null,
    },
  });
}
