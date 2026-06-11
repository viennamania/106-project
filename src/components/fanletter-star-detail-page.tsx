import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Crown,
  ShieldCheck,
  Share2,
  Users,
} from "lucide-react";

import {
  AIStarCard,
  FounderRoleBadge,
  FounderUniversePreview,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
import { FanletterStarReferralPanel } from "@/components/fanletter-star-referral-panel";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type AIStar,
  type ScoutShareLoopData,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";

type StarDetailViewerState = "founder" | "guest" | "member";

type StarPrimaryAction = {
  helper: string;
  href: string;
  label: string;
  status: string;
  variant: "connect" | "join" | "share";
};

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function buildReferralCode(star: AIStar) {
  const starToken =
    star.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ||
    star.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return `${(starToken || "STAR").slice(0, 12)}-A-001`;
}

function isKoreanCopy(copy: ReturnType<typeof getFanletterV2Copy>) {
  return copy.labels.humanMember === "일반 멤버";
}

function getDisplayUniverseName(
  name: string,
  copy: ReturnType<typeof getFanletterV2Copy>,
) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    "Harin Universe": "하린 유니버스",
    "Minseo Universe": "민서 유니버스",
    "Ria Universe": "리아 유니버스",
    "Seoyeon Universe": "서연 유니버스",
    "Yoonseo Universe": "윤서 유니버스",
  };

  return replacements[name] ?? name.replace(/\bUniverse\b/g, "유니버스");
}

function getDisplayStarName(
  name: string,
  copy: ReturnType<typeof getFanletterV2Copy>,
) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    Harin: "하린",
    Lumi: "루미",
    Minseo: "민서",
    Mira: "미라",
    Noa: "노아",
    Ria: "리아",
    Seoyeon: "서연",
    Yoonseo: "윤서",
  };

  return replacements[name] ?? name;
}

function getDisplayMemberName(
  name: string,
  copy: ReturnType<typeof getFanletterV2Copy>,
) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    "Member A": "회원 A",
    "Member B": "회원 B",
    "New member": "신규 회원",
  };

  return replacements[name.trim()] ?? name;
}

function buildShareLink({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}) {
  const url = new URL(
    `/${locale}/fanletter/${encodeURIComponent(star.id)}`,
    "https://www.net402.ai",
  );
  url.searchParams.set("ref", referralCode);

  return url.toString();
}

function buildJoinHref({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode?: string | null;
  star: AIStar;
}) {
  const params = new URLSearchParams({
    star: star.id,
  });

  if (referralCode) {
    params.set("ref", referralCode);
  }

  return `/${locale}/fanletter/onboarding?${params.toString()}`;
}

function buildConnectHref({
  locale,
  referralCode,
  returnToHref,
}: {
  locale: Locale;
  referralCode?: string | null;
  returnToHref: string;
}) {
  const params = new URLSearchParams({
    returnTo: returnToHref,
  });

  if (referralCode) {
    params.set("ref", referralCode);
  }

  return `/${locale}/fanletter/connect?${params.toString()}`;
}

function buildMockScoutLoop({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}): ScoutShareLoopData {
  return {
    ...fanletterV2Mock.scoutShareLoop,
    referralCode,
    selectedUniverse: star.universeName,
    shareLink: buildShareLink({
      locale,
      referralCode,
      star,
    }),
    starId: star.id,
    starName: star.name,
  };
}

function getStarDetailViewerState({
  isAuthenticated,
  viewerScoutShareLoop,
}: {
  isAuthenticated: boolean;
  viewerScoutShareLoop?: ScoutShareLoopData | null;
}): StarDetailViewerState {
  if (viewerScoutShareLoop) {
    return "founder";
  }

  return isAuthenticated ? "member" : "guest";
}

