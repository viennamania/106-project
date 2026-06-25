import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import {
  AnimatedNumber,
  ScrollReveal,
} from "@/components/fanletter-home-motion";
import type { FanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import type {
  FanletterFeaturedVideo,
  FanletterLiveStats,
} from "@/lib/fanletter-landing-service";
import type { Locale } from "@/lib/i18n";
import {
  getFanletterV2LocalizedText,
  type AIStar,
  type CreatorUnlockData,
  type MemberPortfolio,
  type ScoutShareLoopData,
} from "@/mock/fanletterV2";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterCopy = {
  announcement: {
    label: string;
    prize: string;
  };
  brandSuffix: string;
  cta: {
    campaign: string;
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
  growthModel: {
    body: string;
    disclaimer: string;
    eyebrow: string;
    items: Array<{
      description: string;
      title: string;
      value: string;
    }>;
    title: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
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
    campaigns: string;
    creators: string;
    faq: string;
    features: string;
    paid: string;
    reports: string;
    studio: string;
  };
  paidSpotlight: {
    badge: string;
    body: string;
    buyerMetric: string;
    commentMetric: string;
    cta: string;
    emptyBody: string;
    emptyTitle: string;
    eyebrow: string;
    priceNote: string;
    proofHot: string;
    proofNew: string;
    proofProven: string;
    proofRising: string;
    previewLabel: string;
    purchaseLibrary: string;
    railBody: string;
    railCta: string;
    railEyebrow: string;
    railTitle: string;
    saveMetric: string;
    title: string;
    unlockHint: string;
    unlockItems: string[];
    unlockTitle: string;
  };
  niche: {
    body: string;
    cta: string;
    title: string;
    categories: string[];
  };
  nsfwExample: {
    body: string;
    disabledBody: string;
    disabledTitle: string;
    enabledBody: string;
    enabledTitle: string;
    eyebrow: string;
    gateBody: string;
    gateTitle: string;
    note: string;
    title: string;
    videoLabel: string;
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

export type FanletterHomeShareContext = {
  avatarImageUrl: string | null;
  channelHref: string;
  channelName: string;
  creatorReferralCode: string;
  onboardingHref: string;
  shareId: string | null;
  sponsorName: string;
  sponsorSlug: string;
};

const koCopy: FanletterCopy = {
  announcement: {
    label: "파운더 클럽 2.0 성장 루프",
    prize: "AI 스타 발견 → 파운더 → 크리에이터",
  },
  brandSuffix: "AI 캐릭터 브이로그",
  cta: {
    campaign: "캠페인 스튜디오",
    creator: "캐릭터 채널 시작",
    fan: "브이로그 피드 보기",
    login: "계정 연결",
    studio: "브이로그 스튜디오",
  },
  creatorWall: {
    count: "201,548",
    label: "팬이 만든 AI 캐릭터 성장 신호",
  },
  economy: {
    body: "팬의 요청과 결제 신호를 캐릭터 성장 데이터로 쌓고, 팬 전용 콘텐츠 수익을 참여 보상과 공유 모델로 확장합니다.",
    cta: "캐릭터 만들기",
    title: "팬이 키우고 함께 벌어가는 AI 캐릭터 경제.",
  },
  faq: [
    {
      answer: "AIAVpark는 얼굴 공개 없이 같은 AI 캐릭터와 대표 아바타로 숏폼 브이로그 채널을 만들고, 팬 요청과 유료 콘텐츠 수익 흐름으로 캐릭터를 성장시키는 창작자 플랫폼입니다.",
      question: "AIAVpark는 무엇인가요?",
    },
    {
      answer: "얼굴 공개 없이 숏폼 채널을 만들고 싶은 개인, AI 인플루언서 운영자, 유료 커뮤니티 크리에이터, 브랜드 마스코트와 IP 팀에 맞춰져 있습니다.",
      question: "누가 사용할 수 있나요?",
    },
    {
      answer: "브이로그 스튜디오에서 오늘의 숏폼 브이로그를 만들고, 공개 범위와 가격을 정해 팬 피드와 판매 흐름으로 연결합니다. 팬 전용 매출은 정책 조건에 따라 참여 보상과 수익 공유 모델로 확장할 수 있습니다.",
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
        description: "팬이 응원하고 성장시킬 고정 AI 캐릭터와 대표 아바타를 먼저 만듭니다.",
        title: "AI 캐릭터 만들기",
      },
      {
        badge: "새 기능",
        description: "셀피, 외출, 루틴, 대화형 장면을 세로형 숏폼 브이로그로 생성합니다.",
        title: "숏폼 브이로그 생성",
      },
      {
        description: "요청, 댓글, 저장, 공유, 구매 신호를 하나의 캐릭터 피드에 기록해 성장 단계로 보여줍니다.",
        title: "캐릭터 피드",
      },
      {
        description: "팬 전용 콘텐츠 매출을 참여 팬의 보상과 공유 구조로 확장할 수 있게 설계합니다.",
        title: "팬 참여 수익 모델",
      },
      {
        description: "브랜드 마스코트, 웹툰, 게임, 버추얼 아이돌 IP를 캐릭터 브이로그로 확장합니다.",
        title: "브랜드와 IP 숏폼화",
      },
    ],
  },
  footer: {
    title: "AI 스타를 발견하고 파운더 영향력을 키우는 성장 루프.",
  },
  growthModel: {
    body:
      "팬은 다음 장면을 요청하고, 응원 메시지를 남기고, 팬 전용 콘텐츠를 잠금 해제합니다. 이 신호가 캐릭터의 성장 단계와 다음 콘텐츠 방향이 되고, 매출은 팬 참여 보상과 공유 모델로 확장됩니다.",
    disclaimer:
      "수익 공유와 보상은 실제 운영 정책, 정산 조건, 참여 기준에 따라 제공되며 특정 수익을 보장하지 않습니다.",
    eyebrow: "팬 참여 성장 모델",
    items: [
      {
        description: "댓글, 응원 메시지, 다음 장면 요청이 캐릭터의 성격과 콘텐츠 방향을 더 선명하게 만듭니다.",
        title: "팬이 방향을 만듭니다",
        value: "01",
      },
      {
        description: "저장, 공유, 구매 같은 행동 신호를 성장 단계와 다음 미션으로 연결해 캐릭터의 활동 기록을 쌓습니다.",
        title: "캐릭터가 성장합니다",
        value: "02",
      },
      {
        description: "팬 전용 콘텐츠 수익은 참여 팬에게 돌아가는 보상과 공유 구조로 확장할 수 있습니다.",
        title: "수익 흐름을 나눕니다",
        value: "03",
      },
    ],
    title: "AI 캐릭터는 팬에 의해 성장하고, 벌어들인 수익은 팬과 함께 커집니다.",
  },
  hero: {
    eyebrow: "FANLETTER",
    title: "AI 스타를 발견하고, 파운더가 되고, 크리에이터로 성장하세요",
    description:
      "FanLetter는 AI 캐릭터 콘텐츠 플랫폼을 넘어 AI 스타 발견, 파운더, 친구 초대, 크리에이터 성장 플랫폼으로 진화합니다.",
  },
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
    campaigns: "친구 초대",
    creators: "크리에이터",
    faq: "FAQ",
    features: "발견",
    paid: "파운더 클럽",
    reports: "포트폴리오",
    studio: "스튜디오",
  },
  paidSpotlight: {
    badge: "팬 전용 · 1 USDT",
    body: "무료 공개 브이로그로 캐릭터 분위기를 확인한 뒤, 더 가까운 루틴과 답장 장면은 팬 전용에서 잠금 해제합니다. 결제와 반응은 캐릭터 성장 신호와 팬 보상 흐름으로 이어집니다.",
    buyerMetric: "구매",
    commentMetric: "댓글",
    cta: "잠금 브이로그 보기",
    emptyBody:
      "유료 팬 전용 브이로그가 준비되면 공개 티저와 잠금 해제 항목이 이곳에 먼저 표시됩니다.",
    emptyTitle: "팬 전용 브이로그를 준비 중입니다.",
    eyebrow: "팬 전용 유료 브이로그",
    priceNote: "결제 후 전체 영상과 상세 본문이 열립니다.",
    proofHot: "인기 팬 전용",
    proofNew: "새 잠금 공개",
    proofProven: "결제 검증",
    proofRising: "반응 상승",
    previewLabel: "공개 티저",
    purchaseLibrary: "구매함 보기",
    railBody:
      "공개 브이로그로 캐릭터 분위기를 확인한 뒤, 팬 답장과 비공개 루틴이 담긴 유료 브이로그를 이어서 확인하세요. 팬의 잠금 해제는 캐릭터 성장과 보상 흐름의 시작점입니다.",
    railCta: "팬 전용 더 보기",
    railEyebrow: "팬 전용 하이라이트",
    railTitle: "팬 전용으로 더 볼 수 있는 브이로그",
    saveMetric: "저장",
    title: "공개 브이로그 다음에 열리는 팬 전용.",
    unlockHint: "전체 영상 + 상세 본문",
    unlockItems: ["전체 업로드 영상", "상세 본문과 이미지", "댓글과 다음 요청"],
    unlockTitle: "결제 후 열리는 항목",
  },
  niche: {
    body: "개인, AI 인플루언서, 브랜드 마스코트, 웹툰·게임·버추얼 아이돌 IP까지 하나의 캐릭터 채널로 숏폼화합니다.",
    cta: "캐릭터 만들기",
    title: "캐릭터가 있으면 채널을 만들 수 있습니다.",
    categories: ["얼굴 비공개", "AI 인플루언서", "팬 커뮤니티", "브랜드 마스코트", "IP 숏폼"],
  },
  nsfwExample: {
    body:
      "성인 팬 전용 채널은 공개 피드와 분리해 opt-in한 팬에게만 더 직접적인 AI 캐릭터 분위기와 팬 전용 샘플을 보여줍니다.",
    disabledBody:
      "성인 성향 샘플은 opt-in 후에만 표시됩니다. 기본 공개 피드와 일반 브이로그 영역에서는 숨김 처리됩니다.",
    disabledTitle: "NSFW 예시 영상 숨김",
    enabledBody:
      "성인 성향 AI 캐릭터 샘플이 표시됩니다. 언제든 다시 숨김으로 전환할 수 있습니다.",
    enabledTitle: "NSFW 예시 영상 표시 중",
    eyebrow: "성인 팬 전용 예시",
    gateBody:
      "opt-in 전에는 영상 프레임을 로드하지 않고, 성인 팬 전용 콘텐츠 정책과 동일하게 분리합니다.",
    gateTitle: "성인 성향 샘플 잠금",
    note: "권리 확인된 예시 영상이며, 팬 전용/NSFW 맥락에서만 노출됩니다.",
    title: "성인 팬 전용 AI 캐릭터는 별도 동의 뒤에만 보여줍니다.",
    videoLabel: "성인 팬 전용 AI 캐릭터 예시 영상",
  },
  platformTrust: {
    body: "릴스·쇼츠·틱톡 게시에 필요한 캡션, 해시태그, AIAVpark 링크를 정리합니다.",
    eyebrow: "숏폼 게시 패키지",
  },
  proof: {
    title: "팬 요청부터 캐릭터 성장과 수익 공유까지",
    stats: [
      { label: "팬 요청", value: "01" },
      { label: "성장 단계", value: "05" },
      { label: "수익 흐름", value: "24/7" },
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
        description: "Fanvue, Patreon, 유료 팬 커뮤니티로 이어지는 수익과 참여 보상 흐름을 만듭니다.",
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
    label: "Founder Club 2.0 growth loop",
    prize: "AI Star Discovery → Founder → Creator",
  },
  brandSuffix: "AI Character Vlogger",
  cta: {
    campaign: "Campaign Studio",
    creator: "Start AI character channel",
    fan: "Explore vlog feed",
    login: "Connect account",
    studio: "Vlog studio",
  },
  creatorWall: {
    count: "201,548",
    label: "fan signals powering AI character growth",
  },
  economy: {
    body: "Fan requests, unlocks, and payment signals become character growth data, while fan-only revenue can expand into participation rewards and sharing models.",
    cta: "Start now",
    title: "An AI character economy fans help grow and share.",
  },
  faq: [
    {
      answer: "AIAVpark is a creator platform for building short-form vlog channels with a fixed AI character, then growing that character through fan requests and paid content revenue flows without showing your real face.",
      question: "What is AIAVpark?",
    },
    {
      answer: "It is built for no-face creators, AI influencer operators, paid community creators, brands, and teams turning webtoon, game, or virtual idol IP into short-form channels.",
      question: "Who is it for?",
    },
    {
      answer: "Create today's short-form vlog in the studio, choose visibility and pricing, then publish it into the fan feed and sales flow. Fan-only revenue can expand into participation rewards and sharing models under the service policy.",
      question: "How do vlogs monetise?",
    },
    {
      answer: "Yes. Character setup, today's vlog creation, feed browsing, account connection, and sales views are designed around mobile use.",
      question: "Is it mobile first?",
    },
  ],
  faqTitle: "FAQ",
  features: {
    eyebrow: "Features",
    items: [
      {
        badge: "New",
        description: "Create a fixed AI character and representative avatar that fans can support and grow over time.",
        title: "AI character setup",
      },
      {
        badge: "New",
        description: "Turn selfies, routines, outings, and conversational scenes into vertical short-form vlogs.",
        title: "Short-form vlog creation",
      },
      {
        description: "Track requests, comments, saves, shares, and unlocks in one character feed so growth is visible.",
        title: "Character feed",
      },
      {
        description: "Design fan-only revenue to expand into participation rewards and sharing models for active fans.",
        title: "Fan revenue model",
      },
      {
        description: "Turn mascots, webtoon characters, game characters, and virtual idol IP into short-form channels.",
        title: "Brand and IP shorts",
      },
    ],
  },
  footer: {
    title: "Discover AI Stars and grow Founder influence.",
  },
  growthModel: {
    body:
      "Fans request the next scene, leave supportive messages, and unlock fan-only content. Those signals shape the character's growth stage and next content direction, while revenue can expand into fan participation rewards and sharing models.",
    disclaimer:
      "Rewards and revenue sharing depend on actual service policy, settlement terms, and participation criteria. No specific income is guaranteed.",
    eyebrow: "Fan-powered growth model",
    items: [
      {
        description: "Comments, support messages, and next-scene requests make the character identity and content direction sharper.",
        title: "Fans shape direction",
        value: "01",
      },
      {
        description: "Saves, shares, and purchases become growth-stage signals and a visible activity record for the character.",
        title: "The character grows",
        value: "02",
      },
      {
        description: "Fan-only revenue can expand into rewards and sharing structures for participating fans.",
        title: "Revenue flow is shared",
        value: "03",
      },
    ],
    title: "AI characters grow through fans, and the revenue they create can grow with fans.",
  },
  hero: {
    eyebrow: "FANLETTER",
    title: "Discover AI Stars, become a Founder, and grow into a Creator.",
    description:
      "FanLetter is evolving from an AI character content platform into an AI Star Discovery, Founder, Scout, and Creator growth platform.",
  },
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
    campaigns: "Campaigns",
    creators: "Characters",
    faq: "FAQ",
    features: "Features",
    paid: "Fan-only",
    reports: "My reports",
    studio: "Studio",
  },
  paidSpotlight: {
    badge: "Fan-only · 1 USDT",
    body:
      "Fans can preview the public vibe first, then unlock closer routines and reply scenes from fan-only paid vlogs. Unlocks and reactions become growth signals and reward flow inputs.",
    buyerMetric: "buyers",
    commentMetric: "comments",
    cta: "View locked vlogs",
    emptyBody:
      "When paid fan-only vlogs are ready, their public teaser and unlock details will appear here first.",
    emptyTitle: "Fan-only vlogs are being prepared.",
    eyebrow: "Fan-only paid vlogs",
    priceNote: "Full video and detail body unlock after payment.",
    proofHot: "Popular fan-only",
    proofNew: "New locked drop",
    proofProven: "Payment-proven",
    proofRising: "Rising reactions",
    previewLabel: "Public teaser",
    purchaseLibrary: "Purchases",
    railBody:
      "After the public vlog preview, continue into fan replies and private routines that unlock as paid fan-only vlogs. Each unlock starts a growth and reward signal.",
    railCta: "Explore fan-only",
    railEyebrow: "Fan-only highlights",
    railTitle: "Fan-only vlogs to unlock next",
    saveMetric: "saves",
    title: "Fan-only opens after the public vlog.",
    unlockHint: "Full video + detail body",
    unlockItems: ["Full uploaded video", "Detail body and images", "Comments and next requests"],
    unlockTitle: "Unlock includes",
  },
  niche: {
    body: "Individuals, AI influencers, brand mascots, and webtoon, game, or virtual idol IP can become short-form character channels.",
    cta: "Open vlog studio",
    title: "If you have a character, you can build a channel.",
    categories: ["No-face", "AI Influencer", "Fan Community", "Brand Mascot", "IP Shorts"],
  },
  nsfwExample: {
    body:
      "Adult fan-only channels stay separate from the public feed and show more direct AI character samples only to fans who opt in.",
    disabledBody:
      "The adult sample is hidden until opt-in. It stays separate from the default public feed and general vlog areas.",
    disabledTitle: "NSFW sample hidden",
    enabledBody:
      "The adult AI character sample is visible. You can hide it again at any time.",
    enabledTitle: "NSFW sample visible",
    eyebrow: "Adult fan-only sample",
    gateBody:
      "Before opt-in, the video frame is not loaded and follows the same separation model as NSFW fan-only content.",
    gateTitle: "Adult sample locked",
    note: "Rights-cleared sample video shown only in the fan-only/NSFW context.",
    title: "Adult fan-only AI characters appear only after separate consent.",
    videoLabel: "Adult fan-only AI character sample video",
  },
  platformTrust: {
    body: "Prepares captions, hashtags, and AIAVpark links for Reels, Shorts, and TikTok posts.",
    eyebrow: "Short-form posting package",
  },
  proof: {
    title: "From fan requests to character growth and revenue sharing",
    stats: [
      { label: "fan requests", value: "01" },
      { label: "growth stage", value: "05" },
      { label: "revenue flow", value: "24/7" },
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
        description: "Build revenue and participation reward flows that can connect to Fanvue, Patreon, and paid fan communities.",
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


function getFanletterCopy(locale: Locale) {
  return locale === "ko" ? koCopy : enCopy;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getAuthorInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

function formatMetric(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

function FanletterAgentRankHomeCard({
  href,
  locale,
  snapshot,
}: {
  href: string;
  locale: Locale;
  snapshot?: FanletterAgentRankInvestorSnapshot | null;
}) {
  if (!snapshot) {
    return null;
  }

  const isKo = locale === "ko";
  const copy = isKo
    ? {
        body: "발견, 참여, 초대, 기여 포인트 보상이 활동 기록으로 쌓입니다.",
        cta: "AgentRank 보기",
        events: "활동 기록",
        network: "네트워크",
        title: "Reputation Event Factory",
      }
    : {
        body:
          "Discovery, joins, invites, and Contribution Point rewards are recorded as AgentRank reputation events.",
        cta: "View AgentRank",
        events: "Reputation Events",
        network: "Network",
        title: "Reputation Event Factory",
      };
  const scorePercent = Math.round(
    (snapshot.ers.score / Math.max(1, snapshot.ers.maxScore)) * 100,
  );
  const metrics = [
    {
      label: copy.events,
      value: snapshot.ers.summary.eventCount,
    },
    {
      label: copy.network,
      value: snapshot.ers.summary.networkEdges,
    },
    {
      label: isKo ? "기여 포인트" : "Contribution Points",
      value: snapshot.ers.summary.cpTotal,
    },
  ];

  return (
    <div className="rounded-[1.35rem] border border-zinc-200 bg-white/92 p-4 shadow-[0_22px_56px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-700">
            <ShieldCheck className="size-4 shrink-0" />
            AgentRank ERS
          </p>
          <h2 className="mt-2 break-words text-base font-semibold text-[#12041f] [word-break:keep-all]">
            {copy.title}
          </h2>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500 [word-break:keep-all]">
            {copy.body}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-900">
          {snapshot.ers.score}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div className="min-w-0 rounded-xl bg-slate-50 p-2.5" key={metric.label}>
            <p className="truncate text-sm font-semibold text-[#12041f]">
              {formatMetric(metric.value, locale)}
            </p>
            <p className="mt-1 truncate text-[0.58rem] font-semibold text-slate-400">
              {metric.label}
            </p>
          </div>
        ))}
      </div>

      <FanletterTrackedLink
        agentRank={{
          eventType: "content_engaged",
          intent: "agentrank_preview_open",
          source: "fanletter_home",
        }}
        className="mt-4 inline-flex h-10 min-w-0 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold !text-zinc-900"
        eventName="content_open"
        href={href}
        metadata={{
          placement: "fanletter_home_agentrank_card",
        }}
      >
        <span className="truncate">{copy.cta}</span>
        <ArrowRight className="size-4 shrink-0" />
      </FanletterTrackedLink>
    </div>
  );
}

function FanletterProductHomeDashboard({
  agentRankHref,
  agentRankSnapshot,
  aiStarGenealogyHref,
  copy,
  creatorUnlock,
  creatorUnlockHref,
  liveStats,
  locale,
  memberPortfolio,
  referralCode,
  scoutShareLoop,
  scoutShareLoopHref,
  selectedStarId,
  stars,
  topGrowingStarsHref,
}: {
  agentRankHref: string;
  agentRankSnapshot?: FanletterAgentRankInvestorSnapshot | null;
  aiStarGenealogyHref: string;
  copy: FanletterCopy;
  creatorUnlock?: CreatorUnlockData | null;
  creatorUnlockHref: string;
  liveStats: FanletterLiveStats;
  locale: Locale;
  memberPortfolio?: MemberPortfolio | null;
  referralCode: string | null;
  scoutShareLoop?: ScoutShareLoopData | null;
  scoutShareLoopHref: string;
  selectedStarId?: string | null;
  stars?: AIStar[] | null;
  topGrowingStarsHref: string;
}) {
  const isKo = locale === "ko";
  const starList = stars ?? [];
  const primaryStar =
    starList.find((star) => star.id === selectedStarId) ??
    starList.find((star) => star.id === scoutShareLoop?.starId) ??
    starList[0] ??
    null;
  const primaryStarFounderNetworkHref = primaryStar
    ? buildPathWithReferral(
        `/${locale}/fanletter/${encodeURIComponent(primaryStar.id)}/universe`,
        referralCode,
      )
    : aiStarGenealogyHref;
  const topStars = starList.slice(0, 3);
  // The "My Growth Status" card is member-centric; hide it for anonymous
  // visitors so the home leads with AI-star discovery instead of a zeroed card.
  const showPortfolio = Boolean(memberPortfolio);
  const portfolioStats = [
    {
      label: isKo ? "친구 초대 점수" : "Scout Score",
      value: memberPortfolio?.scoutScore ?? 0,
      suffix: "",
    },
    {
      label: isKo ? "직접 초대" : "Direct Invites",
      value: memberPortfolio?.directInvites ?? 0,
      suffix: isKo ? "명" : "",
    },
    {
      label: isKo ? "기여 포인트" : "Contribution Points",
      value: memberPortfolio?.cpBalance ?? 0,
      suffix: "",
    },
    {
      label: isKo ? "Creator 가능성" : "Creator Eligibility",
      value: memberPortfolio?.creatorEligibilityPercent ?? 0,
      suffix: "%",
    },
  ];
  const productCopy = isKo
    ? {
        connect: "계정 연결",
        creator: "크리에이터 권한",
        creatorReady: "AI 스타 창업 준비 완료",
        discovery: "AI 스타 발견",
        founder: "파운더",
        founderNetworkCta: "파운더 네트워크 보기",
        founderUniverse: "파운더 네트워크",
        growth: "성장",
        headline: "함께 키울 AI 스타를 발견하세요",
        join: "파운더 참여",
        locked: "조건 확인",
        loop: "발견 → 초대 → 보상 → 창업",
        open: "남은 자리",
        portfolio: "내 성장 상태",
        primaryCta: "AI 스타 발견하기",
        reward: "이번 공유 보상",
        scout: "친구 초대 공유",
        score: "스타 점수",
        shareCode: "추천 코드",
        subhead:
          "마음에 드는 AI 스타를 고르면 바로 시작돼요. 참여가 기록으로 쌓이며 스타와 함께 성장합니다.",
        starCardFlow: "상세에서 파운더 참여",
        swipeHint: "좌우로 밀어 더 보기",
        today: "오늘 할 일",
        topGrowingTitle: "성장 중인 AI 스타",
        actionResult: "선택하면 상세에서 참여",
        aiStarBadge: "AI STAR",
        eventResult: "활동 기록 생성",
        resultDetail: "발견 신호가 활동 기록에 저장",
        unlocked: "활성화",
        universeMap: "AI 스타 유니버스 맵",
      }
    : {
        connect: "Connect Account",
        creator: "Creator Permission",
        creatorReady: "AI Star launch ready",
        discovery: "AI Star Discovery",
        founder: "Founder",
        founderNetworkCta: "View Founder Network",
        founderUniverse: "Founder Network",
        growth: "Growth",
        headline: "Discover an AI star to grow together",
        join: "Join Founder",
        locked: "Locked",
        loop: "Discover → Invite → Reward → Launch",
        open: "Open spots",
        portfolio: "My Growth Status",
        primaryCta: "Discover AI Stars",
        reward: "Share Reward",
        scout: "Scout Share",
        score: "Score",
        shareCode: "Referral Code",
        subhead:
          "Pick an AI star you like and it starts right away — your participation builds up as you grow together.",
        starCardFlow: "Detail → Founder join",
        swipeHint: "Swipe to see more",
        today: "Today",
        topGrowingTitle: "Top Growing AI Stars",
        actionResult: "Open detail to join",
        aiStarBadge: "AI STAR",
        eventResult: "AI Star Discovery event",
        resultDetail: "Discovery signal is saved as a activity record.",
        unlocked: "Unlocked",
        universeMap: "AI Star Universe Map",
      };
  return (
    <section className="mx-auto grid w-full max-w-5xl min-w-0 flex-1 content-start gap-4 overflow-x-hidden pb-7 pt-4 sm:gap-5 sm:py-8">
      <div className="grid min-w-0 gap-4">
        <div>
          <div className="min-w-0 overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white p-3 shadow-[0_14px_42px_rgba(15,23,42,0.055)] sm:p-4">
            <div className="grid min-w-0 gap-4">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="min-w-0">
                  <p className="inline-flex max-w-full rounded-full border border-zinc-200 bg-white px-3 py-1 text-[0.68rem] font-semibold text-zinc-700">
                    {productCopy.loop}
                  </p>
                  <h1 className="mt-3 max-w-2xl text-[2.05rem] font-semibold leading-[1.03] tracking-normal text-zinc-950 [word-break:keep-all] sm:text-[3rem]">
                    {productCopy.headline}
                  </h1>
                  <p className="mt-3 hidden max-w-2xl break-words text-sm font-medium leading-6 text-zinc-600 [overflow-wrap:anywhere] sm:block sm:text-base sm:[word-break:keep-all]">
                    {productCopy.subhead}
                  </p>
                  {starList.length > 0 ? (
                    <Link
                      className="group mt-4 inline-flex items-center gap-3 self-start rounded-full border border-zinc-200 bg-white py-1.5 pl-1.5 pr-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition hover:border-zinc-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.09)]"
                      href={topGrowingStarsHref}
                    >
                      <span className="flex -space-x-2.5">
                        {starList.slice(0, 5).map((star) => (
                          <span
                            aria-hidden="true"
                            className="size-9 shrink-0 rounded-full border-2 border-white bg-cover bg-center"
                            key={star.id}
                            style={
                              star.portraitImageUrl
                                ? { backgroundImage: `url(${star.portraitImageUrl})` }
                                : {
                                    background: `linear-gradient(145deg, ${star.accentColor}, ${star.accentSecondary})`,
                                  }
                            }
                          />
                        ))}
                      </span>
                      <span className="text-sm font-semibold text-zinc-800">
                        {isKo
                          ? "지금 성장 중인 AI 스타 둘러보기"
                          : "Browse the AI stars growing now"}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5" />
                    </Link>
                  ) : null}
                </div>
                <FanletterActionGuide
                  currentLabel={productCopy.today}
                  metrics={[
                    {
                      label: productCopy.founder,
                      value: `${formatMetric(primaryStar?.founderCount ?? 0, locale)}`,
                    },
                    {
                      label: productCopy.open,
                      value: `${formatMetric(primaryStar?.openSlots.open ?? 0, locale)}`,
                    },
                  ]}
                  primaryAction={{
                    agentRank: {
                      eventType: "ai_star_discovered",
                      intent: "home_primary_discovery",
                      source: "fanletter_home",
                      starId: primaryStar?.id ?? null,
                    },
                    href: topGrowingStarsHref,
                    label: productCopy.primaryCta,
                    metadata: {
                      placement: "fanletter_product_home_primary_discovery",
                    },
                    referralCode,
                  }}
                  reputationEventLabel={
                    isKo ? "활동 기록 생성" : "Reputation Event"
                  }
                  secondaryActions={[]}
                  steps={[
                    { label: productCopy.discovery, status: "active" },
                    { label: productCopy.join, status: "next" },
                    { label: productCopy.scout, status: "next" },
                    { label: productCopy.creator, status: "next" },
                  ]}
                  subtitle={
                    isKo
                      ? "먼저 성장 중인 AI 스타를 선택하세요. 선택과 참여가 활동 기록으로 쌓입니다."
                      : "Start by choosing a growing AI Star. Discovery and joins become activity records."
                  }
                  title={
                    isKo
                      ? "다음 행동: AI 스타 발견"
                      : "Next action: discover an AI Star"
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className={joinClasses(
            "grid min-w-0 max-w-full gap-4 overflow-hidden",
            showPortfolio ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : "",
          )}
        >
          <ScrollReveal className="min-w-0 max-w-full overflow-hidden" delay={140} y={16}>
            <div className="min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.045)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {productCopy.discovery}
                  </p>
                  <h2 className="mt-1 break-words text-lg font-semibold text-zinc-950 [word-break:keep-all]">
                    {productCopy.topGrowingTitle}
                  </h2>
                </div>
                <Link
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold !text-zinc-800"
                  href={topGrowingStarsHref}
                >
                  {copy.nav.features}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <p className="mt-3 text-[0.66rem] font-semibold text-slate-400 lg:hidden">
                {productCopy.swipeHint}
              </p>

              <div className="relative -mx-1 mt-4 min-w-0 max-w-full overflow-hidden">
                <div
                  aria-label={productCopy.topGrowingTitle}
                  className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 pr-10 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
                  data-fanletter-top-stars-scroller
                >
                  {topStars.map((star) => (
                    <FanletterTrackedLink
                      agentRank={{
                        eventType: "ai_star_discovered",
                        intent: "top_growing_star_open",
                        source: "fanletter_home",
                        starId: star.id,
                      }}
                      className="group w-[12.9rem] max-w-[calc(100vw-4.75rem)] shrink-0 snap-start overflow-hidden rounded-[1.1rem] border border-zinc-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.09)] min-[390px]:w-[13.75rem] lg:w-[14.5rem]"
                      eventName="content_open"
                      href={buildPathWithReferral(
                        `/${locale}/fanletter/${encodeURIComponent(star.id)}`,
                        referralCode,
                      )}
                      key={star.id}
                      metadata={{
                        placement: "fanletter_top_growing_ai_star",
                        starName: star.name,
                      }}
                      referralCode={referralCode}
                    >
                      <div
                        className="relative aspect-square w-full overflow-hidden bg-cover bg-center"
                        style={
                          star.portraitImageUrl
                            ? { backgroundImage: `url(${star.portraitImageUrl})` }
                            : {
                                background: `linear-gradient(150deg, ${star.accentColor}, ${star.accentSecondary})`,
                              }
                        }
                      >
                        {star.portraitImageUrl ? null : (
                          <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                            {star.portraitInitials}
                          </span>
                        )}
                        <span className="absolute left-2.5 top-2.5 inline-flex min-h-6 items-center rounded-full bg-black/75 px-2 text-[0.62rem] font-semibold tracking-[0.08em] text-white">
                          {productCopy.aiStarBadge}
                        </span>
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute inset-x-3 bottom-2 block truncate text-base font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">
                          {star.name}
                        </span>
                      </div>
                      <div className="p-3.5">
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-500">
                            {getFanletterV2LocalizedText(star.specialty, locale)}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-1.5 text-center sm:gap-2">
                          {[
                            [productCopy.score, star.starScore],
                            [productCopy.growth, `+${star.growthPercent}%`],
                            [productCopy.open, star.openSlots.open],
                          ].map(([label, value]) => (
                            <span
                              className="min-w-0 rounded-xl bg-zinc-50 px-1.5 py-2"
                              key={label}
                            >
                              <span className="block truncate text-sm font-semibold text-zinc-950">
                                {value}
                              </span>
                              <span className="mt-0.5 block break-words text-[0.54rem] font-semibold leading-tight tracking-normal text-slate-400">
                                {label}
                              </span>
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-[0.66rem] font-semibold text-zinc-700">
                          <span className="truncate">{productCopy.starCardFlow}</span>
                          <ArrowRight className="size-3.5 shrink-0" />
                        </div>
                      </div>
                    </FanletterTrackedLink>
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-white via-white/80 to-white/0 pr-1 lg:hidden"
                >
                  <span className="flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>

            </div>
          </ScrollReveal>

          {showPortfolio ? (
          <ScrollReveal className="min-w-0 max-w-full overflow-hidden" delay={180} y={16}>
            <div className="min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.045)]">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-[#12041f]">
                  {productCopy.portfolio}
                </p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-700">
                  {creatorUnlock?.unlocked
                    ? productCopy.unlocked
                    : productCopy.locked}
                </span>
              </div>
              <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                {portfolioStats.map((stat, statIndex) => (
                  <div
                    className={joinClasses(
                      "min-w-0 rounded-xl bg-slate-50 p-3",
                      statIndex > 1 ? "hidden sm:block" : "",
                    )}
                    key={stat.label}
                  >
                    <p className="truncate text-lg font-semibold text-[#12041f]">
                      {formatMetric(stat.value, locale)}
                      {stat.suffix}
                    </p>
                    <p className="mt-1 truncate text-[0.66rem] font-semibold text-slate-500">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                className="mt-4 hidden h-10 min-w-0 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold !text-slate-700 sm:inline-flex"
                href={creatorUnlockHref}
              >
                <span className="truncate">{productCopy.creator}</span>
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            </div>
          </ScrollReveal>
          ) : null}
        </div>
      </div>

      <div className="hidden gap-4">
        <ScrollReveal delay={120} y={16}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#12041f]">
                {productCopy.founderUniverse}
              </p>
              <Link
                className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-50 px-3 text-xs font-semibold !text-slate-600"
                href={primaryStarFounderNetworkHref}
              >
                {productCopy.founderNetworkCta}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="relative mx-auto aspect-square w-full max-w-[18rem] rounded-full bg-[radial-gradient(circle,#ffffff_0%,#ffffff_36%,#f8fafc_100%)]">
                {[1, 2, 3, 4].map((ring) => (
                  <span
                    className="absolute rounded-full border border-dashed border-slate-200"
                    key={ring}
                    style={{
                      inset: `${ring * 9}%`,
                    }}
                  />
                ))}
                {primaryStar ? (
                  <span
                    className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[1.35rem] bg-cover bg-center text-lg font-semibold text-white shadow-[0_18px_42px_rgba(124,58,237,0.2)]"
                    style={
                      primaryStar.portraitImageUrl
                        ? { backgroundImage: `url(${primaryStar.portraitImageUrl})` }
                        : {
                            background: `linear-gradient(145deg, ${primaryStar.accentColor}, ${primaryStar.accentSecondary})`,
                          }
                    }
                  >
                    {primaryStar.portraitImageUrl
                      ? null
                      : primaryStar.portraitInitials}
                  </span>
                ) : null}
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const angle = -90 + index * 60;
                  const radians = (angle * Math.PI) / 180;
                  const x = 50 + Math.cos(radians) * 39;
                  const y = 50 + Math.sin(radians) * 39;

                  return (
                    <span
                      className="absolute flex size-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[0.68rem] font-semibold text-slate-500"
                      key={index}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {index + 1}
                    </span>
                  );
                })}
              </div>

              <div>
                <p className="text-xl font-semibold text-[#12041f]">
                  {primaryStar?.name ?? "AI Star"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {primaryStar?.universeName ?? productCopy.founderUniverse}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    [productCopy.founder, primaryStar?.founderCount ?? 0],
                    [productCopy.open, primaryStar?.openSlots.open ?? 0],
                    [productCopy.score, primaryStar?.starScore ?? 0],
                  ].map(([label, value]) => (
                    <span className="rounded-xl bg-slate-50 p-3 text-center" key={label}>
                      <span className="block text-lg font-semibold text-[#12041f]">
                        {value}
                      </span>
                      <span className="text-[0.64rem] font-semibold text-slate-400">
                        {label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200} y={16}>
          <div className="rounded-[1.35rem] border border-emerald-100 bg-emerald-50/78 p-4 shadow-[0_18px_46px_rgba(16,185,129,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-900">
                {productCopy.scout}
              </p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[0.66rem] font-semibold text-emerald-800">
                {productCopy.reward}
              </span>
            </div>
            <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {productCopy.shareCode}
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-[#12041f]">
              {scoutShareLoop?.referralCode ?? "MINSEO-A-001"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Kakao", "Instagram", "X", "TikTok"].map((platform) => (
                <span
                  className="rounded-full bg-white px-2.5 py-1 text-[0.66rem] font-semibold text-emerald-800"
                  key={platform}
                >
                  {platform}
                </span>
              ))}
            </div>
            <Link
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold !text-white"
              href={scoutShareLoopHref}
            >
              {productCopy.scout}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal className="hidden sm:block" delay={220} y={16}>
          <FanletterAgentRankHomeCard
            href={agentRankHref}
            locale={locale}
            snapshot={agentRankSnapshot}
          />
        </ScrollReveal>

        <ScrollReveal className="hidden sm:block" delay={240} y={16}>
          <div className="grid grid-cols-3 gap-2">
            {[
              [copy.liveStats.videos, liveStats.publicVideoCount],
              [copy.liveStats.creators, liveStats.activeCreatorCount],
              [copy.liveStats.sales, liveStats.confirmedSalesCount],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-violet-100 bg-white/82 p-3 text-center shadow-[0_12px_30px_rgba(88,28,135,0.07)]"
                key={label}
              >
                <p className="text-lg font-semibold text-[#12041f]">
                  <AnimatedNumber
                    format="compact"
                    locale={locale}
                    value={Number(value)}
                  />
                </p>
                <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export function FanletterHomePage({
  agentRankSnapshot,
  agentRankTrackingStarId,
  coverageAction,
  featuredVideos,
  founderClubCreatorUnlock,
  founderClubMemberPortfolio,
  founderClubScoutShareLoop,
  founderClubStars,
  founderClubSelectedStarId,
  locale,
  liveStats,
  referralCode,
  shareContext,
}: {
  agentRankSnapshot?: FanletterAgentRankInvestorSnapshot | null;
  agentRankTrackingStarId?: string | null;
  coverageAction?: string | null;
  featuredVideos: FanletterFeaturedVideo[];
  founderClubCreatorUnlock?: CreatorUnlockData | null;
  founderClubMemberPortfolio?: MemberPortfolio | null;
  founderClubScoutShareLoop?: ScoutShareLoopData | null;
  founderClubSelectedStarId?: string | null;
  founderClubStars?: AIStar[] | null;
  locale: Locale;
  liveStats: FanletterLiveStats;
  referralCode: string | null;
  shareContext?: FanletterHomeShareContext | null;
}) {
  const copy = getFanletterCopy(locale);
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const topGrowingStarsHref = buildPathWithReferral(
    `/${locale}/fanletter/discovery`,
    referralCode,
  );
  const growthHref = buildPathWithReferral(
    `/${locale}/fanletter/growth`,
    referralCode,
  );
  const creatorUnlockHref = buildPathWithReferral(
    `/${locale}/fanletter/creator-unlock`,
    referralCode,
  );
  const aiStarGenealogyHref = buildPathWithReferral(
    `/${locale}/fanletter/ai-star-genealogy`,
    referralCode,
  );
  const agentRankHref = buildPathWithReferral(
    `/${locale}/fanletter/agentrank`,
    referralCode,
  );
  const scoutShareLoopHref = buildPathWithReferral(
    `/${locale}/fanletter/scout`,
    referralCode,
  );
  const myAiHref = buildPathWithReferral(
    `/${locale}/fanletter/my-ai`,
    referralCode,
  );
  const nonNsfwFeaturedVideos = featuredVideos.filter(
    (video) => video.contentMaturityRating !== "nsfw",
  );
  const heroVideo = nonNsfwFeaturedVideos[0] ?? null;
  const heroSlides = nonNsfwFeaturedVideos.slice(0, 5).map((video) => ({
    authorName: video.authorName,
    coverImageUrl: video.coverImageUrl,
    title: video.title,
    videoUrl: video.videoUrl,
  }));
  const heroBackgroundSlides = heroSlides;
  const hasHeroVideoSlides = heroBackgroundSlides.some((slide) =>
    slide.videoUrl.trim(),
  );
  const mobileHeroLoopStar =
    founderClubStars?.find(
      (star) =>
        star.id === founderClubSelectedStarId ||
        star.id === founderClubScoutShareLoop?.starId,
    ) ??
    founderClubStars?.[0] ??
    null;
  const homeTrackingStarId =
    agentRankTrackingStarId ??
    mobileHeroLoopStar?.id ??
    founderClubSelectedStarId ??
    null;
  const homeFooterLabels =
    locale === "ko"
      ? {
          discovery: "AI 스타 발견",
          body:
            "홈은 첫 행동을 고르는 곳입니다. 발견에서 시작하고, 성장 상태와 내 AI는 전용 화면에서 이어갑니다.",
          growth: "성장 상태",
          kicker: "다음 이동",
          mockPayment: "실결제 없음",
          myAi: "내 AI",
          reputation: "행동은 활동 기록으로 저장",
          title: "어디로 이어갈까요?",
        }
      : {
          discovery: "AI Star Discovery",
          body:
            "Home is the action signpost. Start with discovery, then continue to Growth or My AI in dedicated screens.",
          growth: "Growth",
          kicker: "Next paths",
          mockPayment: "No real payment",
          myAi: "My AI",
          reputation: "Actions become activity records",
          title: "Where to next?",
        };
  const mobileAnnouncementCta = locale === "ko" ? "2.0 보기" : "View 2.0";
  const shareContextLabels =
    locale === "ko"
      ? {
          body: "방금 본 AI 스타 채널로 돌아가거나, 같은 방식으로 나만의 AI 스타를 시작할 수 있습니다.",
          channel: "AI 스타 채널 보기",
          eyebrow: `${shareContext?.sponsorName ?? "SNS"} 공유에서 이어짐`,
          rewardDisclosure:
            "이 공유 흐름으로 가입을 완료하면 공유 페이지를 만든 회원에게 AIAVpark 보상이 적립될 수 있습니다.",
          start: "나도 AI 스타 만들기",
          title: (name: string) => `${name} 공유 페이지에서 오셨나요?`,
        }
      : {
          body: "Return to the AI Star channel you just saw, or start your own AI Star with the same AIAVpark flow.",
          channel: "View AI Star channel",
          eyebrow: `Continued from ${shareContext?.sponsorName ?? "SNS"} share`,
          rewardDisclosure:
            "Completing signup through this shared flow may award an AIAVpark reward to the member who created the share page.",
          start: "Create my AI Star",
          title: (name: string) => `Coming from ${name}'s share page?`,
        };
  const shareContextTrackingMetadata = shareContext
    ? {
        creatorReferralCode: shareContext.creatorReferralCode,
        source: "fanletter-home-share-context",
        sponsorSlug: shareContext.sponsorSlug,
      }
    : null;

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-hidden bg-white text-black">
      <FanletterReputationTracker
        agentRank={{
          eventType: "ai_star_discovered",
          intent: "fanletter_home_discovery_view",
          source: "fanletter_home",
          starId: homeTrackingStarId,
        }}
        metadata={{
          featuredVideoCount: nonNsfwFeaturedVideos.length,
          founderClubStarCount: founderClubStars?.length ?? 0,
          page: "fanletter_home",
          coverageAction: coverageAction ?? null,
          coverageActionStarId: agentRankTrackingStarId ?? null,
          referralAttached: Boolean(referralCode),
        }}
        referralCode={referralCode}
      />
      <section className="relative overflow-hidden border-b border-zinc-200 bg-white sm:min-h-[92svh]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#ffffff_58%,#f4f4f5_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(24,24,27,0.055)_0_1px,transparent_1px_32px)] opacity-60 sm:hidden" />
        {!hasHeroVideoSlides ? (
          <div
            className="absolute inset-0 hidden bg-cover bg-center opacity-[0.22] sm:block lg:opacity-[0.16]"
            style={{
              backgroundImage: heroVideo?.coverImageUrl
                ? `url(${heroVideo.coverImageUrl})`
                : "radial-gradient(circle at 22% 18%, rgba(24,24,27,0.12), transparent 34%), radial-gradient(circle at 78% 20%, rgba(113,113,122,0.14), transparent 30%), linear-gradient(135deg, #ffffff 0%, #fafafa 58%, #f4f4f5 100%)",
            }}
          />
        ) : null}
        <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.72)_40%,rgba(255,255,255,0.94)_76%,#ffffff_100%)] sm:block lg:bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.92)_38%,rgba(255,255,255,0.56)_68%,rgba(250,250,250,0.8)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 hidden h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,#ffffff_100%)] lg:block" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pb-[calc(5.8rem+env(safe-area-inset-bottom))] pt-3 sm:min-h-[92svh] sm:px-6 sm:pb-6 lg:px-8">
          <div className="hidden items-center justify-between gap-3 rounded-full border border-zinc-200 bg-white/86 px-3 py-1.5 text-[0.62rem] font-semibold uppercase text-black/64 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex sm:bg-white/76 sm:py-2 sm:text-xs sm:shadow-none">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-black" />
              <span className="truncate">{copy.announcement.label}</span>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-50 px-3 py-1 text-[0.68rem] font-semibold text-black sm:bg-transparent sm:px-0 sm:py-0 sm:text-xs">
              <span className="sm:hidden">{mobileAnnouncementCta}</span>
              <span className="hidden sm:inline">{copy.announcement.prize}</span>
            </span>
          </div>

          <header className="mt-3 flex items-center justify-between gap-2 sm:mt-4 sm:gap-4">
            <Link className="flex items-center gap-2" href={homeHref}>
              <FanletterBrandMark className="size-9" />
              <span className="text-xl font-semibold tracking-tight">AIAVpark</span>
            </Link>

            <nav
              aria-label={locale === "ko" ? "핵심 여정" : "Primary journey"}
              className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white/72 p-1 text-xs font-semibold text-black/62 md:flex lg:gap-2 lg:text-sm"
            >
              <Link
                className="inline-flex min-h-8 items-center rounded-full px-3 transition hover:bg-zinc-100 hover:text-black"
                href={topGrowingStarsHref}
              >
                {copy.nav.features}
              </Link>
              <Link
                className="inline-flex min-h-8 items-center rounded-full px-3 transition hover:bg-zinc-100 hover:text-black"
                href={growthHref}
              >
                {locale === "ko" ? "성장" : "Growth"}
              </Link>
              <Link
                className="inline-flex min-h-8 items-center rounded-full px-3 transition hover:bg-zinc-100 hover:text-black"
                href={myAiHref}
              >
                {locale === "ko" ? "내 AI" : "My AI"}
              </Link>
            </nav>

            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <FanletterGlobalLanguageSwitcher
                className="inline-flex sm:hidden"
                compact
                locale={locale}
                surface="light"
                tight
              />
              <FanletterGlobalLanguageSwitcher
                className="hidden sm:inline-flex"
                locale={locale}
                surface="light"
              />
              <FanletterAccountStatusLink
                className="max-w-[6.8rem] sm:max-w-[14rem]"
                locale={locale}
                referralCode={referralCode}
                surface="light"
              />
            </div>
          </header>

          {shareContext && shareContextTrackingMetadata ? (
            <ScrollReveal className="mt-4 max-w-3xl" delay={60} y={12}>
              <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white/86 p-3 shadow-[0_16px_44px_rgba(16,185,129,0.1)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex min-w-0 items-start gap-3">
                  {shareContext.avatarImageUrl ? (
                    <Image
                      alt={shareContext.channelName}
                      className="size-12 shrink-0 rounded-lg object-cover sm:size-14"
                      height={56}
                      src={shareContext.avatarImageUrl}
                      width={56}
                    />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-base font-semibold text-black sm:size-14">
                      {getAuthorInitial(shareContext.channelName)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      {shareContextLabels.eyebrow}
                    </p>
                    <p className="mt-1 break-words text-base font-semibold leading-5 text-[#12041f] [word-break:keep-all] sm:text-lg">
                      {shareContextLabels.title(shareContext.channelName)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-black/58 sm:text-sm">
                      {shareContextLabels.body}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:w-56 sm:shrink-0">
                  <FanletterTrackedLink
                    className="inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-xs font-semibold !text-white transition hover:bg-zinc-800 sm:text-sm"
                    eventName="promo_share_to_creator_channel"
                    href={shareContext.channelHref}
                    metadata={{
                      ...shareContextTrackingMetadata,
                      placement: "home_context_banner_primary",
                    }}
                    referralCode={referralCode}
                    shareId={shareContext.shareId}
                  >
                    {shareContextLabels.channel}
                  </FanletterTrackedLink>
                  <FanletterTrackedLink
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold !text-zinc-900 transition hover:bg-zinc-50 sm:text-sm"
                    eventName="promo_share_to_onboarding"
                    href={shareContext.onboardingHref}
                    metadata={{
                      ...shareContextTrackingMetadata,
                      placement: "home_context_banner_secondary",
                    }}
                    referralCode={referralCode}
                    shareId={shareContext.shareId}
                  >
                    {shareContextLabels.start}
                  </FanletterTrackedLink>
                  <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[0.62rem] font-medium leading-4 text-emerald-800/70">
                    {shareContextLabels.rewardDisclosure}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ) : null}

          <FanletterProductHomeDashboard
            agentRankHref={agentRankHref}
            agentRankSnapshot={agentRankSnapshot}
            aiStarGenealogyHref={aiStarGenealogyHref}
            copy={copy}
            creatorUnlock={founderClubCreatorUnlock}
            creatorUnlockHref={creatorUnlockHref}
            liveStats={liveStats}
            locale={locale}
            memberPortfolio={founderClubMemberPortfolio}
            referralCode={referralCode}
            scoutShareLoop={founderClubScoutShareLoop}
            scoutShareLoopHref={scoutShareLoopHref}
            selectedStarId={founderClubSelectedStarId}
            stars={founderClubStars}
            topGrowingStarsHref={topGrowingStarsHref}
          />
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 text-black sm:px-6 sm:pb-10 sm:pt-10 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {homeFooterLabels.kicker}
            </p>
            <p className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-zinc-950 [word-break:keep-all] sm:text-3xl">
              {homeFooterLabels.title}
            </p>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
              {homeFooterLabels.body}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3">
                <ShieldCheck className="size-3.5" />
                {homeFooterLabels.reputation}
              </span>
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3">
                <BadgeDollarSign className="size-3.5" />
                {homeFooterLabels.mockPayment}
              </span>
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:justify-end">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-zinc-800"
              href={topGrowingStarsHref}
            >
              {homeFooterLabels.discovery}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold !text-zinc-900 transition hover:bg-zinc-50"
              href={growthHref}
            >
              {homeFooterLabels.growth}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold !text-zinc-900 transition hover:bg-zinc-50"
              href={myAiHref}
            >
              {homeFooterLabels.myAi}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
