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
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { FanletterHeroBackgroundCarousel } from "@/components/fanletter-mobile-hero-carousel";
import { LandingReveal } from "@/components/landing/landing-reveal";
import type { FanletterNewsReportDocument } from "@/lib/content";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { getFanletterLandingData } from "@/lib/fanletter-landing-service";
import {
  getFanletterNewsCharacterStats,
  hydrateFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import {
  getLatestFanletterNewsReports,
} from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsBareArticleDisplayTitle as getArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
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
        title: "FanLetter News 홈",
        description:
          "SNS에서 본 AI 캐릭터 뉴스, 원본 브이로그, 캐릭터 채널을 한 곳에서 이어보는 FanLetter News 홈입니다.",
        brand: "FanLetter",
        eyebrow: "AI Character News Home",
        heroTitle: "AI 캐릭터 뉴스에서 원본 브이로그까지 이어보는 홈",
        heroBody:
          "팬 기자가 편집한 티저 컷으로 뉴스를 먼저 보고, 마음에 드는 AI 캐릭터의 원본 브이로그와 다른 뉴스를 계속 이어볼 수 있습니다.",
        primaryCta: "지금 뉴스 보기",
        secondaryCta: "AI 캐릭터 보기",
        proofBadges: ["AI 캐릭터 뉴스", "리포터 티저 컷", "원본 브이로그"],
        heroStats: [
          { label: "먼저 보는 콘텐츠", value: "News", hint: "팬 리포터 포토 뉴스" },
          { label: "이어보는 콘텐츠", value: "Vlog", hint: "AI 캐릭터 원본 장면" },
          { label: "계속 보는 공간", value: "Channel", hint: "캐릭터별 뉴스 채널" },
        ],
        homeNews: {
          body:
            "SNS에서 들어온 사용자가 바로 이어보기 좋은 최신 리포트입니다. 티저 컷, 원본 브이로그, 캐릭터 채널로 자연스럽게 연결됩니다.",
          cta: "뉴스 읽기",
          empty: "아직 홈에 표시할 공개 뉴스가 없습니다.",
          eyebrow: "지금 이어볼 뉴스",
          title: "뉴스를 보고 캐릭터가 궁금해지는 흐름",
        },
        homeCharacters: {
          body:
            "캐릭터의 얼굴과 이름을 먼저 기억하게 하고, 같은 캐릭터의 뉴스와 브이로그를 계속 소비하도록 연결합니다.",
          cta: "캐릭터 채널",
          empty: "아직 홈에 표시할 AI 캐릭터가 없습니다.",
          eyebrow: "AI 캐릭터 채널",
          news: "뉴스",
          source: "원본 오픈",
          title: "계속 보게 만드는 캐릭터 IP",
          vlogs: "브이로그",
        },
        newsroomPreview: {
          label: "NEWS ENTRY",
          title: "뉴스 한 편이 캐릭터 채널의 입구가 됩니다",
          body:
            "대표 티저, 리포터 편집 컷, 팬 오픈 투표를 한 화면에 묶어 원본 장면을 보고 싶게 만듭니다.",
          flow: ["SNS 유입", "포토 뉴스", "원본 보기", "캐릭터 채널"],
          metrics: [
            { label: "유입", value: "SNS" },
            { label: "티저", value: "4컷" },
            { label: "원본", value: "Vlog" },
          ],
        },
        vloggerSignal: {
          eyebrow: "Character Curiosity Loop",
          title: "뉴스를 읽고, 원본을 보고, 캐릭터를 따라갑니다",
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
        ctaTitle: "FanLetter News 홈에서 캐릭터 IP 성장 흐름을 시작하세요",
        ctaBody:
          "뉴스 홈에서 포토 뉴스와 AI 캐릭터를 둘러보고, 리포터 데스크에서 직접 브이로그 기반 리포트를 작성할 수 있습니다.",
        ctaNews: "뉴스룸 보기",
        ctaCharacters: "AI 캐릭터",
        ctaReports: "리포터 데스크",
      }
    : {
        title: "FanLetter News Home",
        description:
          "The FanLetter News home for continuing from SNS AI character news into source vlogs and character channels.",
        brand: "FanLetter",
        eyebrow: "AI Character News Home",
        heroTitle: "Continue from AI character news into source vlogs",
        heroBody:
          "Read fan-reporter teaser cuts first, then continue into the original AI character vlog and more news from the same character.",
        primaryCta: "Read news",
        secondaryCta: "AI characters",
        proofBadges: ["AI character news", "Reporter teaser cuts", "Source vlogs"],
        heroStats: [
          { label: "Entry content", value: "News", hint: "Fan-reporter photo news" },
          { label: "Next content", value: "Vlog", hint: "Original AI character scene" },
          { label: "Repeat space", value: "Channel", hint: "Character-level news hub" },
        ],
        homeNews: {
          body:
            "Latest reports that help SNS visitors keep reading, open source vlogs, and remember the character channel.",
          cta: "Read news",
          empty: "No public news is ready for the home page yet.",
          eyebrow: "Continue Reading",
          title: "News that turns into character curiosity",
        },
        homeCharacters: {
          body:
            "Show the face and name first, then connect readers to more news and source vlogs from the same AI character.",
          cta: "Character channel",
          empty: "No AI characters are ready for the home page yet.",
          eyebrow: "AI Character Channels",
          news: "News",
          source: "Opened sources",
          title: "Character IP worth following",
          vlogs: "Vlogs",
        },
        newsroomPreview: {
          label: "NEWS ENTRY",
          title: "One news page becomes the character-channel entrance",
          body:
            "Lead teasers, reporter-edited cuts, and fan-open votes make readers want the source scene.",
          flow: ["SNS entry", "Photo news", "Source vlog", "Character channel"],
          metrics: [
            { label: "Entry", value: "SNS" },
            { label: "Teasers", value: "4 cuts" },
            { label: "Source", value: "Vlog" },
          ],
        },
        vloggerSignal: {
          eyebrow: "Character Curiosity Loop",
          title: "Read the news, watch the source, follow the character",
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
        ctaTitle: "Start the character IP loop from FanLetter News home",
        ctaBody:
          "Browse photo news and AI characters, then use the reporter desk to create reports from vlog source content.",
        ctaNews: "Newsroom",
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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function getReportDate(report: FanletterNewsReportDocument) {
  return report.sourcePublishedAt ?? report.createdAt ?? null;
}

function NewsHomeReportCard({
  copy,
  href,
  locale,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  href: string;
  locale: Locale;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(getReportDate(report), locale);
  const accessLabel =
    locale === "ko"
      ? report.priceType === "paid"
        ? "팬 전용"
        : "공개 뉴스"
      : report.priceType === "paid"
        ? "Fan-only"
        : "Public news";

  return (
    <Link
      className="group grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-black/10 bg-white !text-[#111510] shadow-[0_16px_42px_rgba(17,21,16,0.06)] transition hover:border-[#19b84b]/55 hover:shadow-[0_20px_52px_rgba(17,21,16,0.1)] sm:grid-cols-1"
      href={href}
    >
      <div className="relative min-h-[9.5rem] overflow-hidden bg-[#071108] sm:min-h-[15rem]">
        {report.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 640px) 7.5rem, (max-width: 1024px) 50vw, 25rem"
            src={report.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              report.coverImageUrl,
            )}
          />
        ) : (
          <div className="flex h-full min-h-[9.5rem] items-center justify-center text-[#44f26e]">
            <Newspaper className="size-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0)_38%,rgba(7,17,8,0.58)_100%)]" />
      </div>
      <div className="flex min-w-0 flex-col p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#ecfff0] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
            {accessLabel}
          </span>
          {publishedAt ? (
            <span className="text-[0.66rem] font-bold text-black/38">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] sm:text-xl sm:leading-7">
          {getArticleDisplayTitle(report.title)}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-black/56 sm:mt-2 sm:text-sm sm:leading-6">
          {report.dek}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="truncate text-xs font-bold text-black/42">
            {report.creatorName || report.reporterName}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#16702e]">
            {copy.homeNews.cta}
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function HomeCharacterCard({
  character,
  copy,
  href,
  locale,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  href: string;
  locale: Locale;
}) {
  return (
    <Link
      className="group grid min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/12 bg-white/[0.07] p-3 !text-white transition hover:border-[#44f26e]/60 hover:bg-white/[0.1] sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:p-4"
      href={href}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-[#071108]">
        {character.avatarImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
            fill
            sizes="6.5rem"
            src={character.avatarImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              character.avatarImageUrl,
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#44f26e]">
            <UserRound className="size-8" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#7cff98]">
          {copy.homeCharacters.eyebrow}
        </p>
        <h3 className="mt-1 truncate text-xl font-black">{character.name}</h3>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            {
              label: copy.homeCharacters.news,
              value: character.newsCount,
            },
            {
              label: copy.homeCharacters.vlogs,
              value: character.publicVideoCount,
            },
            {
              label: copy.homeCharacters.source,
              value: character.sourceRevealUnlockedCount,
            },
          ].map((stat) => (
            <div
              className="min-w-0 rounded-md border border-white/10 bg-black/22 px-1.5 py-2"
              key={stat.label}
            >
              <p className="truncate text-sm font-black">
                {formatNumber(stat.value, locale)}
              </p>
              <p className="mt-0.5 truncate text-[0.54rem] font-black uppercase tracking-[0.05em] text-white/42">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[#9bffad]">
          {copy.homeCharacters.cta}
          <ArrowRight className="size-3.5" />
        </p>
      </div>
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
  const [landingData, latestReports] = await Promise.all([
    getFanletterLandingData(locale, false),
    getLatestFanletterNewsReports({
      contentMaturityRating: "general",
      limit: 18,
      locale,
      promoteFirstReports: true,
    }),
  ]);
  const featuredReports = latestReports.slice(0, 6);
  const featuredCharacters = await hydrateFanletterNewsCharacterStats(
    getFanletterNewsCharacterStats(latestReports, 6, { sort: "discovery" }),
    { limit: 4, sort: "discovery" },
  );
  const heroSlides = [
    ...landingData.featuredVideos,
    ...landingData.featuredPaidVideos,
  ]
    .filter((video) => video.videoUrl.trim())
    .slice(0, 5)
    .map((video) => ({
      authorName: video.authorName,
      coverImageUrl: video.coverImageUrl,
      title: video.title,
      videoUrl: video.videoUrl,
    }));
  const hasHeroVideoSlides = heroSlides.length > 0;
  const previewCoverImageUrl =
    heroSlides.find((slide) => slide.coverImageUrl?.trim())?.coverImageUrl ??
    HERO_IMAGE;
  const homeHref = buildPathWithReferral(
    `/${locale}/fanletter/news/platform`,
    referralCode,
  );
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
      <section className="relative min-h-[100svh] overflow-hidden bg-[#071108] text-white sm:min-h-[92svh]">
        {hasHeroVideoSlides ? (
          <FanletterHeroBackgroundCarousel
            mobileLayout="immersive"
            randomizeOnMount
            slides={heroSlides}
          />
        ) : (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover object-center opacity-70"
            fill
            priority
            sizes="100vw"
            src={HERO_IMAGE}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0.04)_0%,rgba(7,17,8,0.1)_30%,rgba(7,17,8,0.74)_58%,#071108_100%)] sm:bg-[linear-gradient(180deg,rgba(7,17,8,0.28)_0%,rgba(7,17,8,0.42)_34%,rgba(7,17,8,0.82)_66%,#071108_100%)] lg:bg-[linear-gradient(90deg,rgba(7,17,8,0.96)_0%,rgba(7,17,8,0.82)_38%,rgba(7,17,8,0.28)_72%,rgba(7,17,8,0.56)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,8,0.28)_0%,rgba(7,17,8,0.12)_58%,rgba(7,17,8,0.08)_100%)] sm:bg-[linear-gradient(90deg,rgba(7,17,8,0.72)_0%,rgba(7,17,8,0.28)_54%,rgba(7,17,8,0.08)_100%)] lg:hidden" />
        <div className="absolute inset-x-0 top-0 h-[22svh] bg-[linear-gradient(180deg,rgba(7,17,8,0.5)_0%,rgba(7,17,8,0.08)_100%)] sm:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,rgba(7,17,8,0)_0%,#071108_100%)]" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-[92rem] flex-col px-4 py-4 sm:min-h-[92svh] sm:px-6 sm:py-7 lg:px-8">
          <header className="flex items-center justify-between gap-3 border-b border-white/14 pb-3 sm:gap-4 sm:pb-4">
            <Link
              className="inline-flex min-w-0 items-center gap-2 text-lg font-black !text-white"
              href={homeHref}
            >
              <FanletterBrandMark className="size-9" />
              <span className="truncate">{copy.brand} News</span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden sm:inline-flex"
                compact
                locale={locale}
              />
              <FanletterGlobalLanguageSwitcher
                className="inline-flex sm:hidden"
                compact
                locale={locale}
                tight
              />
              <Link
                className="hidden min-h-10 items-center justify-center rounded-full border border-white/18 px-4 text-xs font-black uppercase tracking-[0.12em] !text-white/82 transition hover:border-[#44f26e] hover:text-white sm:inline-flex"
                href={charactersHref}
              >
                {copy.ctaCharacters}
              </Link>
            </div>
          </header>

          <div className="grid flex-1 content-start gap-5 pb-10 pt-[36svh] sm:gap-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:py-12">
            <LandingReveal className="max-w-3xl" variant="hero">
              <p className="inline-flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#7cff98] drop-shadow-[0_2px_16px_rgba(0,0,0,0.42)] sm:text-[0.72rem]">
                <Blocks className="size-4" />
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-[2rem] font-black leading-[1.08] tracking-normal text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.55)] [word-break:keep-all] sm:mt-5 sm:text-[3.25rem] lg:text-[3.65rem]">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/82 drop-shadow-[0_3px_18px_rgba(0,0,0,0.58)] [word-break:keep-all] sm:mt-5 sm:text-lg sm:leading-8">
                {copy.heroBody}
              </p>

              <div className="mt-6 hidden flex-wrap gap-2 sm:flex">
                {copy.proofBadges.map((badge) => (
                  <FeaturePill key={badge}>{badge}</FeaturePill>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:flex-row sm:gap-3">
                <CtaLink href={newsHref}>{copy.primaryCta}</CtaLink>
                <CtaLink href={charactersHref} variant="secondary">
                  {copy.secondaryCta}
                </CtaLink>
              </div>
            </LandingReveal>

            <LandingReveal className="grid gap-3" delay={120} variant="soft">
              <div className="relative overflow-hidden rounded-lg border border-white/18 bg-[#071108]/72 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover opacity-62 saturate-[1.08]"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 28rem"
                  src={previewCoverImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    previewCoverImageUrl,
                  )}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,8,0.08)_0%,rgba(7,17,8,0.76)_46%,rgba(7,17,8,0.96)_100%)]" />
                <div className="relative flex min-h-[15.5rem] flex-col justify-between p-3 sm:min-h-[28rem] sm:p-4 lg:min-h-[35rem]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#7cff98]">
                      <Clapperboard className="size-3.5" />
                      {copy.newsroomPreview.label}
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/78">
                      <Camera className="size-3.5 text-[#ffd76b]" />
                      Live
                    </span>
                  </div>

                  <div>
                    <p className="inline-flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#ffd76b]">
                      <Sparkles className="size-3.5" />
                      {copy.vloggerSignal.eyebrow}
                    </p>
                    <h2 className="mt-2 max-w-sm text-xl font-black leading-tight text-white [word-break:keep-all] sm:text-3xl">
                      {copy.newsroomPreview.title}
                    </h2>
                  </div>

                  <div className="grid gap-2">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {copy.newsroomPreview.metrics.map((metric, index) => (
                        <div
                          className={
                            index === 2
                              ? "min-w-0 rounded-lg bg-[#44f26e] p-2 text-[#071108] sm:p-3"
                              : "min-w-0 rounded-lg border border-white/14 bg-white/10 p-2 text-white sm:p-3"
                          }
                          key={metric.label}
                        >
                          <p
                            className={
                              index === 2
                                ? "truncate text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#071108]/62"
                                : "truncate text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/50"
                            }
                          >
                            {metric.label}
                          </p>
                          <p className="mt-1 truncate text-sm font-black sm:text-lg">
                            {metric.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {copy.newsroomPreview.flow.map((step, index) => (
                        <div
                          className="min-w-0 rounded-lg border border-white/12 bg-black/28 px-2 py-2 text-center"
                          key={step}
                        >
                          <p className="font-mono text-[0.56rem] font-black text-[#7cff98]">
                            0{index + 1}
                          </p>
                          <p className="mt-0.5 truncate text-[0.58rem] font-black text-white/72 sm:text-[0.64rem]">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </LandingReveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-5 grid gap-3 sm:mb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <SectionLabel>{copy.homeNews.eyebrow}</SectionLabel>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.homeNews.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
              {copy.homeNews.body}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2.5 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
            href={newsHref}
          >
            {copy.ctaNews}
            <ArrowRight className="size-4 text-[#16702e]" />
          </Link>
        </div>

        {featuredReports.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {featuredReports.map((report) => (
              <NewsHomeReportCard
                copy={copy}
                href={buildPathWithReferral(
                  `/${locale}/fanletter/news/${report.reportId}`,
                  referralCode,
                )}
                key={report.reportId}
                locale={locale}
                report={report}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-black/10 bg-white p-5 text-sm font-semibold text-black/54">
            {copy.homeNews.empty}
          </p>
        )}
      </section>

      <section className="border-y border-black/10 bg-[#071108] text-white">
        <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-start lg:px-8">
          <LandingReveal className="lg:sticky lg:top-8" variant="soft">
            <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              <Sparkles className="size-4" />
              {copy.homeCharacters.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.homeCharacters.title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/62 sm:text-base sm:leading-7">
              {copy.homeCharacters.body}
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 py-2.5 text-sm font-black !text-[#071108] transition hover:bg-[#69ff8c]"
              href={charactersHref}
            >
              {copy.ctaCharacters}
              <ArrowRight className="size-4" />
            </Link>
          </LandingReveal>

          {featuredCharacters.length > 0 ? (
            <div className="grid gap-3">
              {featuredCharacters.map((character) => (
                <HomeCharacterCard
                  character={character}
                  copy={copy}
                  href={buildPathWithReferral(
                    `/${locale}/fanletter/news/characters/${character.referralCode}`,
                    referralCode,
                  )}
                  key={character.referralCode}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-white/12 bg-white/[0.07] p-5 text-sm font-semibold text-white/58">
              {copy.homeCharacters.empty}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <LandingReveal className="lg:sticky lg:top-8" variant="soft">
            <SectionLabel>Platform Loop</SectionLabel>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.modelTitle}
            </h2>
          </LandingReveal>

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
                <LandingReveal
                  className="grid gap-3 border border-black/10 bg-white p-4 shadow-[0_16px_45px_rgba(17,21,16,0.05)] sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5"
                  delay={index * 55}
                  key={step.title}
                  variant="soft"
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
                </LandingReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto grid max-w-[92rem] gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)] lg:px-8">
          <LandingReveal variant="soft">
            <SectionLabel>Fan Participation</SectionLabel>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.participationTitle}
            </h2>
          </LandingReveal>

          <div className="grid gap-3">
            {copy.participationItems.map((item, index) => {
              const icons = [UsersRound, FileText, Trophy];
              const Icon = icons[index] ?? UsersRound;

              return (
                <LandingReveal
                  className="rounded-lg border border-black/10 bg-[#f7f8f4] p-4"
                  delay={index * 60}
                  key={item.title}
                  variant="soft"
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
                </LandingReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-9 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
          <LandingReveal className="bg-[#071108] p-5 text-white shadow-[0_28px_80px_rgba(7,17,8,0.2)] sm:p-8">
            <p className="inline-flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#7cff98]">
              <ShieldCheck className="size-4" />
              {copy.settlementEyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.settlementTitle}
            </h2>

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
          </LandingReveal>

          <LandingReveal
            className="grid content-between gap-4 border border-black/10 bg-white p-5 sm:p-6"
            delay={120}
          >
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
          </LandingReveal>
        </div>
      </section>

      <section className="border-t border-black/10 bg-[#111510] text-white">
        <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <LandingReveal variant="soft">
            <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.loopTitle}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-5xl">
              {copy.ctaTitle}
            </h2>
          </LandingReveal>
          <LandingReveal className="grid gap-3 sm:min-w-[17rem]" delay={120}>
            <CtaLink href={newsHref}>{copy.ctaNews}</CtaLink>
            <CtaLink href={charactersHref} variant="secondary">
              {copy.ctaCharacters}
            </CtaLink>
            <CtaLink href={reportsHref} variant="secondary">
              {copy.ctaReports}
            </CtaLink>
          </LandingReveal>
        </div>
      </section>
    </main>
  );
}
