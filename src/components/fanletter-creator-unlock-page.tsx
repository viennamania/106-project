import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  Sparkles,
} from "lucide-react";

import {
  CreatorUnlockCard,
  HumanMemberAvatar,
  MemberPortfolio,
} from "@/components/fanletter-founder-club-v2";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type CreatorUnlockData,
  type MemberOwnedAIStar,
  type MemberPortfolio as MemberPortfolioData,
  type SpawnedAIStar,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

function getLaunchPageCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      back: "FanLetter 홈",
      category: "카테고리",
      cost: "10 USDT 미리보기",
      draft: "준비 중",
      fieldsTitle: "새 AI 스타 생성 미리보기",
      heroBody:
        "크리에이터 해금 이후 여러 AI 스타를 만들 수 있는 흐름을 실제 결제 없이 먼저 검증합니다.",
      heroEyebrow: "크리에이터 해금",
      heroTitle: "Founder가 성장하면 새 AI 스타를 출시합니다",
      mockActivation: "미리보기 활성화",
      mockNotice:
        "실결제와 영구 저장은 아직 실행하지 않습니다. 이 화면은 생성 전 구조와 포트폴리오 반영 방식을 확인하는 미리보기입니다.",
      name: "AI 스타 이름",
      nextPortfolio: "생성 후 포트폴리오 반영",
      owner: "소유 멤버",
      preview: "AI 스타 카드 미리보기",
      source: "원천 유니버스",
      steps: [
        "크리에이터 조건 충족",
        "원천 유니버스 선택",
        "10 USDT 조건 미리보기",
        "내가 만든 AI 스타에 반영",
      ],
      submit: "Mock 생성 준비 완료",
      subtitle: "실제 결제 전",
    };
  }

  if (locale === "ja") {
    return {
      back: "FanLetter Home",
      category: "Category",
      cost: "10 USDT preview",
      draft: "Draft",
      fieldsTitle: "New AI Star launch preview",
      heroBody:
        "After Creator Unlock, the member can validate a multi-AI-Star launch flow before real checkout.",
      heroEyebrow: "Creator Unlock",
      heroTitle: "Founders grow into Creators who launch new AI Stars",
      mockActivation: "Mock activation",
      mockNotice:
        "No real payment or permanent write runs here. This preview checks the launch structure and portfolio reflection.",
      name: "AI Star name",
      nextPortfolio: "Portfolio reflection",
      owner: "Owner member",
      preview: "AI Star card preview",
      source: "Source Universe",
      steps: [
        "Meet Creator conditions",
        "Select source Universe",
        "Preview 10 USDT condition",
        "Reflect in owned AI Stars",
      ],
      submit: "Mock launch ready",
      subtitle: "Before real payment",
    };
  }

  return {
    back: "FanLetter Home",
    category: "Category",
    cost: "10 USDT preview",
    draft: "Draft",
    fieldsTitle: "New AI Star launch preview",
    heroBody:
      "After Creator Unlock, the member can validate a multi-AI-Star launch flow before real checkout.",
    heroEyebrow: "Creator Unlock",
    heroTitle: "Founders grow into Creators who launch new AI Stars",
    mockActivation: "Mock activation",
    mockNotice:
      "No real payment or permanent write runs here. This preview checks the launch structure and portfolio reflection.",
    name: "AI Star name",
    nextPortfolio: "Portfolio reflection",
    owner: "Owner member",
    preview: "AI Star card preview",
    source: "Source Universe",
    steps: [
      "Meet Creator conditions",
      "Select source Universe",
      "Preview 10 USDT condition",
      "Reflect in owned AI Stars",
    ],
    submit: "Mock launch ready",
    subtitle: "Before real payment",
  };
}

function getDisplayUniverseName(name: string, locale: Locale) {
  if (locale !== "ko") {
    return name;
  }

  const replacements: Record<string, string> = {
    "Founder Club Universe": "파운더 클럽 유니버스",
    "Harin Universe": "하린 유니버스",
    "Minseo Universe": "민서 유니버스",
    "Ria Universe": "리아 유니버스",
    "Seoyeon Universe": "서연 유니버스",
    "Yoonseo Universe": "윤서 유니버스",
  };

  return replacements[name] ?? name.replace(/\bUniverse\b/g, "유니버스");
}

function getSampleSpawnedStar(): SpawnedAIStar {
  return fanletterV2Mock.aiStars[0].spawnedStars[0];
}

