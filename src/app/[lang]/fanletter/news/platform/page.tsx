import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  Blocks,
  Camera,
  CheckCircle2,
  Clapperboard,
  Coins,
  Eye,
  FileText,
  HandHeart,
  LockKeyhole,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterNewsPlatformSearchParams = {
  ref?: string | string[];
};

const HERO_IMAGE = "/landing/premium-phone.png?v=20260415";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        title: "FanLetter 플랫폼 모델",
        description:
          "팬이 AI 캐릭터 IP를 함께 키우고, 브이로그 수익을 USDT 기반 정산으로 투명하게 나누는 FanLetter News 랜딩 페이지입니다.",
        brand: "FanLetter",
        eyebrow: "AI Character IP Profit Sharing",
        heroTitle:
          "팬이 키운 AI 캐릭터 IP의 수익을 USDT로 투명하게 나눕니다",
        heroBody:
          "FanLetter는 AI 캐릭터의 One Scene 모바일 브이로그를 포토 뉴스로 확산하고, 요청·보고싶어요·리포트·구매 전환 같은 팬 참여를 기여도로 기록해 수익 공유 구조로 연결합니다.",
        primaryCta: "뉴스 홈 보기",
        secondaryCta: "리포터 시작",
        proofBadges: ["One Scene Vlog", "Photo News", "USDT Settlement"],
        heroStats: [
          { label: "원본 콘텐츠", value: "Vlog", hint: "모바일 숏폼 장면" },
          { label: "확산 콘텐츠", value: "News", hint: "포토 뉴스 리포트" },
          { label: "정산 기준", value: "USDT", hint: "블록체인 지급 기록" },
        ],
        newsroomPreview: {
          label: "PHOTO NEWS",
          title: "대표 티저 이미지가 뉴스의 첫 훅이 됩니다",
          body:
            "브이로그의 티저 컷과 대표 이미지를 편집해 소비자가 원본 장면을 보고 싶게 만드는 뉴스 포맷으로 노출합니다.",
        },
        modelTitle: "하나의 브이로그가 IP 수익 구조가 되는 방식",
        modelBody:
          "뉴스는 홍보용이고, 브이로그는 실제 소비 대상입니다. 팬 참여가 많을수록 캐릭터 IP의 콘텐츠, 뉴스, 구매, 정산 기록이 함께 축적됩니다.",
        modelSteps: [
          {
            title: "Persona",
            body:
              "AI 캐릭터의 외모, 말투, 일상, 세계관을 지속적으로 축적합니다.",
          },
          {
            title: "One Scene Vlog",
            body:
              "캐릭터가 하나의 장면에서 카메라를 바라보며 말하거나 행동하는 모바일 숏폼 원본입니다.",
          },
          {
            title: "Photo News",
            body:
              "대표 티저와 장면 이미지를 포토 뉴스로 편집해 브이로그 소비를 유도합니다.",
          },
          {
            title: "Participation",
            body:
              "팬 요청, 보고싶어요, 리포트 작성, 공유, 구매 전환을 기여 이벤트로 기록합니다.",
          },
          {
            title: "USDT Sharing",
            body:
              "수익이 발생하면 기여도 기준으로 보상 내역을 만들고 USDT 정산 기록으로 투명성을 높입니다.",
          },
        ],
        participationTitle: "팬 참여가 캐릭터 IP의 성장 자산이 됩니다",
        participationBody:
          "단순한 좋아요가 아니라, 다음 장면을 만들고 뉴스 확산과 구매 전환에 영향을 준 행동을 분리해서 추적합니다.",
        participationItems: [
          {
            title: "팬",
            body:
              "보고 싶은 장면을 요청하고, 보고싶어요와 구매로 캐릭터의 다음 콘텐츠 수요를 만듭니다.",
            metric: "Request · Vote · Purchase",
          },
          {
            title: "팬 리포터",
            body:
              "브이로그를 포토 뉴스로 포장해 더 많은 팬이 원본 콘텐츠를 소비하게 만듭니다.",
            metric: "Report · Share · Conversion",
          },
          {
            title: "브이로거",
            body:
              "캐릭터 페르소나를 기준으로 공개/팬 전용 브이로그를 제작하고 IP 자산을 늘립니다.",
            metric: "Create · Upload · Monetize",
          },
        ],
        settlementTitle: "USDT 정산이 공정성을 설명합니다",
        settlementBody:
          "FanLetter의 핵심은 참여 기록과 수익 기록을 분리하지 않는 것입니다. 누가 어떤 행동으로 매출에 기여했는지 남기고, 정산 결과를 USDT 기준으로 확인할 수 있게 설계합니다.",
        settlementItems: [
          "구매, 언락, 팬 요청 결제를 수익 이벤트로 기록",
          "리포트, 보고싶어요, 공유, 구매 전환을 기여 이벤트로 기록",
          "보상 포인트와 USDT 지급 내역을 정산 로그로 연결",
        ],
        settlementEyebrow: "Transparent Settlement",
        ledgerTitle: "USDT 기준으로 설명 가능한 보상 기록",
        ledgerEyebrow: "Reward Ledger",
        eventLabels: {
          contribution: "Contribution Event",
          revenue: "Revenue Event",
          settlement: "USDT Settlement",
        },
        loopTitle: "뉴스는 유입, 브이로그는 소비, 정산은 신뢰입니다",
        loopBody:
          "이 세 가지가 연결될 때 팬은 단순 소비자가 아니라 AI 캐릭터 IP의 성장 파트너가 됩니다.",
        ctaTitle: "FanLetter News에서 캐릭터 IP 성장 흐름을 확인하세요",
        ctaBody:
          "뉴스 홈에서 포토 뉴스와 AI 캐릭터를 둘러보고, 리포터 데스크에서 직접 브이로그 기반 리포트를 작성할 수 있습니다.",
        ctaNews: "뉴스 홈",
        ctaCharacters: "AI 캐릭터",
        ctaReports: "리포터 데스크",
      }
    : {
        title: "FanLetter Platform Model",
        description:
          "A FanLetter News landing page for fan-powered AI character IP growth and transparent USDT-based profit sharing.",
        brand: "FanLetter",
        eyebrow: "AI Character IP Profit Sharing",
        heroTitle:
          "Fans grow AI character IP, and revenue is shared transparently in USDT",
        heroBody:
          "FanLetter turns One Scene mobile AI character vlogs into photo news, records fan participation such as requests, votes, reports, and purchase conversion, then connects that contribution trail to profit sharing.",
        primaryCta: "Open news home",
        secondaryCta: "Start reporting",
        proofBadges: ["One Scene Vlog", "Photo News", "USDT Settlement"],
        heroStats: [
          { label: "Source content", value: "Vlog", hint: "Mobile shortform scene" },
          { label: "Promotion layer", value: "News", hint: "Photo news report" },
          { label: "Settlement unit", value: "USDT", hint: "Blockchain payout record" },
        ],
        newsroomPreview: {
          label: "PHOTO NEWS",
          title: "The lead teaser image becomes the first hook",
          body:
            "Vlog teaser frames and a selected cover are edited into a photo-news format that makes readers want the original scene.",
        },
        modelTitle: "How one vlog becomes an IP revenue loop",
        modelBody:
          "News is the promotion layer, and the vlog is the product people consume. The more fans participate, the more character IP, news, purchases, and settlement history compound.",
        modelSteps: [
          {
            title: "Persona",
            body:
              "Accumulate the AI character's look, voice, daily life, and world context.",
          },
          {
            title: "One Scene Vlog",
            body:
              "A mobile shortform original where the character faces the camera in one focused scene.",
          },
          {
            title: "Photo News",
            body:
              "Edit lead teasers and scene images into news that drives vlog consumption.",
          },
          {
            title: "Participation",
            body:
              "Record requests, want-to-watch votes, reports, shares, and purchases as contribution events.",
          },
          {
            title: "USDT Sharing",
            body:
              "When revenue happens, contribution-based rewards are settled with a transparent USDT record.",
          },
        ],
        participationTitle: "Fan participation becomes character IP equity",
        participationBody:
          "Fan actions are tracked by role and impact, separating demand creation, reporting, distribution, and purchase conversion.",
        participationItems: [
          {
            title: "Fans",
            body:
              "Request scenes, vote to unlock, and purchase content to create demand for the next character moment.",
            metric: "Request · Vote · Purchase",
          },
          {
            title: "Fan reporters",
            body:
              "Package vlogs as photo news so more fans discover and consume the source content.",
            metric: "Report · Share · Conversion",
          },
          {
            title: "Vloggers",
            body:
              "Produce public and fan-only vlogs from a character persona and grow the IP catalog.",
            metric: "Create · Upload · Monetize",
          },
        ],
        settlementTitle: "USDT settlement makes fairness visible",
        settlementBody:
          "FanLetter keeps participation and revenue connected. It records who contributed to revenue and lets members inspect settlement outcomes in USDT terms.",
        settlementItems: [
          "Record purchases, unlocks, and paid requests as revenue events",
          "Record reports, votes, shares, and purchase conversion as contribution events",
          "Connect reward points and USDT payouts through a settlement ledger",
        ],
        settlementEyebrow: "Transparent Settlement",
        ledgerTitle: "Reward records that can be explained in USDT",
        ledgerEyebrow: "Reward Ledger",
        eventLabels: {
          contribution: "Contribution Event",
          revenue: "Revenue Event",
          settlement: "USDT Settlement",
        },
        loopTitle: "News brings traffic, vlogs drive consumption, settlement builds trust",
        loopBody:
          "When all three are connected, fans become growth partners for AI character IP instead of passive consumers.",
        ctaTitle: "Explore the FanLetter News character IP loop",
        ctaBody:
          "Browse photo news and AI characters, then use the reporter desk to create reports from vlog source content.",
        ctaNews: "News home",
        ctaCharacters: "AI characters",
        ctaReports: "Reporter desk",
      };
}

