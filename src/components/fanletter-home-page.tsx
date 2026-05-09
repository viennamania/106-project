import Image from "next/image";
import Link from "next/link";
import {
  BadgeDollarSign,
  Bot,
  ChartNoAxesCombined,
  Clapperboard,
  Crown,
  MessageCircleHeart,
  Network,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import {
  FanletterDesktopHeroCardCarousel,
  FanletterMobileHeroCarousel,
} from "@/components/fanletter-mobile-hero-carousel";
import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import {
  AnimatedNumber,
  ScrollReveal,
} from "@/components/fanletter-home-motion";
import { LanguageSwitcher } from "@/components/language-switcher";
import type {
  FanletterFeaturedVideo,
  FanletterLiveStats,
} from "@/lib/fanletter-landing-service";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterCopy = {
  announcement: {
    label: string;
    prize: string;
  };
  brandSuffix: string;
  cta: {
    creator: string;
    fan: string;
    login: string;
    studio: string;
  };
  creatorWall: {
    count: string;
    label: string;
  };
  economy: {
    body: string;
    cta: string;
    title: string;
  };
  faq: Array<{
    answer: string;
    question: string;
  }>;
  faqTitle: string;
  features: {
    eyebrow: string;
    items: Array<{
      badge?: string;
      description: string;
      title: string;
    }>;
  };
  footer: {
    title: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  languageLabel: string;
  liveStats: {
    content: string;
    creators: string;
    sales: string;
    totalSales: string;
    videos: string;
  };
  liveVideos: {
    empty: string;
    eyebrow: string;
    free: string;
    open: string;
    title: string;
  };
  nav: {
    creators: string;
    faq: string;
    features: string;
    studio: string;
  };
  niche: {
    body: string;
    cta: string;
    title: string;
    categories: string[];
  };
  platformTrust: {
    body: string;
    eyebrow: string;
  };
  proof: {
    title: string;
    stats: Array<{
      label: string;
      value: string;
    }>;
  };
  targetAudience: {
    eyebrow: string;
    title: string;
    items: Array<{
      description: string;
      title: string;
    }>;
  };
};

const koCopy: FanletterCopy = {
  announcement: {
    label: "원클릭 AI 캐릭터 브이로그 시작",
    prize: "계정 연결부터 첫 브이로그까지",
  },
  brandSuffix: "AI 캐릭터 브이로그",
  cta: {
    creator: "캐릭터 만들기",
    fan: "브이로그 피드 보기",
    login: "계정 연결",
    studio: "브이로그 스튜디오",
  },
  creatorWall: {
    count: "201,548",
    label: "AI 캐릭터 채널 활동 지표",
  },
  economy: {
    body: "캐릭터 만들기, 숏폼 브이로그 생성, 공개 피드, 유료 커뮤니티 흐름을 하나의 모바일 창작 흐름으로 연결합니다.",
    cta: "캐릭터 만들기",
    title: "AI 캐릭터 브이로그 채널을 더 빠르게 시작하세요.",
  },
  faq: [
    {
      answer: "FanLetter는 얼굴 공개 없이 같은 AI 캐릭터와 대표 아바타로 숏폼 브이로그 채널을 만들고 팬 피드와 유료 콘텐츠로 연결하는 창작자 플랫폼입니다.",
      question: "FanLetter는 무엇인가요?",
    },
    {
      answer: "얼굴 공개 없이 숏폼 채널을 만들고 싶은 개인, AI 인플루언서 운영자, 유료 커뮤니티 크리에이터, 브랜드 마스코트와 IP 팀에 맞춰져 있습니다.",
      question: "누가 사용할 수 있나요?",
    },
    {
      answer: "브이로그 스튜디오에서 오늘의 숏폼 브이로그를 만들고, 공개 범위와 가격을 정해 팬 피드와 판매 흐름으로 연결합니다.",
      question: "브이로그는 어떻게 수익화하나요?",
    },
    {
      answer: "모바일에서 계정 연결, 캐릭터 만들기, 오늘의 브이로그 생성, 피드 확인까지 이어지도록 설계되어 있습니다.",
      question: "모바일에서도 충분히 사용할 수 있나요?",
    },
  ],
  faqTitle: "FAQ",
  features: {
    eyebrow: "기능",
    items: [
      {
        badge: "새 기능",
        description: "얼굴 공개 없이 운영할 고정 AI 캐릭터와 아바타를 먼저 만듭니다.",
        title: "AI 캐릭터 만들기",
      },
      {
        badge: "새 기능",
        description: "셀피, 외출, 루틴, 대화형 장면을 세로형 숏폼 브이로그로 생성합니다.",
        title: "숏폼 브이로그 생성",
      },
      {
        description: "공개 브이로그, 유료 브이로그, 저장과 공유 흐름을 하나의 캐릭터 피드로 운영합니다.",
        title: "캐릭터 피드",
      },
      {
        description: "Fanvue, Patreon 같은 유료 커뮤니티로 확장할 수 있는 팬 관계를 쌓습니다.",
        title: "유료 커뮤니티 확장",
      },
      {
        description: "브랜드 마스코트, 웹툰, 게임, 버추얼 아이돌 IP를 캐릭터 브이로그로 확장합니다.",
        title: "브랜드와 IP 숏폼화",
      },
    ],
  },
  footer: {
    title: "얼굴 없이 시작하는 AI 캐릭터 브이로그 채널.",
  },
  hero: {
    eyebrow: "FANLETTER",
    title: "누구나 AI 캐릭터 브이로그 채널을 만들 수 있습니다.",
    description:
      "FanLetter는 얼굴 공개 없이 고정 AI 캐릭터로 숏폼 브이로그를 만들고, 팬 피드와 유료 콘텐츠로 연결하는 창작자 플랫폼입니다.",
  },
  languageLabel: "언어",
  liveStats: {
    content: "공개 브이로그",
    creators: "활성 캐릭터",
    sales: "확정 판매",
    totalSales: "누적 판매",
    videos: "브이로그",
  },
  liveVideos: {
    empty: "공개된 AI 캐릭터 브이로그가 준비되면 이 영역에 바로 노출됩니다.",
    eyebrow: "실시간 AI 캐릭터 브이로그",
    free: "무료 공개",
    open: "브이로그 보기",
    title: "공개된 AI 캐릭터 브이로그로 팬이 바로 확인합니다.",
  },
  nav: {
    creators: "캐릭터",
    faq: "FAQ",
    features: "기능",
    studio: "스튜디오",
  },
  niche: {
    body: "개인, AI 인플루언서, 브랜드 마스코트, 웹툰·게임·버추얼 아이돌 IP까지 하나의 캐릭터 채널로 숏폼화합니다.",
    cta: "캐릭터 만들기",
    title: "캐릭터가 있으면 채널을 만들 수 있습니다.",
    categories: ["얼굴 비공개", "AI 인플루언서", "팬 커뮤니티", "브랜드 마스코트", "IP 숏폼"],
  },
  platformTrust: {
    body: "릴스·쇼츠·틱톡 게시에 필요한 캡션, 해시태그, FanLetter 링크를 정리합니다.",
    eyebrow: "숏폼 게시 패키지",
  },
  proof: {
    title: "캐릭터 설정부터 숏폼 브이로그 판매까지",
    stats: [
      { label: "캐릭터 준비", value: "01" },
      { label: "브이로그 흐름", value: "05" },
      { label: "모바일 채널", value: "24/7" },
    ],
  },
  targetAudience: {
    eyebrow: "추천 대상",
    title: "얼굴 공개 없이 캐릭터 채널을 키우고 싶은 사람들을 위한 플랫폼입니다.",
    items: [
      {
        title: "얼굴 없는 개인 창작자",
        description: "실제 얼굴을 공개하지 않고 숏폼 채널을 시작하고 싶은 개인에게 맞습니다.",
      },
      {
        title: "AI 인플루언서 운영자",
        description: "같은 AI 인물이나 가상 캐릭터를 꾸준히 노출해 팬을 만들 수 있습니다.",
      },
      {
        title: "유료 커뮤니티 크리에이터",
        description: "Fanvue, Patreon, 유료 팬 커뮤니티로 이어지는 콘텐츠 흐름을 만듭니다.",
      },
      {
        title: "브랜드와 소상공인",
        description: "브랜드 마스코트를 사람처럼 말하고 움직이는 브이로그 캐릭터로 확장합니다.",
      },
      {
        title: "웹툰·게임·버추얼 IP 팀",
        description: "기존 캐릭터 IP를 숏폼 브이로그와 팬 피드로 재활용합니다.",
      },
    ],
  },
};

const enCopy: FanletterCopy = {
  announcement: {
    label: "AI character vlogger studio is live",
    prize: "From character setup to short-form vlog",
  },
  brandSuffix: "AI Character Vlogger",
  cta: {
    creator: "Start AI character channel",
    fan: "Explore vlog feed",
    login: "Connect account",
    studio: "Vlog studio",
  },
  creatorWall: {
    count: "201,548",
    label: "network touchpoints ready for AI character vlogger channels",
  },
  economy: {
    body: "Character persona, short-form vlog generation, public feeds, and paid community flows move through one mobile creator workflow.",
    cta: "Start now",
    title: "Start an AI character vlog channel faster.",
  },
  faq: [
    {
      answer: "FanLetter is a creator platform for making short-form vlogs with a fixed AI character, then connecting them to fan feeds and paid content without showing your real face.",
      question: "What is FanLetter?",
    },
    {
      answer: "It is built for no-face creators, AI influencer operators, paid community creators, brands, and teams turning webtoon, game, or virtual idol IP into short-form channels.",
      question: "Who is it for?",
    },
    {
      answer: "Create today's short-form vlog in the studio, choose visibility and pricing, then publish it into the fan feed and sales flow.",
      question: "How do vlogs monetise?",
    },
    {
      answer: "Yes. Character setup, today's vlog creation, feed browsing, wallet connection, and sales views are designed around mobile use.",
      question: "Is it mobile first?",
    },
  ],
  faqTitle: "FAQ",
  features: {
    eyebrow: "Features",
    items: [
      {
        badge: "New",
        description: "Create a fixed AI character and avatar for a channel that does not require showing your real face.",
        title: "AI character setup",
      },
      {
        badge: "New",
        description: "Turn selfies, routines, outings, and conversational scenes into vertical short-form vlogs.",
        title: "Short-form vlog creation",
      },
      {
        description: "Run public vlogs, paid vlogs, saves, comments, and shares from one character feed.",
        title: "Character feed",
      },
      {
        description: "Build fan relationships that can expand toward Fanvue, Patreon, and paid communities.",
        title: "Paid community growth",
      },
      {
        description: "Turn mascots, webtoon characters, game characters, and virtual idol IP into short-form channels.",
        title: "Brand and IP shorts",
      },
    ],
  },
  footer: {
    title: "Start an AI character vlog channel without showing your face.",
  },
  hero: {
    eyebrow: "FANLETTER",
    title: "Anyone can become an AI character vlogger.",
    description:
      "FanLetter helps creators make short-form vlogs with a fixed AI character, then connect them to fan feeds and paid content without showing their real face.",
  },
  languageLabel: "Language",
  liveStats: {
    content: "public vlogs",
    creators: "active characters",
    sales: "confirmed sales",
    totalSales: "sales volume",
    videos: "vlogs",
  },
  liveVideos: {
    empty: "Public AI character vlogs will appear here as soon as they are available.",
    eyebrow: "Live AI Character Vlogs",
    free: "Free public",
    open: "View vlog",
    title: "Real public AI character vlogs make the fan experience tangible.",
  },
  nav: {
    creators: "Characters",
    faq: "FAQ",
    features: "Features",
    studio: "Studio",
  },
  niche: {
    body: "Individuals, AI influencers, brand mascots, and webtoon, game, or virtual idol IP can become short-form character channels.",
    cta: "Open vlog studio",
    title: "If you have a character, you can build a channel.",
    categories: ["No-face", "AI Influencer", "Fan Community", "Brand Mascot", "IP Shorts"],
  },
  platformTrust: {
    body: "Prepares captions, hashtags, and FanLetter links for Reels, Shorts, and TikTok posts.",
    eyebrow: "Short-form posting package",
  },
  proof: {
    title: "From character setup to short-form vlog sales",
    stats: [
      { label: "character setup", value: "01" },
      { label: "vlog flow", value: "05" },
      { label: "mobile channel", value: "24/7" },
    ],
  },
  targetAudience: {
    eyebrow: "Who it is for",
    title: "Built for creators who want to grow a character channel without showing their face.",
    items: [
      {
        title: "No-face individual creators",
        description: "Start a short-form channel without revealing your real face.",
      },
      {
        title: "AI influencer operators",
        description: "Keep the same AI person or virtual character visible over time.",
      },
      {
        title: "Paid community creators",
        description: "Build content flows that can connect to Fanvue, Patreon, and paid fan communities.",
      },
      {
        title: "Brands and small businesses",
        description: "Turn a mascot into a vlog character that can speak, post, and build a following.",
      },
      {
        title: "Webtoon, game, and virtual IP teams",
        description: "Reuse existing character IP as short-form vlogs and fan feeds.",
      },
    ],
  },
};

const featureIcons = [
  Bot,
  Clapperboard,
  MessageCircleHeart,
  Network,
  WalletCards,
] as const;
const platformBrandLogos = [
  {
    alt: "Instagram",
    label: "Instagram Reels",
    src: "/brand/platforms/instagram.svg",
  },
  {
    alt: "YouTube Shorts",
    label: "YouTube Shorts",
    src: "/brand/platforms/youtube-shorts.svg",
  },
  {
    alt: "TikTok",
    label: "TikTok",
    src: "/brand/platforms/tiktok.svg",
  },
] as const;

function getFanletterCopy(locale: Locale) {
  return locale === "ko" ? koCopy : enCopy;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function getAuthorInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

export function FanletterHomePage({
  featuredVideos,
  locale,
  liveStats,
  referralCode,
}: {
  featuredVideos: FanletterFeaturedVideo[];
  locale: Locale;
  liveStats: FanletterLiveStats;
  referralCode: string | null;
}) {
  const copy = getFanletterCopy(locale);
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const onboardingHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const creatorHref = onboardingHref;
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: onboardingHref },
  );
  const heroVideo = featuredVideos[0] ?? null;
  const heroSlides = featuredVideos.slice(0, 3).map((video) => ({
    authorName: video.authorName,
    coverImageUrl: video.coverImageUrl,
    title: video.title,
    videoUrl: video.videoUrl,
  }));
  const heroStats = [
    {
      format: "compact" as const,
      label: copy.liveStats.videos,
      value: liveStats.publicVideoCount,
    },
    {
      format: "compact" as const,
      label: copy.liveStats.creators,
      value: liveStats.activeCreatorCount,
    },
    {
      format: "compact" as const,
      label: copy.liveStats.sales,
      value: liveStats.confirmedSalesCount,
    },
  ];
  const proofSteps = copy.proof.stats.map((stat, index) => ({
    Icon: featureIcons[index] ?? Sparkles,
    featureDescription:
      (copy.features.items[index] ?? copy.features.items[0])?.description ?? "",
    featureTitle:
      (copy.features.items[index] ?? copy.features.items[0])?.title ?? stat.label,
    ...stat,
  }));
  const networkStats = [
    {
      format: "compact" as const,
      Icon: MessageCircleHeart,
      label: copy.liveStats.content,
      value: liveStats.publishedContentCount,
    },
    {
      format: "compact" as const,
      Icon: Clapperboard,
      label: copy.liveStats.videos,
      value: liveStats.publicVideoCount,
    },
    {
      format: "compact" as const,
      Icon: ChartNoAxesCombined,
      label: copy.liveStats.sales,
      value: liveStats.confirmedSalesCount,
    },
    {
      format: "usdt" as const,
      Icon: BadgeDollarSign,
      label: copy.liveStats.totalSales,
      value: liveStats.totalSalesUsdt,
    },
  ];
  const liveMetricStats = [
    {
      format: "compact" as const,
      label: copy.liveStats.content,
      value: liveStats.publishedContentCount,
    },
    {
      format: "compact" as const,
      label: copy.liveStats.videos,
      value: liveStats.publicVideoCount,
    },
    {
      format: "compact" as const,
      label: copy.liveStats.sales,
      value: liveStats.confirmedSalesCount,
    },
    {
      format: "usdt" as const,
      label: copy.liveStats.totalSales,
      value: liveStats.totalSalesUsdt,
    },
  ];
  const nicheVideos = featuredVideos.slice(0, 3);
  const footerLabels =
    locale === "ko"
      ? {
          activate: "계정 상태",
          aiContent: "AI 캐릭터 브이로그",
          creatorGrowth: "팬 관계 성장",
          feed: "브이로그 피드",
          help: "도움말",
          mobileFirst: "모바일 우선",
          network: "네트워크",
          studio: "브이로그 스튜디오",
          trust: "신뢰",
          usdtReady: "USDT 결제",
        }
      : {
          activate: "Account status",
          aiContent: "AI character vlogs",
          creatorGrowth: "Fan relationship growth",
          feed: "Vlog feed",
          help: "Help",
          mobileFirst: "Mobile first",
          network: "Network",
          studio: "Vlog studio",
          trust: "Trust",
          usdtReady: "USDT ready",
        };
  const mobileFooterLabels =
    locale === "ko"
      ? {
          activate: "계정",
          feed: "피드",
          studio: "스튜디오",
        }
      : {
          activate: "Account",
          feed: "Feed",
          studio: "Studio",
        };
  const mobileAnnouncementCta = locale === "ko" ? "시작하기" : "Start";
  const heroSetupSteps =
    locale === "ko"
      ? [
          {
            body: "회원 세션과 지갑 연결 상태를 확인합니다.",
            Icon: WalletCards,
            label: "01",
            title: "계정 연결",
          },
          {
            body: "표시 이름과 분위기만 정하면 대표 아바타까지 준비합니다.",
            Icon: Bot,
            label: "02",
            title: "캐릭터 만들기",
          },
          {
            body: "오늘의 장면을 세로형 숏폼 브이로그로 생성합니다.",
            Icon: Clapperboard,
            label: "03",
            title: "첫 브이로그",
          },
        ]
      : [
          {
            body: "Confirm the member session and wallet connection.",
            Icon: WalletCards,
            label: "01",
            title: "Connect account",
          },
          {
            body: "Pick a display name and mood to prepare the avatar.",
            Icon: Bot,
            label: "02",
            title: "Create character",
          },
          {
            body: "Generate today's vertical short-form vlog scene.",
            Icon: Clapperboard,
            label: "03",
            title: "First vlog",
          },
        ];

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="relative min-h-[100svh] overflow-hidden border-b border-white/10 sm:min-h-[92svh]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.46] lg:opacity-[0.18]"
          style={{
            backgroundImage: heroVideo?.coverImageUrl
              ? `url(${heroVideo.coverImageUrl})`
              : "radial-gradient(circle at 22% 18%, rgba(68, 242, 110, 0.2), transparent 34%), linear-gradient(135deg, #07150d 0%, #030504 54%, #112418 100%)",
          }}
        />
        <FanletterMobileHeroCarousel slides={heroSlides} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,4,0.02)_0%,rgba(3,5,4,0.08)_34%,rgba(3,5,4,0.58)_62%,rgba(3,5,4,0.94)_88%,#030504_100%)] lg:bg-[linear-gradient(90deg,#030504_0%,rgba(3,5,4,0.94)_43%,rgba(3,5,4,0.72)_68%,#030504_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-4 pb-6 pt-3 sm:min-h-[92svh] sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-black/54 px-3 py-1.5 text-[0.62rem] font-semibold uppercase text-white/78 shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:bg-black/42 sm:py-2 sm:text-xs sm:shadow-none">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-[#44f26e]" />
              <span className="truncate">{copy.announcement.label}</span>
            </div>
            <Link className="shrink-0 text-[#44f26e]" href={creatorHref}>
              <span className="sm:hidden">{mobileAnnouncementCta}</span>
              <span className="hidden sm:inline">{copy.announcement.prize}</span>
            </Link>
          </div>

          <header className="mt-4 flex items-center justify-between gap-4">
            <Link className="flex items-center gap-2" href={homeHref}>
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="text-xl font-semibold tracking-tight">FanLetter</span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-semibold text-white/82 md:flex">
              <a href="#features">{copy.nav.features}</a>
              <a href="#creators">{copy.nav.creators}</a>
              <Link href={studioHref}>{copy.nav.studio}</Link>
              <a href="#faq">{copy.nav.faq}</a>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSwitcher label={copy.languageLabel} locale={locale} />
              </div>
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
            </div>
          </header>

          <div className="grid flex-1 content-end gap-5 pb-9 pt-[4.5rem] sm:content-center sm:gap-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,24rem)] lg:items-center lg:py-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(23rem,26rem)]">
            <ScrollReveal className="max-w-[58rem]" delay={80} y={18}>
              <p className="hidden text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e] sm:block">
                {copy.hero.eyebrow}
              </p>
              <h1 className="max-w-[58rem] text-[2.25rem] font-semibold leading-[1.02] tracking-normal text-white [word-break:keep-all] sm:mt-4 sm:text-[4.4rem] lg:text-[4.65rem] xl:text-[5.2rem]">
                {copy.hero.title}
              </h1>
              <p className="mt-5 hidden max-w-2xl text-[0.96rem] font-medium leading-7 text-white/74 [word-break:keep-all] sm:mt-6 sm:block sm:text-lg">
                {copy.hero.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88] sm:h-[3.25rem] sm:px-7"
                  href={creatorHref}
                >
                  {copy.cta.creator}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/22 bg-black/34 px-5 text-sm font-semibold !text-white backdrop-blur-md transition hover:border-white/42 sm:h-[3.25rem] sm:px-7"
                  href={feedHref}
                >
                  {copy.cta.fan}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/14 bg-white/10 px-5 text-sm font-semibold !text-white backdrop-blur-md transition hover:border-[#44f26e]/60 hover:bg-white/14 sm:h-[3.25rem] sm:px-7"
                  href={studioHref}
                >
                  {copy.cta.studio}
                </Link>
              </div>
              <div className="mt-6 max-w-2xl sm:mt-8">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/56">
                  {copy.platformTrust.eyebrow}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {platformBrandLogos.map((platform) => (
                    <span
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-2.5 pr-3 text-[0.72rem] font-semibold text-white/78 backdrop-blur-md"
                      key={platform.label}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white p-1">
                        <Image
                          alt={platform.alt}
                          className="h-full w-full object-contain"
                          height={24}
                          src={platform.src}
                          width={24}
                        />
                      </span>
                      {platform.label}
                    </span>
                  ))}
                </div>
                <p className="mt-2 hidden max-w-xl text-xs font-medium leading-5 text-white/54 sm:block">
                  {copy.platformTrust.body}
                </p>
              </div>
            </ScrollReveal>

            <div className="hidden lg:flex min-w-0 flex-col gap-3">
              {heroSlides.length > 0 ? (
                <FanletterDesktopHeroCardCarousel slides={heroSlides} />
              ) : (
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[22rem] overflow-hidden rounded-lg border border-white/14 bg-[radial-gradient(circle_at_50%_8%,rgba(68,242,110,0.16),transparent_34%),linear-gradient(180deg,#07160d_0%,#030504_100%)] p-5 shadow-[0_34px_90px_rgba(0,0,0,0.42)]">
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                        {locale === "ko" ? "빠른 시작" : "Quick start"}
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold leading-[1.02] tracking-normal text-white [word-break:keep-all]">
                        {locale === "ko"
                          ? "3단계로 캐릭터 채널을 준비합니다."
                          : "Prepare a character channel in 3 steps."}
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {heroSetupSteps.map((step) => {
                        const Icon = step.Icon;

                        return (
                          <div
                            className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
                            key={step.title}
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                                <Icon className="size-5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                                  {step.label}
                                </span>
                                <span className="mt-1 block text-sm font-semibold text-white">
                                  {step.title}
                                </span>
                                <span className="mt-1 block text-xs font-medium leading-5 text-white/52">
                                  {step.body}
                                </span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {heroStats.map((stat, index) => (
                  <ScrollReveal
                    className="rounded-lg border border-white/12 bg-black/46 p-3 backdrop-blur-md"
                    delay={140 + index * 90}
                    key={stat.label}
                  >
                    <p className="text-2xl font-semibold leading-none text-white">
                      <AnimatedNumber
                        format={stat.format}
                        locale={locale}
                        value={stat.value}
                      />
                    </p>
                    <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/54">
                      {stat.label}
                    </p>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            <div className="hidden grid-cols-3 gap-1.5 self-start lg:hidden">
              {heroStats.map((stat, index) => (
                <ScrollReveal
                  className="rounded-lg border border-white/14 bg-black/42 px-2.5 py-2.5 shadow-[0_14px_28px_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-4"
                  delay={120 + index * 80}
                  key={stat.label}
                >
                  <p className="text-xl font-semibold leading-none text-white sm:text-3xl">
                    <AnimatedNumber
                      format={stat.format}
                      locale={locale}
                      value={stat.value}
                    />
                  </p>
                  <p className="mt-1.5 text-[0.56rem] font-semibold uppercase leading-tight tracking-[0.08em] text-white/54 sm:text-[0.68rem] sm:tracking-[0.16em]">
                    {stat.label}
                  </p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/8 bg-[#f6f8f4] px-4 py-14 text-black sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <ScrollReveal className="max-w-3xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#1f7c38]">
                {copy.liveVideos.eyebrow}
              </p>
              <h2 className="mt-4 text-[2.35rem] font-semibold leading-[1] tracking-normal text-[#07100b] [word-break:keep-all] sm:text-[3.8rem]">
                {copy.liveVideos.title}
              </h2>
            </ScrollReveal>
            <div className="flex flex-col gap-3 md:items-end">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {liveMetricStats.map((stat, index) => (
                  <ScrollReveal
                    className="rounded-lg border border-black/10 bg-white p-3 shadow-[0_12px_28px_rgba(8,18,12,0.04)]"
                    delay={index * 80}
                    key={stat.label}
                  >
                    <p className="text-xl font-semibold leading-none">
                      <AnimatedNumber
                        format={stat.format}
                        locale={locale}
                        value={stat.value}
                      />
                    </p>
                    <p className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-black/50">
                      {stat.label}
                    </p>
                  </ScrollReveal>
                ))}
              </div>
              <Link
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#07100b] px-5 text-sm font-semibold !text-white transition hover:bg-[#132018] sm:w-fit"
                href={feedHref}
              >
                {copy.cta.fan}
              </Link>
            </div>
          </div>

          {featuredVideos.length > 0 ? (
            <div className="mt-10 flex snap-x gap-3 overflow-x-auto pb-4 sm:gap-4">
              {featuredVideos.map((video, index) => {
                const publishedDate = formatDate(video.publishedAt, locale);
                const videoHref = buildPathWithReferral(
                  `/${locale}/fanletter/content/${video.contentId}`,
                  referralCode,
                );

                return (
                  <ScrollReveal
                    className="flex min-h-[31rem] min-w-[15.8rem] snap-start sm:min-h-[34rem] sm:min-w-[18rem] lg:min-w-[19rem]"
                    delay={index * 80}
                    key={video.contentId}
                  >
                    <Link
                      className="group flex h-full w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_44px_rgba(8,18,12,0.12)] transition hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(8,18,12,0.18)]"
                      href={videoHref}
                    >
                      <article className="flex h-full min-h-0 w-full flex-col">
                        <div className="relative h-[18.5rem] shrink-0 overflow-hidden bg-[#07100b] sm:h-[20rem]">
                          {video.coverImageUrl ? (
                            <div
                              className="absolute inset-0 scale-110 bg-cover bg-center opacity-[0.54] blur-xl"
                              style={{
                                backgroundImage: `url(${video.coverImageUrl})`,
                              }}
                            />
                          ) : null}
                          {video.coverImageUrl ? (
                            <video
                              aria-hidden="true"
                              autoPlay
                              className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition duration-500 group-hover:scale-[1.02] group-hover:brightness-110"
                              loop
                              muted
                              playsInline
                              poster={video.coverImageUrl}
                              preload="metadata"
                              src={video.videoUrl}
                            />
                          ) : (
                            <>
                              <video
                                aria-hidden="true"
                                autoPlay
                                className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition duration-500 group-hover:scale-[1.02] group-hover:brightness-110"
                                loop
                                muted
                                playsInline
                                preload="metadata"
                                src={video.videoUrl}
                              />
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(68,242,110,0.18),transparent_36%)]" />
                            </>
                          )}
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10)_0%,rgba(0,0,0,0.16)_48%,rgba(0,0,0,0.82)_100%)]" />
                          <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black">
                            {copy.liveVideos.free}
                          </div>
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#44f26e] bg-cover bg-center text-xs font-semibold text-black ring-2 ring-white/70"
                                style={
                                  video.authorAvatarImageUrl
                                    ? {
                                        backgroundImage: `url(${video.authorAvatarImageUrl})`,
                                      }
                                    : undefined
                                }
                              >
                                {video.authorAvatarImageUrl
                                  ? null
                                  : getAuthorInitial(video.authorName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {video.authorName}
                                </p>
                                {publishedDate ? (
                                  <p className="text-xs font-medium text-white/64">
                                    {publishedDate}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                          <h3 className="line-clamp-3 text-xl font-semibold leading-tight tracking-normal text-black">
                            {video.title}
                          </h3>
                          <p className="mt-3 line-clamp-4 text-sm font-medium leading-6 text-black/58">
                            {video.summary}
                          </p>
                          <div className="mt-auto inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-black px-3 text-sm font-semibold text-white">
                            <Clapperboard className="size-4" />
                            {copy.liveVideos.open}
                          </div>
                        </div>
                      </article>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 rounded-lg border border-black/10 bg-white p-6 text-sm font-semibold text-black/58">
              {copy.liveVideos.empty}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-white/8 bg-black px-4 py-16 sm:px-6 sm:py-22 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <ScrollReveal>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#44f26e]">
                {locale === "ko" ? "AI 캐릭터 브이로그 흐름" : "AI character vlog flow"}
              </p>
              <h2 className="mt-4 max-w-2xl text-[2.25rem] font-semibold leading-[1] tracking-normal text-white [word-break:keep-all] sm:text-[3.4rem]">
                {copy.proof.title}
              </h2>
              <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/62 sm:text-base">
                {locale === "ko"
                  ? "캐릭터 설정부터 숏폼 브이로그 생성, 팬 피드, 판매 확인까지 사용자가 따라갈 순서를 한 화면에서 이해할 수 있게 연결합니다."
                  : "Character setup, short-form vlog generation, public feeds, and sales checks are connected as one understandable creator flow."}
              </p>
            </ScrollReveal>

            <div className="grid gap-3">
              {proofSteps.map((step, index) => {
                const Icon = step.Icon;

                return (
                  <ScrollReveal
                    className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.055] p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:grid-cols-[6.5rem_1fr] sm:p-5"
                    delay={index * 90}
                    key={step.label}
                  >
                    <div>
                      <p className="text-4xl font-semibold leading-none text-[#44f26e]">
                        {step.value}
                      </p>
                      <p className="mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/46">
                        {step.label}
                      </p>
                    </div>
                    <div className="flex items-start gap-4">
                      <span
                        className={joinClasses(
                          "flex size-12 shrink-0 items-center justify-center rounded-lg text-black",
                          index === 1 ? "bg-[#e8f5ff]" : "bg-[#44f26e]",
                        )}
                      >
                        <Icon className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold leading-tight tracking-normal text-white">
                          {step.featureTitle}
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                          {step.featureDescription}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b border-white/8 bg-[#050806] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        id="features"
      >
        <div className="mx-auto max-w-[92rem]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <ScrollReveal>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#44f26e]">
                {copy.features.eyebrow}
              </p>
              <h2 className="mt-4 max-w-3xl text-[2.2rem] font-semibold leading-[1] tracking-normal text-white [word-break:keep-all] sm:text-[3.5rem]">
                {locale === "ko"
                  ? "모바일에서 바로 쓰는 AI 캐릭터 브이로그 기능"
                  : "AI character vlog tools that work from mobile"}
              </h2>
            </ScrollReveal>
            <Link
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/14 bg-white/8 px-5 text-sm font-semibold !text-white transition hover:bg-white/12 sm:w-fit"
              href={creatorHref}
            >
              {copy.cta.creator}
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {copy.features.items.map((feature, index) => {
              const Icon = featureIcons[index] ?? Sparkles;

              return (
                <ScrollReveal
                  className="flex h-full flex-col rounded-lg border border-white/10 bg-white p-4 text-black shadow-[0_18px_42px_rgba(0,0,0,0.2)]"
                  delay={index * 70}
                  key={feature.title}
                >
                  <div
                    className={joinClasses(
                      "flex h-28 items-center justify-center rounded-lg sm:h-32",
                      index === 0
                        ? "bg-[#44f26e]"
                        : index === 1
                          ? "bg-[#e8f5ff]"
                          : "bg-[#f4f4f1]",
                    )}
                  >
                    <Icon className="size-11" />
                  </div>
                  <div className="flex flex-1 flex-col pt-4">
                    {feature.badge ? (
                      <span className="inline-flex w-fit rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.66rem] font-semibold uppercase text-black">
                        {feature.badge}
                      </span>
                    ) : null}
                    <h3 className="mt-3 text-xl font-semibold leading-tight tracking-normal">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-black/58">
                      {feature.description}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-white/8 bg-[#f6f8f4] px-4 py-16 text-black sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <ScrollReveal>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#1f7c38]">
                {copy.targetAudience.eyebrow}
              </p>
              <h2 className="mt-4 max-w-4xl text-[2.2rem] font-semibold leading-[1] tracking-normal [word-break:keep-all] sm:text-[3.7rem]">
                {copy.targetAudience.title}
              </h2>
            </ScrollReveal>
            <Link
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-semibold !text-white transition hover:bg-black/82 sm:w-fit lg:justify-self-end"
              href={creatorHref}
            >
              {copy.cta.creator}
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {copy.targetAudience.items.map((item, index) => {
              const Icon = featureIcons[index] ?? Sparkles;

              return (
                <ScrollReveal
                  className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.07)]"
                  delay={index * 70}
                  key={item.title}
                >
                  <span
                    className={joinClasses(
                      "flex size-11 items-center justify-center rounded-lg text-black",
                      index === 0
                        ? "bg-[#44f26e]"
                        : index === 1
                          ? "bg-[#e8f5ff]"
                          : "bg-[#eef3ec]",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold leading-tight tracking-normal">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-black/58">
                    {item.description}
                  </p>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="bg-black px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
        id="creators"
      >
        <div className="mx-auto grid max-w-[92rem] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <ScrollReveal>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#44f26e]">
              {locale === "ko" ? "AI 캐릭터 채널 지표" : "AI character network"}
            </p>
            <h2 className="mt-5 max-w-4xl text-[2.45rem] font-semibold leading-[0.98] tracking-normal text-white [word-break:keep-all] sm:text-[4.2rem]">
              {copy.economy.title}
            </h2>
            <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-white/68 sm:text-lg">
              {copy.economy.body}
            </p>
            <Link
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#63f685] sm:w-fit"
              href={creatorHref}
            >
              {copy.economy.cta}
            </Link>
          </ScrollReveal>

          <ScrollReveal className="rounded-lg border border-white/10 bg-[linear-gradient(145deg,rgba(68,242,110,0.16),rgba(255,255,255,0.04)_42%,rgba(255,255,255,0.02))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.3)] sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Crown className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {copy.creatorWall.label}
                </p>
                <p className="mt-1 text-xs font-medium text-white/50">
                  {locale === "ko"
                    ? "현재 공개 데이터로 서비스 움직임을 보여줍니다."
                    : "Live public data keeps the service feel active."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {networkStats.map((stat, index) => {
                const Icon = stat.Icon;

                return (
                  <ScrollReveal
                    className="rounded-lg border border-white/10 bg-black/42 p-4"
                    delay={index * 80}
                    key={stat.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/46">
                        {stat.label}
                      </p>
                      <Icon className="size-4 text-[#44f26e]" />
                    </div>
                    <p className="mt-5 text-3xl font-semibold leading-none text-white">
                      <AnimatedNumber
                        format={stat.format}
                        locale={locale}
                        value={stat.value}
                      />
                    </p>
                  </ScrollReveal>
                );
              })}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[#2f3f2e] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-[92rem] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <ScrollReveal>
            <h2 className="max-w-4xl text-[2.7rem] font-semibold leading-[0.95] tracking-normal [word-break:keep-all] sm:text-[4.6rem]">
              {copy.niche.title}
            </h2>
            <p className="mt-6 max-w-xl text-base font-semibold leading-7 text-white/82">
              {copy.niche.body}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {copy.niche.categories.map((category, index) => (
                <span
                  className={joinClasses(
                    "inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold",
                    index === 0
                      ? "border-[#44f26e] bg-[#44f26e] text-black"
                      : "border-white/14 bg-white/8 text-white/78",
                  )}
                  key={category}
                >
                  {category}
                </span>
              ))}
            </div>
            <Link
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#63f685] sm:w-fit"
              href={creatorHref}
            >
              {copy.niche.cta}
            </Link>
          </ScrollReveal>

          {nicheVideos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {nicheVideos.map((video, index) => {
                const videoHref = buildPathWithReferral(
                  `/${locale}/fanletter/content/${video.contentId}`,
                  referralCode,
                );
                const publishedAt = formatDate(video.publishedAt, locale);

                return (
                  <ScrollReveal
                    className="group relative min-h-[19rem] overflow-hidden rounded-lg border border-white/12 bg-[#07100b] shadow-[0_22px_70px_rgba(0,0,0,0.24)]"
                    delay={120 + index * 90}
                    key={video.contentId}
                  >
                    <Link className="absolute inset-0" href={videoHref}>
                      {video.coverImageUrl ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                          style={{
                            backgroundImage: `url(${video.coverImageUrl})`,
                          }}
                        />
                      ) : (
                        <video
                          aria-hidden="true"
                          autoPlay
                          className="absolute inset-0 h-full w-full object-cover opacity-92 transition duration-500 group-hover:scale-[1.03]"
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          src={video.videoUrl}
                        />
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.18)_42%,rgba(0,0,0,0.84)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="text-xs font-semibold text-white/62">
                          {video.authorName}
                          {publishedAt ? ` · ${publishedAt}` : ""}
                        </p>
                        <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-tight tracking-normal text-white">
                          {video.title}
                        </h3>
                      </div>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.niche.categories.map((category) => (
                <div
                  className="rounded-lg border border-white/12 bg-white/8 p-5"
                  key={category}
                >
                  <p className="text-2xl font-semibold leading-none">
                    {category}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        className="grid gap-10 bg-black px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
        id="faq"
      >
        <h2 className="text-[4rem] font-semibold leading-none tracking-normal text-white sm:text-[7rem]">
          {copy.faqTitle}
        </h2>
        <div className="space-y-3">
          {copy.faq.map((item) => (
            <details
              className="group rounded-lg border border-white/12 bg-white/[0.03] p-4"
              key={item.question}
            >
              <summary className="flex list-none items-center justify-between gap-4 text-base font-semibold text-white">
                <span>{item.question}</span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/14 text-[#44f26e] group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm font-medium leading-6 text-white/64">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="bg-white px-4 pb-8 pt-10 text-black sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_1.4fr] md:gap-10">
          <div>
            <p className="max-w-lg text-[2.15rem] font-semibold leading-[1.02] tracking-normal [word-break:keep-all] sm:text-4xl sm:leading-[1]">
              {copy.footer.title}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                className="inline-flex h-11 min-w-0 items-center justify-center rounded-lg bg-[#44f26e] px-3 text-center text-sm font-semibold !text-black sm:px-5"
                href={creatorHref}
              >
                {copy.cta.creator}
              </Link>
              <Link
                className="inline-flex h-11 min-w-0 items-center justify-center rounded-lg border border-black/12 px-3 text-center text-sm font-semibold !text-black sm:px-5"
                href={feedHref}
              >
                {copy.cta.fan}
              </Link>
            </div>
          </div>
          <div className="sm:hidden">
            <div className="grid grid-cols-3 gap-2 text-center text-[0.78rem] font-semibold text-black/70">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-[#f6f8f4] px-2"
                href={studioHref}
              >
                {mobileFooterLabels.studio}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-[#f6f8f4] px-2"
                href={feedHref}
              >
                {mobileFooterLabels.feed}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-[#f6f8f4] px-2"
                href={connectHref}
              >
                {mobileFooterLabels.activate}
              </Link>
            </div>
            <div className="mt-5 grid gap-2 text-sm font-semibold text-black/68">
              <div className="flex min-h-10 items-center gap-2">
                <ShieldCheck className="size-4 shrink-0" />
                <span>{footerLabels.mobileFirst}</span>
              </div>
              <div className="flex min-h-10 items-center gap-2">
                <BadgeDollarSign className="size-4 shrink-0" />
                <span>{footerLabels.usdtReady}</span>
              </div>
              <div className="flex min-h-10 items-center gap-2">
                <ChartNoAxesCombined className="size-4 shrink-0" />
                <span>{footerLabels.creatorGrowth}</span>
              </div>
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-6 text-sm font-semibold text-black/62 sm:grid sm:grid-cols-4">
            <div>
              <p className="text-black">FanLetter</p>
              <div className="mt-4 space-y-2">
                <Link className="block" href={studioHref}>
                  {footerLabels.studio}
                </Link>
                <Link className="block" href={feedHref}>
                  {footerLabels.feed}
                </Link>
                <Link className="block" href={connectHref}>
                  {footerLabels.activate}
                </Link>
              </div>
            </div>
            <div>
              <p className="text-black">{copy.nav.features}</p>
              <div className="mt-4 space-y-2">
                <a className="block" href="#features">
                  {footerLabels.aiContent}
                </a>
                <a className="block" href="#creators">
                  {footerLabels.network}
                </a>
              </div>
            </div>
            <div>
              <p className="text-black">{copy.nav.faq}</p>
              <div className="mt-4 space-y-2">
                <a className="block" href="#faq">
                  {footerLabels.help}
                </a>
              </div>
            </div>
            <div>
              <p className="text-black">{footerLabels.trust}</p>
              <div className="mt-4 flex items-center gap-2">
                <ShieldCheck className="size-4" />
                <span>{footerLabels.mobileFirst}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <BadgeDollarSign className="size-4" />
                <span>{footerLabels.usdtReady}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <ChartNoAxesCombined className="size-4" />
                <span>{footerLabels.creatorGrowth}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