function getLaunchPreview({
  locale,
  portfolio,
  unlock,
}: {
  locale: Locale;
  portfolio: MemberPortfolioData;
  unlock: CreatorUnlockData;
}) {
  const sampleStar = getSampleSpawnedStar();
  const launchPreview = unlock.launchPreview;
  const name = launchPreview?.newStarName ?? sampleStar.name;
  const ownerName = launchPreview?.ownerName ?? portfolio.memberName;
  const sourceUniverseName =
    launchPreview?.sourceUniverseName ??
    sampleStar.sourceUniverseName ??
    portfolio.roles[0]?.universeName ??
    "Founder Club Universe";
  const ownedPreview: MemberOwnedAIStar = {
    createdByUnlock: true,
    id: `mock-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "ai-star"}`,
    launchCostUsdt: unlock.createCostUsdt,
    name,
    sourceUniverseName,
    spawnedFromStarId: sampleStar.spawnedFromStarId ?? null,
    status: "draft",
    universeName: `${name} Universe`,
  };

  return {
    accentColor: sampleStar.accentColor,
    accentSecondary: sampleStar.accentSecondary,
    category: getFanletterV2LocalizedText(sampleStar.specialty, locale),
    initials: sampleStar.portraitInitials || getInitials(name),
    name,
    ownedPreview,
    ownerName,
    sourceUniverseName,
    starScore: sampleStar.starScore,
  };
}

function FieldPreview({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-black/8 bg-white px-3 py-3">
      <p className="text-[0.68rem] font-semibold text-black/44">{label}</p>
      <p className="mt-1 min-h-6 text-sm font-semibold text-black">{value}</p>
    </div>
  );
}