function FeaturePill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/24 bg-black/24 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] backdrop-blur">
      <CheckCircle2 className="size-3.5 text-[#44f26e]" />
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
      <Sparkles className="size-4" />
      {children}
    </p>
  );
}

function CtaLink({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={
        variant === "primary"
          ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 py-3 text-sm font-black !text-[#071108] shadow-[0_20px_45px_rgba(68,242,110,0.24)] transition hover:translate-y-[-1px] hover:bg-[#5dff82]"
          : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/26 bg-white/10 px-5 py-3 text-sm font-black !text-white backdrop-blur transition hover:border-white/48 hover:bg-white/16"
      }
      href={href}
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsPlatformSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const canonical = buildPathWithReferral(
    `/${locale}/fanletter/news/platform`,
    referralCode,
  );

  return {
    title: `${copy.title} | FanLetter News`,
    description: copy.description,
    alternates: {
      canonical,
    },
    openGraph: {
      description: copy.description,
      images: [
        {
          alt: copy.title,
          height: 1088,
          url: HERO_IMAGE,
          width: 1920,
        },
      ],
      siteName: "FanLetter News",
      title: `${copy.title} | FanLetter News`,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      description: copy.description,
      images: [HERO_IMAGE],
      title: `${copy.title} | FanLetter News`,
    },
  };
}

export default async function FanletterNewsPlatformPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsPlatformSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const newsHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] text-[#111510]">
      <section className="relative min-h-[82svh] overflow-hidden bg-[#071108] text-white sm:min-h-[76svh]">
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover object-center opacity-70"
          fill
          priority
          sizes="100vw"
          src={HERO_IMAGE}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,8,0.94)_0%,rgba(7,17,8,0.76)_44%,rgba(7,17,8,0.34)_100%)]" />
        <div className="relative mx-auto flex min-h-[82svh] max-w-[92rem] flex-col px-4 py-5 sm:min-h-[76svh] sm:px-6 sm:py-7 lg:px-8">
          <header className="flex items-center justify-between gap-4 border-b border-white/14 pb-4">
            <Link
              className="inline-flex items-center gap-2 text-lg font-black !text-white"
              href={newsHref}
            >
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#44f26e] text-[#071108]">
                <Newspaper className="size-5" />
              </span>
              {copy.brand} News
            </Link>
            <Link
              className="hidden min-h-10 items-center justify-center rounded-full border border-white/18 px-4 text-xs font-black uppercase tracking-[0.12em] !text-white/82 transition hover:border-[#44f26e] hover:text-white sm:inline-flex"
              href={charactersHref}
            >
              {copy.ctaCharacters}
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:py-12">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#7cff98]">
                <Blocks className="size-4" />
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:mt-5 sm:text-6xl lg:text-7xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-white/72 [word-break:keep-all] sm:text-lg sm:leading-8">
                {copy.heroBody}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {copy.proofBadges.map((badge) => (
                  <FeaturePill key={badge}>{badge}</FeaturePill>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <CtaLink href={newsHref}>{copy.primaryCta}</CtaLink>
                <CtaLink href={reportsHref} variant="secondary">
                  {copy.secondaryCta}
                </CtaLink>
              </div>
            </div>

            <aside className="grid gap-3">
              <div className="overflow-hidden rounded-lg border border-white/12 bg-white text-[#111510] shadow-[0_26px_80px_rgba(0,0,0,0.28)]">
                <div className="aspect-[9/13] bg-[#101510] p-4 text-white">
                  <div className="flex items-center justify-between text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                    <span>{copy.newsroomPreview.label}</span>
                    <Camera className="size-4" />
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_0.72fr] gap-2">
                    <div className="aspect-[3/4] rounded-lg bg-[url('/landing/global-network-map.png?v=20260415')] bg-cover bg-center shadow-inner" />
                    <div className="grid gap-2">
                      <div className="rounded-lg bg-[#44f26e] p-3 text-[#071108]">
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.14em]">
                          USDT
                        </p>
                        <p className="mt-2 text-2xl font-black">1.00</p>
                      </div>
                      <div className="rounded-lg border border-white/14 bg-white/8 p-3">
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-white/52">
                          Vote
                        </p>
                        <p className="mt-2 text-2xl font-black">6/6</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-5 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                    {copy.newsroomPreview.title}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                    {copy.newsroomPreview.body}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {copy.heroStats.map((stat) => (
                  <div
                    className="min-w-0 rounded-lg border border-white/12 bg-white/10 p-3"
                    key={stat.label}
                  >
                    <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/46">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {stat.value}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[0.66rem] font-bold leading-4 text-white/56">
                      {stat.hint}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <SectionLabel>Platform Loop</SectionLabel>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.modelTitle}
            </h2>
            <p className="mt-4 text-base font-bold leading-7 text-black/60 [word-break:keep-all]">
              {copy.modelBody}
            </p>
          </div>

          <div className="grid gap-3">
            {copy.modelSteps.map((step, index) => {
              const icons = [
                Sparkles,
                Clapperboard,
                Newspaper,
                HandHeart,
                WalletCards,
              ];
              const Icon = icons[index] ?? CheckCircle2;

              return (
                <article
                  className="grid gap-3 border border-black/10 bg-white p-4 shadow-[0_16px_45px_rgba(17,21,16,0.05)] sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5"
                  key={step.title}
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#071108] text-[#44f26e]">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#16702e]">
                        0{index + 1}
                      </span>
                      <h3 className="text-xl font-black">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                      {step.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto grid max-w-[92rem] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)] lg:px-8">
          <div>
            <SectionLabel>Fan Participation</SectionLabel>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.participationTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-base font-bold leading-7 text-black/60 [word-break:keep-all]">
              {copy.participationBody}
            </p>
          </div>

          <div className="grid gap-3">
            {copy.participationItems.map((item, index) => {
              const icons = [UsersRound, FileText, Trophy];
              const Icon = icons[index] ?? UsersRound;

              return (
                <article
                  className="rounded-lg border border-black/10 bg-[#f7f8f4] p-4"
                  key={item.title}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ecfff0] text-[#16702e]">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black">{item.title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-black/58">
                        {item.body}
                      </p>
                      <p className="mt-3 inline-flex max-w-full rounded-full bg-white px-3 py-1.5 font-mono text-[0.68rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
                        <span className="truncate">{item.metric}</span>
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
          <div className="bg-[#071108] p-5 text-white shadow-[0_28px_80px_rgba(7,17,8,0.2)] sm:p-8">
            <p className="inline-flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#7cff98]">
              <ShieldCheck className="size-4" />
              {copy.settlementEyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.settlementTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-base font-bold leading-7 text-white/66 [word-break:keep-all]">
              {copy.settlementBody}
            </p>

            <div className="mt-7 grid gap-3">
              {copy.settlementItems.map((item) => (
                <div
                  className="flex items-start gap-3 border border-white/12 bg-white/7 p-4"
                  key={item}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#44f26e]" />
                  <p className="text-sm font-bold leading-6 text-white/76">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="grid content-between gap-4 border border-black/10 bg-white p-5 sm:p-6">
            <div>
              <div className="flex size-14 items-center justify-center rounded-full bg-[#44f26e] text-[#071108]">
                <Coins className="size-7" />
              </div>
              <p className="mt-5 text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                {copy.ledgerEyebrow}
              </p>
              <h3 className="mt-2 text-2xl font-black leading-tight">
                {copy.ledgerTitle}
              </h3>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between border-b border-black/10 py-3 text-sm font-black">
                <span className="text-black/50">{copy.eventLabels.revenue}</span>
                <BadgeDollarSign className="size-5 text-[#16702e]" />
              </div>
              <div className="flex items-center justify-between border-b border-black/10 py-3 text-sm font-black">
                <span className="text-black/50">
                  {copy.eventLabels.contribution}
                </span>
                <Eye className="size-5 text-[#16702e]" />
              </div>
              <div className="flex items-center justify-between py-3 text-sm font-black">
                <span className="text-black/50">
                  {copy.eventLabels.settlement}
                </span>
                <LockKeyhole className="size-5 text-[#16702e]" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-black/10 bg-[#111510] text-white">
        <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.loopTitle}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.ctaTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-white/62 [word-break:keep-all]">
              {copy.ctaBody}
            </p>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/48 [word-break:keep-all]">
              {copy.loopBody}
            </p>
          </div>
          <div className="grid gap-3 sm:min-w-[17rem]">
            <CtaLink href={newsHref}>{copy.ctaNews}</CtaLink>
            <CtaLink href={charactersHref} variant="secondary">
              {copy.ctaCharacters}
            </CtaLink>
            <CtaLink href={reportsHref} variant="secondary">
              {copy.ctaReports}
            </CtaLink>
          </div>
        </div>
      </section>
    </main>
  );
}