function getPrimaryAction({
  connectHref,
  copy,
  viewerState,
}: {
  connectHref: string;
  copy: ReturnType<typeof getFanletterV2Copy>;
  viewerState: StarDetailViewerState;
}): StarPrimaryAction {
  const isKorean = isKoreanCopy(copy);

  if (viewerState === "founder") {
    return {
      helper: isKorean
        ? "이미 이 AI 스타의 파운더입니다. 내 링크로 새 파운더를 초대하세요."
        : "You are already a Founder for this AI Star. Invite new Founders with your link.",
      href: "#referral-builder",
      label: isKorean ? "내 추천 링크 공유" : "Share my Founder link",
      status: isKorean ? "파운더 인증됨" : "Founder active",
      variant: "share",
    };
  }

  if (viewerState === "member") {
    return {
      helper: isKorean
        ? "계정은 연결되어 있습니다. Founder 상태를 확인하면 이 AI 스타 유니버스 참여가 완료됩니다."
        : "Your account is connected. Confirm Founder status to complete this AI Star universe join.",
      href: connectHref,
      label: isKorean ? "Founder 상태 확인" : "Confirm Founder status",
      status: isKorean ? "계정 연결됨" : "Account connected",
      variant: "connect",
    };
  }

  return {
    helper: isKorean
      ? "계정을 연결하면 이 AI 스타의 파운더 참여와 추천 보상을 이어갈 수 있습니다."
      : "Connect your account to join this AI Star and keep referral attribution.",
    href: connectHref,
    label: isKorean ? "계정 연결하고 참여" : "Connect to join",
    status: isKorean ? "계정 연결 필요" : "Connect account",
    variant: "connect",
  };
}

function StarActionLink({
  action,
  className,
  children,
}: {
  action: StarPrimaryAction;
  children?: ReactNode;
  className: string;
}) {
  if (action.href.startsWith("#")) {
    return (
      <a className={className} href={action.href}>
        {children ?? action.label}
      </a>
    );
  }

  return (
    <Link className={className} href={action.href}>
      {children ?? action.label}
    </Link>
  );
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-violet-200 bg-white p-3 shadow-[0_14px_32px_rgba(88,28,135,0.08)]">
      <p className="text-2xl font-semibold leading-none text-[#12041f]">
        {value}
      </p>
      <p className="mt-2 text-[0.68rem] font-semibold uppercase text-black/48">
        {label}
      </p>
    </div>
  );
}