function LaunchAIStarPreviewCard({
  aiStarBadgeLabel,
  category,
  copy,
  initials,
  name,
  sourceUniverseName,
  starScoreLabel,
  starScore,
  unlockCost,
}: {
  aiStarBadgeLabel: string;
  category: string;
  copy: ReturnType<typeof getLaunchPageCopy>;
  initials: string;
  name: string;
  sourceUniverseName: string;
  starScoreLabel: string;
  starScore: number;
  unlockCost: number;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-fuchsia-200 bg-[#160726] text-white shadow-[0_24px_70px_rgba(88,28,135,0.22)]">
      <div className="relative aspect-[4/3] bg-[linear-gradient(145deg,#a855f7,#301052_62%,#12041f)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.76),transparent_18%),radial-gradient(circle_at_76%_24%,rgba(45,212,191,0.72),transparent_24%)]" />
        <div className="absolute inset-x-5 bottom-5 top-12 rounded-t-full bg-white/16 backdrop-blur-[2px]" />
        <div className="absolute bottom-6 left-1/2 flex size-24 -translate-x-1/2 items-center justify-center rounded-full border border-white/28 bg-black/28 text-2xl font-semibold shadow-[0_16px_34px_rgba(0,0,0,0.22)]">
          {initials}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[0.62rem] font-semibold backdrop-blur">
          {aiStarBadgeLabel}
        </span>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-[#4c1d95]">
            {aiStarBadgeLabel}
          </span>
          <span className="rounded-full border border-cyan-100/70 bg-cyan-100 px-3 py-1 text-[0.68rem] font-semibold text-cyan-950">
            {copy.mockActivation}
          </span>
        </div>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-normal">
          {name}
        </h2>
        <p className="mt-1 text-sm font-medium text-white/66">{category}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">{starScore}</p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {starScoreLabel}
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">{unlockCost} USDT</p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.cost}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-white/12 bg-white/8 px-3 py-2 text-xs font-semibold leading-5 text-white/72">
          {copy.source}: {sourceUniverseName}
        </p>
      </div>
    </article>
  );
}

function PortfolioReflectionPreview({
  copy,
  locale,
  ownedStars,
  previewStar,
}: {
  copy: ReturnType<typeof getLaunchPageCopy>;
  locale: Locale;
  ownedStars: MemberOwnedAIStar[];
  previewStar: MemberOwnedAIStar;
}) {
  const reflectedStars = [previewStar, ...ownedStars].slice(0, 4);

  return (
    <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <BadgeCheck className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.nextPortfolio}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.nextPortfolio}
          </h2>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {reflectedStars.map((star, index) => (
          <div
            className={joinClasses(
              "rounded-lg border p-3",
              index === 0
                ? "border-fuchsia-200 bg-[#faf5ff]"
                : "border-black/8 bg-[#f8f7ff]",
            )}
            key={`${star.id}-${index}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-black">
                  {star.name}
                </p>
                <p className="truncate text-xs font-medium text-black/48">
                  {getDisplayUniverseName(
                    star.universeName ?? `${star.name} Universe`,
                    locale,
                  )}
                </p>
              </div>
              <span className="rounded-full bg-[#12041f] px-2.5 py-1 text-[0.62rem] font-semibold text-white">
                AI STAR
              </span>
            </div>
            {star.sourceUniverseName ? (
              <p className="mt-3 truncate text-xs font-semibold text-[#6d28d9]">
                {copy.source}:{" "}
                {getDisplayUniverseName(star.sourceUniverseName, locale)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FanletterCreatorUnlockPage({
  creatorUnlock,
  locale,
  memberPortfolio,
}: {
  creatorUnlock?: CreatorUnlockData | null;
  locale: Locale;
  memberPortfolio?: MemberPortfolioData | null;
}) {
  const v2Copy = getFanletterV2Copy(locale);
  const copy = getLaunchPageCopy(locale);
  const portfolio: MemberPortfolioData =
    memberPortfolio ?? fanletterV2Mock.memberPortfolio;
  const unlock: CreatorUnlockData =
    creatorUnlock ?? fanletterV2Mock.creatorUnlock;
  const launchPreview = getLaunchPreview({
    locale,
    portfolio,
    unlock,
  });
  const sourceUniverseName = getDisplayUniverseName(
    launchPreview.sourceUniverseName,
    locale,
  );
  const memberInitials =
    portfolio.memberInitials ?? getInitials(portfolio.memberName);

  return (
    <main className="min-h-screen bg-[#fbfaff] px-4 py-5 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[92rem]">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-[#5b21b6] transition hover:bg-violet-50"
            href={`/${locale}/fanletter#creator-unlock`}
          >
            <ArrowLeft className="size-4" />
            {copy.back}
          </Link>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" />
            {copy.subtitle}
          </span>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#6d28d9]">
              <Crown className="size-4" />
              {copy.heroEyebrow}
            </div>
            <h1 className="mt-5 max-w-4xl text-[2.55rem] font-semibold leading-[1.02] tracking-normal text-[#12041f] [word-break:keep-all] sm:text-[4.4rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/62 sm:text-lg">
              {copy.heroBody}
            </p>
          </div>

          <div className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
            <div className="flex items-center gap-3">
              <HumanMemberAvatar
                member={{ initials: memberInitials, name: portfolio.memberName }}
                size="lg"
              />
              <div>
                <p className="text-sm font-semibold text-black/48">
                  {copy.owner}
                </p>
                <p className="text-2xl font-semibold text-black">
                  {portfolio.memberName}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {copy.steps.map((step, index) => (
                <div
                  className="rounded-lg border border-violet-100 bg-[#f8f7ff] p-2"
                  key={step}
                >
                  <p className="text-xs font-semibold text-[#6d28d9]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-4 text-[#26113d]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid min-w-0 gap-4">
            <CreatorUnlockCard
              copy={v2Copy}
              locale={locale}
              unlock={unlock}
            />
            <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#6d28d9]">
                    {copy.mockActivation}
                  </p>
                  <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
                    {copy.fieldsTitle}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-black/62">
                    {copy.mockNotice}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <FieldPreview label={copy.name} value={launchPreview.name} />
                <FieldPreview label={copy.category} value={launchPreview.category} />
                <FieldPreview label={copy.source} value={sourceUniverseName} />
                <FieldPreview
                  label={copy.cost}
                  value={`${unlock.createCostUsdt} USDT · ${copy.mockActivation}`}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CircleDollarSign className="size-5" />
                  {copy.submit}
                </div>
                <span className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white">
                  {unlock.createCostUsdt} USDT
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </section>
          </div>

          <div className="grid min-w-0 gap-4">
            <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
                  <Bot className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#6d28d9]">
                    {copy.preview}
                  </p>
                  <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
                    {copy.preview}
                  </h2>
                </div>
              </div>
              <LaunchAIStarPreviewCard
                aiStarBadgeLabel={v2Copy.labels.aiStarBadge}
                category={launchPreview.category}
                copy={copy}
                initials={launchPreview.initials}
                name={launchPreview.name}
                sourceUniverseName={sourceUniverseName}
                starScoreLabel={v2Copy.labels.starScore}
                starScore={launchPreview.starScore}
                unlockCost={unlock.createCostUsdt}
              />
            </section>

            <PortfolioReflectionPreview
              copy={copy}
              locale={locale}
              ownedStars={portfolio.ownedStars ?? []}
              previewStar={launchPreview.ownedPreview}
            />
          </div>
        </section>

        <section className="mt-4">
          <MemberPortfolio
            copy={v2Copy}
            locale={locale}
            portfolio={portfolio}
          />
        </section>
      </div>
    </main>
  );
}