function StarFounderMobilePanel({
  action,
  copy,
  loop,
  referralCode,
  star,
}: {
  action: StarPrimaryAction;
  copy: ReturnType<typeof getFanletterV2Copy>;
  loop: ScoutShareLoopData;
  referralCode: string;
  star: AIStar;
}) {
  const founderMember = {
    initials: "A",
    name: getDisplayMemberName(loop.sourceMember, copy),
  };
  const displayStarName = getDisplayStarName(star.name, copy);
  const mobileAIStarBadgeLabel = isKoreanCopy(copy)
    ? "AI스타"
    : copy.labels.aiStarBadge;
  const portraitBackground = star.portraitImageUrl
    ? `linear-gradient(180deg, rgba(18,4,31,0.04), rgba(18,4,31,0.72)), url("${star.portraitImageUrl}")`
    : `radial-gradient(circle at 30% 18%, rgba(255,255,255,0.86), transparent 18%), radial-gradient(circle at 72% 22%, ${star.accentSecondary}, transparent 24%), linear-gradient(145deg, ${star.accentColor}, #31105f 64%, #12041f)`;

  return (
    <div className="rounded-lg border border-violet-200 bg-white p-3 shadow-[0_22px_54px_rgba(88,28,135,0.12)]">
      <div className="grid grid-cols-[1fr_1.75rem_0.8fr] items-stretch gap-2">
        <div
          className="relative min-h-44 overflow-hidden rounded-lg border border-fuchsia-200 bg-cover bg-center p-3 text-white"
          style={{
            background: portraitBackground,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#12041f]/82 via-transparent to-white/10" />
          <div className="relative z-10 flex min-w-0 items-center justify-between gap-1.5">
            <span
              aria-label={copy.labels.aiStarBadge}
              className="shrink-0 whitespace-nowrap rounded-full bg-white px-2 py-1 text-[0.58rem] font-semibold leading-none text-[#5b21b6]"
            >
              {mobileAIStarBadgeLabel}
            </span>
            <span
              aria-label={`${copy.labels.starScore} ${star.starScore}`}
              className="shrink-0 rounded-full border border-white/18 bg-white/16 px-2 py-1 text-[0.58rem] font-semibold leading-none backdrop-blur"
            >
              {star.starScore}
            </span>
          </div>
          {!star.portraitImageUrl ? (
            <div className="absolute inset-x-6 bottom-12 top-12 rounded-t-full bg-white/16 backdrop-blur-[2px]" />
          ) : null}
          <div className="relative z-10 flex min-h-32 flex-col justify-end">
            <div className="flex size-14 items-center justify-center rounded-full border border-white/28 bg-black/24 text-lg font-semibold shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
              {star.portraitInitials}
            </div>
            <p className="mt-2 text-xl font-semibold leading-none">
              {displayStarName}
            </p>
            <p className="mt-1 text-[0.7rem] font-semibold text-white/72">
              +{star.growthPercent}% {copy.labels.growth}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="size-5 text-[#7c3aed]" />
        </div>

        <div className="flex min-h-44 flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase text-zinc-500">
              {copy.labels.humanMember}
            </p>
            <div className="mt-3">
              <HumanMemberAvatar member={founderMember} size="lg" />
            </div>
            <p className="mt-2 text-sm font-semibold text-zinc-950">
              {founderMember.name}
            </p>
          </div>
          <FounderRoleBadge copy={copy} role="founder" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#f7f2ff] p-2">
          <p className="text-lg font-semibold leading-none">
            +{loop.rewards.cp}
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold text-black/48">CP</p>
        </div>
        <div className="rounded-lg bg-[#eefcf4] p-2">
          <p className="text-lg font-semibold leading-none">
            +{loop.rewards.influenceScore}
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold text-black/48">
            {copy.labels.influenceScore}
          </p>
        </div>
        <div className="rounded-lg bg-[#fff7ed] p-2">
          <p className="text-lg font-semibold leading-none">
            +{loop.rewards.creatorProgressPercent}%
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold text-black/48">
            {copy.labels.creatorProgress}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-black/8 bg-[#fafafa] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.68rem] font-semibold text-black/48">
            {action.status}
          </span>
          <span className="truncate font-mono text-sm font-semibold text-[#5b21b6]">
            {referralCode}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <StarActionLink
          action={action}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(124,58,237,0.22)]"
        >
          {action.label}
          <ArrowRight className="size-4" />
        </StarActionLink>
        <a
          aria-label={copy.actions.createMockReferral}
          className="inline-flex size-12 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-[#6d28d9]"
          href="#referral-builder"
        >
          <Share2 className="size-5" />
        </a>
      </div>
    </div>
  );
}

function HumanFounderSlots({
  copy,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  star: AIStar;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Users className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-black/50">
            {copy.roles.founder}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-black">
            {copy.starDetail.founderSlotsTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.starDetail.founderSlotsBody}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {star.founderSlots.map((slot) => {
          const displaySlot = {
            ...slot,
            name: getDisplayMemberName(slot.name, copy),
          };

          return (
            <div
              className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              key={`${slot.name}-${slot.role}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <HumanMemberAvatar member={displaySlot} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {displaySlot.name}
                  </p>
                  <p className="text-xs font-medium text-zinc-500">
                    {copy.labels.humanMember}
                  </p>
                </div>
              </div>
              <FounderRoleBadge copy={copy} role={slot.role} />
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SpawnedStarsSection({
  copy,
  locale,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  locale: Locale;
  star: AIStar;
}) {
  return (
    <article className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <Bot className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.spawnedStars}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.starDetail.spawnedTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.starDetail.spawnedBody}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {star.spawnedStars.map((spawnedStar) => {
          const sourceUniverseName = spawnedStar.sourceUniverseName
            ? getDisplayUniverseName(spawnedStar.sourceUniverseName, copy)
            : null;
          const displaySpawnedStarName = getDisplayStarName(
            spawnedStar.name,
            copy,
          );

          return (
            <Link
              className="rounded-lg border border-fuchsia-200/70 p-3 text-white shadow-[0_16px_34px_rgba(88,28,135,0.16)] transition hover:-translate-y-0.5"
              href={`/${locale}/fanletter/${spawnedStar.id}`}
              key={spawnedStar.id}
              style={{
                background: `linear-gradient(145deg, ${spawnedStar.accentColor}, #21103d 72%)`,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-12 items-center justify-center rounded-lg border border-white/18 text-sm font-semibold"
                  style={{
                    background: `linear-gradient(145deg, ${spawnedStar.accentSecondary}, rgba(255,255,255,0.16))`,
                  }}
                >
                  {spawnedStar.portraitInitials}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.66rem] font-semibold text-fuchsia-100">
                    {copy.labels.aiStarBadge}
                  </p>
                  <p className="truncate text-lg font-semibold">
                    {displaySpawnedStarName}
                  </p>
                  <p className="truncate text-xs font-medium text-white/60">
                    {getFanletterV2LocalizedText(
                      spawnedStar.specialty,
                      locale,
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-white/70">
                <span>
                  {copy.labels.starScore} {spawnedStar.starScore}
                </span>
                <span>
                  +{spawnedStar.growthPercent}% {copy.labels.growth}
                </span>
              </div>
              {spawnedStar.createdByUnlock || sourceUniverseName ? (
                <div className="mt-3 rounded-lg border border-white/12 bg-white/8 p-2 text-[0.68rem] font-semibold leading-4 text-white/72">
                  {sourceUniverseName ? (
                    <p className="truncate">
                      {copy.labels.sourceUniverse}: {sourceUniverseName}
                    </p>
                  ) : null}
                  {spawnedStar.createdByUnlock ? (
                    <p className="truncate">{copy.labels.createdByUnlock}</p>
                  ) : null}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </article>
  );
}

export function FanletterStarDetailPage({
  isAuthenticated = false,
  inboundReferralCode,
  locale,
  relatedStars,
  star,
  viewerScoutShareLoop,
}: {
  isAuthenticated?: boolean;
  inboundReferralCode?: string | null;
  locale: Locale;
  relatedStars: AIStar[];
  star: AIStar;
  viewerScoutShareLoop?: ScoutShareLoopData | null;
}) {
  const copy = getFanletterV2Copy(locale);
  const viewerState = getStarDetailViewerState({
    isAuthenticated,
    viewerScoutShareLoop,
  });
  const fallbackReferralCode = inboundReferralCode ?? buildReferralCode(star);
  const fallbackLoop = buildMockScoutLoop({
    locale,
    referralCode: fallbackReferralCode,
    star,
  });
  const loop = viewerScoutShareLoop ?? fallbackLoop;
  const effectiveInboundReferralCode = viewerScoutShareLoop
    ? null
    : inboundReferralCode;
  const referralCode = effectiveInboundReferralCode ?? loop.referralCode;
  const joinHref = buildJoinHref({
    locale,
    referralCode,
    star,
  });
  const connectHref = buildConnectHref({
    locale,
    referralCode,
    returnToHref: joinHref,
  });
  const primaryAction = getPrimaryAction({
    connectHref,
    copy,
    viewerState,
  });
  const isKorean = isKoreanCopy(copy);
  const displayStarName = getDisplayStarName(star.name, copy);

  return (
    <main className="min-h-screen bg-[#fbfaff] pb-28 text-black">
      <section
        className="overflow-hidden border-b border-violet-200 bg-[#fbfaff] px-4 pb-8 pt-5 text-black sm:px-6 sm:pb-16 sm:pt-6 lg:px-8"
        style={{
          background: `radial-gradient(circle at 12% 8%, ${star.accentColor}1f, transparent 34%), radial-gradient(circle at 84% 10%, ${star.accentSecondary}24, transparent 30%), linear-gradient(180deg, #ffffff 0%, #fbfaff 58%, #f3efff 100%)`,
        }}
      >
        <div className="mx-auto max-w-[92rem]">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-3 text-sm font-semibold text-[#5b21b6] shadow-[0_12px_28px_rgba(88,28,135,0.08)] transition hover:border-violet-300 hover:bg-violet-50"
              href={`/${locale}/fanletter#top-growing-ai-stars`}
            >
              <ArrowLeft className="size-4" />
              {copy.actions.openDiscovery}
            </Link>
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 sm:hidden">
              <ShieldCheck className="size-4" />
              {isKorean ? "미리보기" : "Mock"}
            </span>
            <span className="hidden h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 sm:inline-flex">
              <ShieldCheck className="size-4" />
              {copy.starDetail.mockNotice}
            </span>
          </div>

          <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_24rem] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#6d28d9] shadow-[0_10px_24px_rgba(88,28,135,0.08)]">
                <Crown className="size-4" />
                {copy.starDetail.heroEyebrow}
              </div>
              <h1 className="mt-4 max-w-4xl text-[2.55rem] font-semibold leading-[0.98] tracking-normal [word-break:keep-all] sm:mt-5 sm:text-[5rem]">
                {displayStarName}
                <span className="block text-[#6d28d9]">
                  {copy.starDetail.universeTitle}
                </span>
              </h1>
              <p className="mt-5 hidden max-w-2xl text-base font-medium leading-7 text-black/64 sm:block sm:text-lg">
                {copy.starDetail.heroBody}
              </p>
              <div className="mt-4 hidden max-w-2xl rounded-lg border border-violet-200 bg-white/80 p-3 shadow-[0_14px_34px_rgba(88,28,135,0.08)] sm:block">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#5b21b6]">
                      {primaryAction.status}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-black/58">
                      {primaryAction.helper}
                    </p>
                  </div>
                  <span className="rounded-full border border-black/8 bg-[#fafafa] px-3 py-1 font-mono text-xs font-semibold text-[#5b21b6]">
                    {referralCode}
                  </span>
                </div>
              </div>

              <div className="mt-5 sm:hidden">
                <StarFounderMobilePanel
                  action={primaryAction}
                  copy={copy}
                  loop={loop}
                  referralCode={referralCode}
                  star={star}
                />
              </div>

              <div className="mt-6 hidden gap-2 sm:grid sm:grid-cols-3">
                <MetricTile
                  label={copy.labels.starScore}
                  value={String(star.starScore)}
                />
                <MetricTile
                  label={copy.labels.growth}
                  value={`+${star.growthPercent}%`}
                />
                <MetricTile
                  label={copy.labels.openSlots}
                  value={`${star.openSlots.open}/${star.openSlots.total}`}
                />
              </div>

              <div className="mt-6 hidden flex-col gap-2 sm:flex sm:flex-row">
                <StarActionLink
                  action={primaryAction}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(124,58,237,0.22)] transition hover:bg-[#6d28d9]"
                >
                  {primaryAction.label}
                  <ArrowRight className="size-4" />
                </StarActionLink>
                {primaryAction.variant !== "share" ? (
                  <a
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-5 text-sm font-semibold text-[#5b21b6] transition hover:border-violet-300 hover:bg-violet-50"
                    href="#referral-builder"
                  >
                    {copy.actions.createMockReferral}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="hidden lg:block">
              <AIStarCard copy={copy} isSelected locale={locale} star={star} />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-[92rem] gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <FanletterStarReferralPanel
            copy={copy}
            inboundReferralCode={effectiveInboundReferralCode}
            joinHref={primaryAction.href}
            loop={loop}
            primaryActionHref={primaryAction.href}
            primaryActionLabel={primaryAction.label}
          />
          <div className="grid gap-4">
            <HumanFounderSlots copy={copy} star={star} />
            <SpawnedStarsSection copy={copy} locale={locale} star={star} />
          </div>
        </div>

        <div className="mx-auto max-w-[92rem]">
          <FounderUniversePreview copy={copy} locale={locale} stars={[star]} />
        </div>

        <div className="mx-auto mt-12 max-w-[92rem]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#6d28d9]">
                {copy.labels.aiStarDiscovery}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#12041f]">
                {copy.topGrowingStars.title}
              </h2>
            </div>
            <Link
              className="hidden h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-[#7c3aed]/40 hover:text-[#5b21b6] sm:inline-flex"
              href={`/${locale}/fanletter#top-growing-ai-stars`}
            >
              {copy.actions.openDiscovery}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {relatedStars.map((relatedStar) => (
              <AIStarCard
                copy={copy}
                detailHref={`/${locale}/fanletter/${relatedStar.id}`}
                key={relatedStar.id}
                locale={locale}
                star={relatedStar}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg border border-black/10 bg-white p-3 text-center">
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(star.founderCount, locale)}
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                {copy.labels.founderCount}
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(loop.rewards.cp, locale)}
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                CP
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(fanletterV2Mock.creatorUnlock.createCostUsdt, locale)} USDT
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                {copy.creatorUnlock.title}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
